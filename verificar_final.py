import pandas as pd

# Ler arquivo final
df = pd.read_excel('MILAO_SISTEMA_FINAL.xlsx', engine='openpyxl')

print('📋 AMOSTRA DO ARQUIVO FINAL:')
print(f'📊 Total de produtos: {len(df)}')
print(f'📋 Colunas: {list(df.columns)}')

print('\n🐴 CABALLO LOCO no arquivo final:')
caballos = df[df['name'].str.contains('CABALLO', case=False, na=False)]
for i, row in caballos.head(6).iterrows():
    print(f'   {i+1}. {row["name"]} - R$ {row["preco_de"]}/{row["preco_por"]}')

print(f'\n📊 Estatísticas:')
print(f'   Preço médio: R$ {df["preco_por"].mean():.2f}')
print(f'   Preço mínimo: R$ {df["preco_por"].min():.2f}')
print(f'   Preço máximo: R$ {df["preco_por"].max():.2f}')

print(f'\n🐴 Total CABALLO LOCO: {len(caballos)} produtos')
