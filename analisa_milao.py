import pandas as pd

print('🔍 Analisando MILAO_412_COLUNAS_EXATAS.xlsx...')
print('=' * 50)

# Carregar e analisar
df = pd.read_excel('MILAO_412_COLUNAS_EXATAS.xlsx')

print(f'📊 Total de produtos: {len(df)}')
print(f'📋 Colunas: {list(df.columns)}')
print(f'\n📋 Amostra dos dados:')
print(df.head(5).to_string())

print(f'\n💰 Estatísticas dos preços:')
if 'price' in df.columns:
    print(f'   Preço médio: R$ {df["price"].mean():.2f}')
    print(f'   Preço mínimo: R$ {df["price"].min():.2f}')
    print(f'   Preço máximo: R$ {df["price"].max():.2f}')

print(f'\n🎯 PRÓXIMO PASSO: Integrar ao sistema SF Imports')
