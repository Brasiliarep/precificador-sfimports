import json
import os
import re
import openpyxl
from datetime import datetime

# Paths
EXCEL_PATH = r'C:\app precificador\precificador-sfimports\SF_IMPORTS_Pontuacoes_v4_FINAL.xlsx'
JSON_PATH = r'C:\app precificador\precificador-sfimports\data\tabela_completa.json'
BACKUP_PATH = JSON_PATH + ".pre_v4.bak"

def normalize_str(s):
    if not s: return ""
    # Remove accents, lowercase, remove parenthetical info
    s = str(s).lower()
    s = re.sub(r'[\u0300-\u036f]', '', s) # note: basic regex, better norm would be unicodedata
    s = re.sub(r'\([^)]*\)', '', s)
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    return " ".join(s.split())

def parse_price(val):
    if val is None or val == "" or val == "—": return 0
    if isinstance(val, (int, float)): return float(val)
    # Remove R$, dots and replace comma with dot
    s = str(val).replace('R$', '').replace('.', '').replace(',', '.').strip()
    try:
        return float(s)
    except:
        return 0

def parse_score(val):
    if val is None or val == "" or val == "—": return ""
    return str(val).strip()

def run_migration():
    print("🚀 Starting Master Sheet v4 Migration...")
    
    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Excel file not found: {EXCEL_PATH}")
        return

    # 1. Load JSON
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        tabela = json.load(f)
    
    print(f"📊 Loaded {len(tabela)} products from JSON.")
    
    # 2. Backup JSON
    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(tabela, f, indent=2, ensure_ascii=False)
    print(f"💾 Backup saved to: {BACKUP_PATH}")

    # 3. Load Excel
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active
    
    excel_data = []
    # Data starts at row 4 or 5 based on debug
    # Let's check row 4 content to see if it's data
    for row in sheet.iter_rows(min_row=4, values_only=True):
        if not row[1]: continue # skip empty product names
        
        item = {
            "name": row[1],
            "milaoDe": parse_price(row[2]),
            "milaoPor": parse_price(row[3]),
            "sfDe": parse_price(row[4]),
            "sfFinal": parse_price(row[5]),
            "parker": parse_score(row[6]),
            "suckling": parse_score(row[7]),
            "wspectator": parse_score(row[8]),
            "decanter": parse_score(row[9]),
            "timAtkin": parse_score(row[10]),
            "vivino": parse_score(row[11])
        }
        excel_data.append(item)
    
    print(f"📈 Loaded {len(excel_data)} items from Excel.")

    # 4. Perform Matching and Update
    matched = 0
    for excel_item in excel_data:
        norm_excel = normalize_str(excel_item["name"])
        
        # Simple exact match on normalized names first
        found = False
        for row in tabela:
            norm_json = normalize_str(row.get("supplierName", ""))
            
            if norm_excel == norm_json:
                # Update data
                row["milaoDe"] = excel_item["milaoDe"]
                row["milaoPor"] = excel_item["milaoPor"]
                row["sfDe"] = excel_item["sfDe"]
                row["sfFinal"] = excel_item["sfFinal"]
                row["finalCost"] = excel_item["milaoPor"]
                row["supplierCostRaw"] = excel_item["milaoPor"]
                
                # Update scores
                row["parkerScore"] = excel_item["parker"]
                row["sucklingScore"] = excel_item["suckling"]
                row["wspectatorScore"] = excel_item["wspectator"]
                row["decanterScore"] = excel_item["decanter"]
                row["timAtkinScore"] = excel_item["timAtkin"]
                row["vivinoRating"] = excel_item["vivino"]
                
                # Flag as revised
                row["isRevised"] = True
                row["isMistral"] = False # Ensure it's not marked as mistral if it's in master sheet
                
                matched += 1
                found = True
                break
        
        if not found:
            # If not found, it might be a new product from the Excel sheet
            # But the user didn't explicitly ask to add new ones, just to analyze/sync.
            # I will only update existing ones for safety.
            pass

    # 5. Save Updated JSON
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(tabela, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Migration Finished!")
    print(f"✨ Matched and Updated: {matched} products.")
    print(f"📝 Master Sheet authoritative prices and scores applied.")

if __name__ == "__main__":
    run_migration()
