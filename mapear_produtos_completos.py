import pandas as pd
import re

# Ler planilha
df = pd.read_excel('SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')

print('🔍 MAPEAMENTO COMPLETO DE PRODUTOS')
print('=' * 50)
print()

# Estatísticas gerais
print(f'📋 Total de produtos na planilha: {len(df)}')
print(f'📋 Produtos com ID: {df["ID"].notna().sum()}')
print(f'📋 Produtos sem ID: {df["ID"].isna().sum()}')
print()

# Analisar produtos por status
if 'Status' in df.columns:
    status_counts = df['Status'].value_counts()
    print('📊 Produtos por status:')
    for status, count in status_counts.items():
        print(f'   {status}: {count} produtos')
    print()

# Mostrar primeiros produtos com exemplo
print('🔍 EXEMPLOS DE PRODUTOS:')
print('ID | Nome do Produto | Status')
print('-' * 50)

# Mostrar 10 primeiros produtos
for idx, row in df.head(10).iterrows():
    produto = str(row['Produto'])[:40]
    status = row.get('Status', 'N/A')
    id_val = row['ID'] if pd.notna(row['ID']) else '---'
    print(f'{id_val:5} | {produto:40} | {status}')

print()
print('🎯 PRÓXIMOS PASSOS NECESSÁRIOS:')
print('1. Exportar produtos do WooCommerce para comparar')
print('2. Identificar correspondências por nome')
print('3. Atualizar IDs na planilha')
print('4. Importar CSV com IDs corretos')
print('5. Limpar duplicatas no WooCommerce')

# Salvar lista de produtos para análise
df[['ID', 'Produto', 'Status']].to_csv('lista_produtos_planilha.csv', index=False)
print()
print('📁 Lista de produtos salva: lista_produtos_planilha.csv')
