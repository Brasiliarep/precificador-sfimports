from openpyxl import load_workbook

EXCEL_PATH = r'C:\app precificador\precificador-sfimports\SF_IMPORTS_Pontuacoes_v4_FINAL.xlsx'
wb = load_workbook(EXCEL_PATH, data_only=True)
sheet = wb['🍷 Todos os Produtos']

row5 = [c.value for c in sheet[5]]
for i, val in enumerate(row5):
    header = sheet[4][i].value
    print(f"Col {i} ({header}): {val}")
