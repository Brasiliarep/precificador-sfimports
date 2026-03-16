import pandas as pd

# Ler o arquivo final integrado
df = pd.read_excel('SF_MILAO_SISTEMA_FINAL.xlsx', engine='openpyxl')

print('📋 TABELA FINAL INTEGRADA SF + MILÃO')
print('=' * 50)
print(f'📊 Total de produtos: {len(df)}')
print(f'📋 Colunas: {list(df.columns)}')

print('\n🐴 CABALLO LOCO na tabela final:')
caballos = df[df['name'].str.contains('CABALLO', case=False, na=False)]
for i, row in caballos.iterrows():
    print(f'   {i+1}. {row["name"]} - R$ {row["preco_de"]}/{row["preco_por"]} - Fonte: {row["fornecedor"]}')

print(f'\n📊 ESTATÍSTICAS:')
print(f'   🐴 Total CABALLO LOCO: {len(caballos)}')
print(f'   💰 Preço médio: R$ {df["preco_por"].mean():.2f}')
print(f'   💰 Preço mínimo: R$ {df["preco_por"].min():.2f}')
print(f'   💰 Preço máximo: R$ {df["preco_por"].max():.2f}')

# Verificar fornecedores
print(f'\n🏢 FORNECEDORES:')
fornecedores = df['fornecedor'].value_counts()
for fornecedor, count in fornecedores.items():
    print(f'   {fornecedor}: {count} produtos')

print(f'\n✅ ARQUIVO FINAL: SF_MILAO_SISTEMA_FINAL.xlsx')
print(f'   📊 {len(df)} produtos únicos')
print(f'   🐴 {len(caballos)} produtos CABALLO LOCO')
print(f'   🎯 Pronto para usar no sistema SF Imports!')
