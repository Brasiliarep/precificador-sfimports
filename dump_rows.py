from openpyxl import load_workbook

EXCEL_PATH = r'C:\app precificador\precificador-sfimports\SF_IMPORTS_Pontuacoes_v4_FINAL.xlsx'
wb = load_workbook(EXCEL_PATH, data_only=True)
sheet = wb['🍷 Todos os Produtos']

for i in range(1, 21):
    row = [c.value for c in sheet[i]]
    print(f"Row {i}: {row}")
