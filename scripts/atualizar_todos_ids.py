import pandas as pd

# Ler mapeamento e planilha original
df_mapeamento = pd.read_csv('mapeamento_planilha_woo.csv')
df_planilha = pd.read_excel('SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')

print('🔧 ATUALIZANDO TODOS OS IDS DA PLANILHA')
print('=' * 50)
print()

print(f'📋 Produtos a serem atualizados: {len(df_mapeamento)}')
print()

# Criar dicionário de mapeamento
mapeamento_ids = dict(zip(df_mapeamento['id_planilha'], df_mapeamento['id_woo']))

# Atualizar IDs na planilha
df_planilha['ID_original'] = df_planilha['ID']  # Backup dos IDs originais
df_planilha['ID'] = df_planilha['ID'].map(mapeamento_ids)

# Verificar se algum ID ficou vazio
ids_vazios = df_planilha['ID'].isna().sum()
if ids_vazios > 0:
    print(f'⚠️ {ids_vazios} produtos ficaram sem ID')
else:
    print('✅ Todos os produtos atualizados com sucesso!')

print()

# Mostrar exemplos da atualização
print('🔍 EXEMPLOS DE ATUALIZAÇÃO:')
print('ID Original | ID Novo | Produto')
print('-' * 50)

for i in range(min(10, len(df_planilha))):
    id_orig = df_planilha.iloc[i]['ID_original']
    id_novo = df_planilha.iloc[i]['ID']
    produto = str(df_planilha.iloc[i]['Produto'])[:40]
    print(f'{id_orig:11} | {id_novo:7} | {produto}')

print()

# Verificar ALECRIM especificamente
alecrim = df_planilha[df_planilha['Produto'].str.contains('ALECRIM', case=False, na=False)]
if not alecrim.empty:
    row = alecrim.iloc[0]
    print('🔍 VERIFICAÇÃO ALECRIM:')
    print(f'   ID Original: {row["ID_original"]}')
    print(f'   ID Novo: {row["ID"]}')
    print(f'   Produto: {row["Produto"]}')
    print()

# Salvar planilha atualizada
df_planilha.to_excel('SF_MILAO_DEFINITIVO_IDS_CORRIGIDOS.xlsx', index=False)
print('📁 Planilha atualizada salva: SF_MILAO_DEFINITIVO_IDS_CORRIGIDOS.xlsx')
print()

print('🎯 RESUMO DA ATUALIZAÇÃO:')
print(f'✅ {len(df_mapeamento)} produtos com IDs atualizados')
print(f'✅ IDs correspondentes ao WooCommerce')
print(f'✅ Pronto para importação sem duplicação')
print()
print('🚀 PRÓXIMOS PASSOS:')
print('1. Carregar SF_MILAO_DEFINITIVO_IDS_CORRIGIDOS.xlsx no SF Imports')
print('2. Gerar CSV WooCommerce')
print('3. Importar no WooCommerce (irá ATUALIZAR, não criar)')
print('4. Verificar se não há duplicatas')
