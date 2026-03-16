import pandas as pd

print('🔍 VERIFICANDO CABALLO LOCO NAS TABELAS...')
print('=' * 50)

# Verificar na tabela SF
try:
    sf_df = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx')
    caballo_sf = sf_df[sf_df['name'].str.contains('CABALLO', case=False, na=False)]
    print(f'🐴 CABALLO na tabela SF: {len(caballo_sf)}')
    if len(caballo_sf) > 0:
        for i, row in caballo_sf.iterrows():
            print(f'   {row["name"]}')
except Exception as e:
    print(f'❌ Tabela SF não encontrada: {e}')

# Verificar na tabela Milão
try:
    milao_df = pd.read_excel('MILAO_412_COLUNAS_EXATAS.xlsx')
    caballo_milao = milao_df[milao_df['nome'].str.contains('CABALLO', case=False, na=False)]
    print(f'🐴 CABALLO na tabela Milão: {len(caballo_milao)}')
    if len(caballo_milao) > 0:
        for i, row in caballo_milao.iterrows():
            print(f'   {row["nome"]} - R$ {row["preço por"]}')
except Exception as e:
    print(f'❌ Tabela Milão não encontrada: {e}')

print('\n🎯 PROBLEMA: O sistema não está fazendo o MATCH correto!')
print('💡 SOLUÇÃO: Criar sistema de match por nome similar')
