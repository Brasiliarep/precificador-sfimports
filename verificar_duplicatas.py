import pandas as pd

# Ler o arquivo original
df_original = pd.read_csv('tabela_milao.xlsx', sep='\t', encoding='utf-8')
print('🔍 VERIFICANDO DUPLICATAS')
print('=' * 40)

# Verificar duplicatas por nome exato
duplicatas_exatas = df_original[df_original.duplicated(subset=['Nome'], keep=False)]
print(f'📋 Duplicatas exatas: {len(duplicatas_exatas)} produtos')

if len(duplicatas_exatas) > 0:
    print('\n📋 PRODUTOS DUPLICADOS:')
    for nome in duplicatas_exatas['Nome'].unique():
        count = len(duplicatas_exatas[duplicatas_exatas['Nome'] == nome])
        print(f'   {nome}: {count} vezes')

# Verificar duplicatas por nome similar (ignorando case e espaços)
df_original['nome_limpo'] = df_original['Nome'].str.strip().str.lower()
duplicatas_similares = df_original[df_original.duplicated(subset=['nome_limpo'], keep=False)]
print(f'\n📋 Duplicatas similares: {len(duplicatas_similares)} produtos')

if len(duplicatas_similares) > 0:
    print('\n📋 PRODUTOS COM NOMES SIMILARES:')
    for nome in duplicatas_similares['nome_limpo'].unique()[:10]:  # Mostrar só 10 exemplos
        count = len(duplicatas_similares[duplicatas_similares['nome_limpo'] == nome])
        original_nome = duplicatas_similares[duplicatas_similares['nome_limpo'] == nome]['Nome'].iloc[0]
        print(f'   {original_nome}: {count} vezes')

# Remover duplicatas e contar
df_sem_duplicatas = df_original.drop_duplicates(subset=['nome_limpo'], keep='first')
print(f'\n📊 RESULTADO:')
print(f'   Original: {len(df_original)} produtos')
print(f'   Sem duplicatas: {len(df_sem_duplicatas)} produtos')
print(f'   Removidos: {len(df_original) - len(df_sem_duplicatas)} produtos')

# Verificar CABALLO LOCO após remoção
caballos_original = df_original[df_original['Nome'].str.contains('CABALLO', case=False, na=False)]
caballos_sem_dup = df_sem_duplicatas[df_sem_duplicatas['Nome'].str.contains('CABALLO', case=False, na=False)]

print(f'\n🐴 CABALLO LOCO:')
print(f'   Original: {len(caballos_original)}')
print(f'   Sem duplicatas: {len(caballos_sem_dup)}')

# Salvar versão sem duplicatas para comparação
df_sem_duplicatas = df_sem_duplicatas.drop('nome_limpo', axis=1)
df_sem_duplicatas.to_excel('MILAO_SEM_DUPLICATAS.xlsx', index=False)
print(f'\n✅ Salvo: MILAO_SEM_DUPLICATAS.xlsx ({len(df_sem_duplicatas)} produtos)')
