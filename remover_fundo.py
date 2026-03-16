import sys
import io
import numpy as np
from scipy.ndimage import label, find_objects, binary_fill_holes, binary_dilation
from rembg import remove, new_session
from PIL import Image

SESSION = None


def get_session():
    global SESSION
    if SESSION is None:
        SESSION = new_session(model_name="isnet-general-use")
    return SESSION


def process_image(input_path, output_path):
    try:
        with open(input_path, "rb") as f:
            input_data = f.read()

        original_img = Image.open(io.BytesIO(input_data)).convert("RGBA")
        orig_data = np.array(original_img)
        h, w = orig_data.shape[:2]

        orig_r = orig_data[:, :, 0].astype(np.int32)
        orig_g = orig_data[:, :, 1].astype(np.int32)
        orig_b = orig_data[:, :, 2].astype(np.int32)

        session = get_session()
        output_data = remove(
            input_data,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=0,
        )

        img = Image.open(io.BytesIO(output_data)).convert("RGBA")
        data = np.array(img).copy()
        alpha = data[:, :, 3].astype(np.uint8)

        binary_mask = alpha > 10
        labeled_mask, num_features = label(binary_mask)

        if num_features == 0:
            Image.fromarray(data).save(output_path, "PNG")
            print("SUCCESS")
            return

        feature_sizes = np.bincount(labeled_mask.ravel())
        feature_sizes[0] = 0
        
        # Heurística para evitar banners/tiras verticais grandes que não são a garrafa principal
        # Se a maior componente for muito alta e estreita (banner), procuramos uma alternativa
        sorted_labels = np.argsort(feature_sizes)[::-1]
        main_label = int(sorted_labels[0])
        
        objs = find_objects(labeled_mask)
        
        # Verifica se o componente principal parece um banner da UI (muito alto e relativamente estreito)
        main_obj = objs[main_label - 1]
        if main_obj:
            msy, msx = main_obj
            mh = msy.stop - msy.start
            mw = msx.stop - msx.start
            if mh > h * 0.8 and mw < w * 0.4 and num_features > 1:
                # É provável que seja uma tira lateral da UI. Tentamos o segundo maior.
                second_label = int(sorted_labels[1])
                second_obj = objs[second_label - 1]
                if second_obj:
                    sy2, sx2 = second_obj
                    h2 = sy2.stop - sy2.start
                    w2 = sx2.stop - sx2.start
                    # Se o segundo for mais "garrafa" (menos de 90% da altura), trocamos
                    if h2 < mh * 0.9:
                        main_label = second_label
                        main_obj = second_obj

        if main_obj is None:
            Image.fromarray(data).save(output_path, "PNG")
            print("SUCCESS")
            return

        msy, msx = main_obj
        main_h = msy.stop - msy.start
        main_w = msx.stop - msx.start
        main_center_x = (msx.start + msx.stop) // 2

        green_mask = (orig_g > orig_r + 10) & (orig_g > orig_b + 8) & (orig_g > 35)
        dark_glass_mask = (orig_r < 85) & (orig_g < 85) & (orig_b < 85)

        main_mask = labeled_mask == main_label

        # "Safe Zone" mais restrita: expansão menor para evitar capturar lixo lateral
        dilate_iters = max(8, int(min(h, w) * 0.012)) 
        allowed_restore_region = binary_dilation(main_mask, iterations=dilate_iters)

        # Cortes verticais: Aumentamos a margem inferior (de 0.07 para 0.15) para evitar cortar a base das garrafas
        top_cut = max(0, msy.start - int(h * 0.05))
        bottom_cut = min(h, msy.stop + int(h * 0.15))
        vertical_band = np.zeros_like(alpha, dtype=bool)
        vertical_band[top_cut:bottom_cut, :] = True

        allowed_restore_region = allowed_restore_region & vertical_band

        green_restore = green_mask & (alpha < 220)
        dark_restore = dark_glass_mask & (alpha < 140)

        restore_mask = (green_restore | dark_restore) & allowed_restore_region
        data[restore_mask, 3] = np.maximum(data[restore_mask, 3], 235)

        alpha_final = data[:, :, 3].astype(np.uint8)
        binary_final = alpha_final > 15
        binary_final = binary_fill_holes(binary_final)

        labeled_final, num_features_final = label(binary_final)

        if num_features_final == 0:
            data[:, :, 3] = 0
            Image.fromarray(data).save(output_path, "PNG")
            print("SUCCESS")
            return

        feature_sizes_final = np.bincount(labeled_final.ravel())
        feature_sizes_final[0] = 0
        objs_final = find_objects(labeled_final)

        main_label_final = int(np.argmax(feature_sizes_final))
        main_obj_final = objs_final[main_label_final - 1]

        if main_obj_final is None:
            Image.fromarray(data).save(output_path, "PNG")
            print("SUCCESS")
            return

        msy, msx = main_obj_final
        main_h = msy.stop - msy.start
        main_w = msx.stop - msx.start
        main_center_x = (msx.start + msx.stop) // 2

        keep_labels = {main_label_final}

        for i, obj in enumerate(objs_final):
            if obj is None:
                continue

            label_idx = i + 1
            if label_idx == main_label_final:
                continue

            sy, sx = obj
            comp_h = sy.stop - sy.start
            comp_w = sx.stop - sx.start
            size = int(feature_sizes_final[label_idx])
            comp_mask = labeled_final == label_idx

            comp_center_x = (sx.start + sx.stop) // 2
            center_dist = abs(comp_center_x - main_center_x)

            overlap_x = min(sx.stop, msx.stop) - max(sx.start, msx.start)
            overlap_ratio_x = overlap_x / max(1, min(comp_w, main_w)) if overlap_x > 0 else 0.0

            green_ratio = np.sum(green_mask & comp_mask) / max(size, 1)
            dark_ratio = np.sum(dark_glass_mask & comp_mask) / max(size, 1)

            close_to_main = center_dist < int(main_w * 0.45)
            is_above_or_touching_top = sy.start < (msy.start + int(main_h * 0.15))
            horizontally_aligned = center_dist < int(main_w * 0.18)
            is_slender_vertical = comp_h > (comp_w * 1.4)

            # Heurísticas de filtragem levemente mais agressivas para lixo lateral
            is_far_lateral = center_dist > int(max(main_w * 0.28, w * 0.07))
            is_small_noise = (
                comp_w < int(w * 0.10) and
                comp_h < int(h * 0.15) and
                overlap_ratio_x < 0.10
            )
            is_text_like = (
                comp_w < int(w * 0.12) and
                comp_h < int(h * 0.30) and
                overlap_ratio_x < 0.08 and
                green_ratio < 0.15 and
                dark_ratio < 0.20
            )

            if is_far_lateral or is_small_noise or is_text_like:
                continue

            if close_to_main and overlap_ratio_x > 0.20:
                keep_labels.add(label_idx)
            elif is_above_or_touching_top and horizontally_aligned and is_slender_vertical:
                keep_labels.add(label_idx)
            elif green_ratio > 0.28 and center_dist < int(main_w * 0.22):
                keep_labels.add(label_idx)
            elif dark_ratio > 0.60 and center_dist < int(main_w * 0.18) and overlap_ratio_x > 0.18:
                keep_labels.add(label_idx)

        final_mask = np.isin(labeled_final, list(keep_labels))
        final_mask = binary_fill_holes(final_mask)

        data[:, :, 3] = np.where(final_mask, data[:, :, 3], 0).astype(np.uint8)

        Image.fromarray(data).save(output_path, "PNG")
        print("SUCCESS")

    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("ERROR: Invalid arguments")
        sys.exit(1)
    process_image(sys.argv[1], sys.argv[2])
