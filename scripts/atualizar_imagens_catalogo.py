import os
import json
import re
import unicodedata

def normalize_name(name):
    # Remove accents
    name = unicodedata.normalize('NFD', name)
    name = "".join([c for c in name if unicodedata.category(c) != 'Mn'])
    # Lowercase
    name = name.lower()
    # Replace non-alphanumeric with hyphens
    name = re.sub(r'[^a-z0-9]+', '-', name)
    # Remove leading/trailing hyphens
    name = name.strip('-')
    return name

def update_catalogo():
    base_dir = r"c:\app precificador\precificador-sfimports"
    img_dir = os.path.join(base_dir, "imagens sem fundo")
    catalogo_path = os.path.join(base_dir, "catalogo.html")
    
    if not os.path.exists(img_dir):
        print(f"Erro: Diretório {img_dir} não encontrado.")
        return

    # List available images
    available_images = {}
    for f in os.listdir(img_dir):
        if f.lower().endswith('.png'):
            # Store both normalized and original for matching
            norm = normalize_name(f.replace('.png', '').replace('.PNG', ''))
            available_images[norm] = f

    print(f"Total de imagens sem fundo encontradas: {len(available_images)}")

    # Read catalogo.html
    with open(catalogo_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the products array
    # Pattern: let products = [...];
    match = re.search(r'let\s+products\s*=\s*(\[.*?\]);', content, re.DOTALL)
    if not match:
        print("Erro: Array 'products' não encontrado no HTML.")
        return

    products_json = match.group(1)
    try:
        products = json.loads(products_json)
    except json.JSONDecodeError as e:
        print(f"Erro ao decodificar JSON: {e}")
        # Try a more lenient parse if needed, but products is usually valid JSON
        # If it has trailing commas or single quotes, we might need a better parser
        return

    print(f"Total de produtos no catálogo: {len(products)}")

    count_updated = 0
    for p in products:
        name = p.get('name', '')
        if not name:
            continue
            
        norm_name = normalize_name(name)
        
        # Try exact match on normalized name
        if norm_name in available_images:
            p['image'] = f"/imagens sem fundo/{available_images[norm_name]}"
            count_updated += 1
        else:
            # Try some variations (e.g. handle "ml" vs "750ml")
            # For now, let's just do the basic match
            pass

    print(f"Produtos atualizados com novas imagens: {count_updated}")

    # Convert back to JSON
    # Note: ensure we don't break the JS formatting
    new_products_json = json.dumps(products, indent=0, ensure_ascii=False)
    # Remove the newlines added by indent=0 for a more compact (but still readable) result if desired
    # Or just use indent=None for one long line
    new_products_json = json.dumps(products, ensure_ascii=False)

    # Replace in content
    new_content = content[:match.start(1)] + new_products_json + content[match.end(1):]

    # Write back
    with open(catalogo_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("Catalogo.html atualizado com sucesso!")

if __name__ == "__main__":
    update_catalogo()
