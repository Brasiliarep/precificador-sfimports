import pandas as pd

# Ler o arquivo original
df_original = pd.read_csv('tabela_milao.xlsx', sep='\t', encoding='utf-8')
print('📋 ARQUIVO ORIGINAL tabela_milao.xlsx')
print(f'📊 Total de produtos: {len(df_original)}')
print(f'📋 Colunas: {list(df_original.columns)}')

# Verificar CABALLO LOCO
caballos = df_original[df_original['Nome'].str.contains('CABALLO', case=False, na=False)]
print(f'🐴 CABALLO LOCO no original: {len(caballos)}')

# Verificar produtos vazios ou inválidos
vazios = df_original[df_original['Nome'].isna() | (df_original['Nome'].str.strip() == '')]
print(f'⚠️ Produtos vazios: {len(vazios)}')

# Verificar preços zero
precos_zero = df_original[df_original['Preço Promocional (R$)'] == '0']
print(f'⚠️ Preços zero: {len(precos_zero)}')

# Verificar preços inválidos (não numéricos)
precos_invalidos = df_original[pd.to_numeric(df_original['Preço Promocional (R$)'].str.replace(',', '.'), errors='coerce').isna()]
print(f'⚠️ Preços inválidos: {len(precos_invalidos)}')

print('\n📋 Amostra dos primeiros 10 produtos:')
for i, row in df_original.head(10).iterrows():
    print(f'   {i+1}. {row["Nome"]} - R$ {row["Preço Normal (R$)"]}/{row["Preço Promocional (R$)"]}')

print('\n🔍 ANÁLISE DA DIFERENÇA:')
print(f'   Original: {len(df_original)} produtos')
print(f'   Final: 259 produtos')
print(f'   Diferença: {len(df_original) - 259} produtos')

# Mostrar produtos que foram removidos
df_limpo = df_original.dropna(subset=['Nome'])
df_limpo = df_limpo[df_limpo['Nome'].str.strip() != '']
df_limpo = df_limpo[pd.to_numeric(df_limpo['Preço Promocional (R$)'].str.replace(',', '.'), errors='coerce') > 0]

print(f'   Após limpeza: {len(df_limpo)} produtos')
print(f'   Removidos na limpeza: {len(df_original) - len(df_limpo)}')
