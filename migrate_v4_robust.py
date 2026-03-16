import json
import os
import re
import openpyxl

# Paths
EXCEL_PATH = r'C:\app precificador\precificador-sfimports\SF_IMPORTS_Pontuacoes_v4_FINAL.xlsx'
JSON_BACKUP = r'C:\app precificador\precificador-sfimports\data\tabela_completa.json.pre_v4.bak'
JSON_DEST = r'C:\app precificador\precificador-sfimports\data\tabela_completa.json'

def normalize(s):
    if not s: return ""
    s = str(s).lower()
    s = re.sub(r'[\u0300-\u036f]', '', s) # note: basic regex
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

def parse_price(val):
    if val is None or val == "" or val == "—": return 0
    if isinstance(val, (int, float)): return float(val)
    s = str(val).replace('R$', '').replace('.', '').replace(',', '.').strip()
    try:
        return float(s)
    except:
        return 0

def run_migration():
    print("🚀 Starting ROBUST Master Sheet v4 Migration...")
    
    # 1. Load Baseline JSON (The good backup)
    with open(JSON_BACKUP, 'r', encoding='utf-8') as f:
        tabela = json.load(f)
    print(f"📊 Loaded {len(tabela)} products from baseline.")

    # 2. Load Excel
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb['🍷 Todos os Produtos']
    
    excel_data = []
    # Start at row 4 as per debug
    for i, row in enumerate(sheet.iter_rows(min_row=4, values_only=True)):
        if not row[1]: continue
        
        excel_data.append({
            "name": row[1],
            "milaoDe": parse_price(row[2]),
            "milaoPor": parse_price(row[3]),
            "sfDe": parse_price(row[4]),
            "sfFinal": parse_price(row[5]),
            "parker": str(row[6] or "").strip(),
            "suckling": str(row[7] or "").strip(),
            "wspectator": str(row[8] or "").strip(),
            "decanter": str(row[9] or "").strip(),
            "timAtkin": str(row[10] or "").strip(),
            "vivino": str(row[11] or "").strip()
        })
    print(f"📈 Loaded {len(excel_data)} items from Excel.")

    # 3. Match and Selective Update
    matched = 0
    price_updated = 0
    scores_updated = 0
    
    # map json by normalized name for speed
    json_map = {}
    for row in tabela:
        norm_name = normalize(row.get("supplierName", ""))
        if norm_name not in json_map:
            json_map[norm_name] = []
        json_map[norm_name].append(row)

    for item in excel_data:
        norm_excel = normalize(item["name"])
        
        if norm_excel in json_map:
            for row in json_map[norm_excel]:
                # UPDATE PRICES ONLY IF > 0 in Excel
                if item["milaoPor"] > 0:
                    row["milaoPor"] = item["milaoPor"]
                    row["milaoDe"] = item["milaoDe"]
                    row["finalCost"] = item["milaoPor"]
                    row["supplierCostRaw"] = item["milaoPor"]
                    price_updated += 1
                
                if item["sfFinal"] > 0:
                    row["sfFinal"] = item["sfFinal"]
                    row["sfDe"] = item["sfDe"]
                    # If this is a match, update some status info if needed
                
                # ALWAYS update scores if they are in excel
                score_fields = ["parker", "suckling", "wspectator", "decanter", "timAtkin", "vivino"]
                mapping = {
                    "parker": "parkerScore",
                    "suckling": "sucklingScore",
                    "wspectator": "wspectatorScore",
                    "decanter": "decanterScore",
                    "timAtkin": "timAtkinScore",
                    "vivino": "vivinoRating"
                }
                has_score = False
                for fld in score_fields:
                    if item[fld]:
                        row[mapping[fld]] = item[fld]
                        has_score = True
                
                if has_score:
                    scores_updated += 1
                
                row["isRevised"] = True
                matched += 1
    
    # 4. Save
    with open(JSON_DEST, 'w', encoding='utf-8') as f:
        json.dump(tabela, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Robust Migration Finished!")
    print(f"✨ Total Matched/Revised: {matched}")
    print(f"💰 Prices Updated from Excel: {price_updated}")
    print(f"🏆 Scores Synchronized: {scores_updated}")

if __name__ == "__main__":
    run_migration()
