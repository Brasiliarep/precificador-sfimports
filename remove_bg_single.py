import sys
import os
import rembg
import base64
import urllib.request
from io import BytesIO
from PIL import Image

def remove_background(input_path_or_url):
    try:
        # Check if URL or local file
        if input_path_or_url.startswith('http://') or input_path_or_url.startswith('https://'):
            req = urllib.request.Request(input_path_or_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                image_data = response.read()
            img = Image.open(BytesIO(image_data))
        else:
            if not os.path.exists(input_path_or_url):
                print(f"ERROR: File not found: {input_path_or_url}", file=sys.stderr)
                sys.exit(1)
            img = Image.open(input_path_or_url)
            
        # Convert to RGB if needed (rembg works best with standard formats before stripping)
        if img.mode != 'RGB' and img.mode != 'RGBA':
            img = img.convert('RGB')
            
        # Remove background with specialized model
        from rembg import new_session
        session = new_session(model_name="isnet-general-use")
        img_no_bg = rembg.remove(img, 
                                 session=session,
                                 alpha_matting=True, 
                                 alpha_matting_foreground_threshold=240, 
                                 alpha_matting_background_threshold=10, 
                                 alpha_matting_erode_size=10)
        
        # Save to memory buffer as PNG
        buffer = BytesIO()
        img_no_bg.save(buffer, format="PNG")
        
        # Encode as base64 and print to stdout (Node.js will read this)
        img_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        print(img_b64)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: Missing input image path or URL.", file=sys.stderr)
        sys.exit(1)
        
    input_str = sys.argv[1]
    remove_background(input_str)
