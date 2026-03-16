from openpyxl import load_workbook

EXCEL_PATH = r'C:\app precificador\precificador-sfimports\SF_IMPORTS_Pontuacoes_v4_FINAL.xlsx'
wb = load_workbook(EXCEL_PATH, data_only=True)
sheet = wb['🍷 Todos os Produtos']

rows_to_check = [5, 10, 20, 30, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
for r in rows_to_check:
    row = [c.value for c in sheet[r]]
    print(f"Row {r}: {row[:6]}") # only first 6 cols
