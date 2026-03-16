import pandas as pd
import os

print('🔍 PROCURANDO CABALLO LOCO EM TODOS OS ARQUIVOS...')
print('=' * 60)

# Lista de arquivos Excel para verificar
arquivos_excel = [
    'MILAO_412_COLUNAS_EXATAS.xlsx',
    'MILAO_COMPLETO.xlsx', 
    'SF_MILAO_INTEGRADO.xlsx',
    'SF_MILAO_SISTEMA.xlsx',
    'milao_padrao.csv'
]

for arquivo in arquivos_excel:
    if os.path.exists(arquivo):
        try:
            print(f'\n📁 Verificando: {arquivo}')
            
            if arquivo.endswith('.xlsx'):
                df = pd.read_excel(arquivo)
            else:
                df = pd.read_csv(arquivo)
            
            # Procurar CABALLO em várias colunas
            caballo_encontrado = False
            
            for col in df.columns:
                if df[col].dtype == 'object':
                    caballo = df[df[col].str.contains('CABALLO', case=False, na=False)]
                    if len(caballo) > 0:
                        print(f'   🐴 ENCONTRADO na coluna "{col}": {len(caballo)} ocorrências')
                        for i, row in caballo.iterrows():
                            print(f'      - {row[col]}')
                        caballo_encontrado = True
            
            if not caballo_encontrado:
                print(f'   ❌ CABALLO não encontrado')
                
        except Exception as e:
            print(f'   ❌ Erro ao ler: {e}')
    else:
        print(f'\n📁 Arquivo não encontrado: {arquivo}')

print('\n🎯 ANÁLISE DOS PRODUTOS MILÃO...')
try:
    df_milao = pd.read_excel('MILAO_412_COLUNAS_EXATAS.xlsx')
    print(f'\n📊 Tabela Milão: {len(df_milao)} produtos')
    print(f'📋 Colunas: {list(df_milao.columns)}')
    print(f'\n📋 Primeiros 10 produtos:')
    for i, row in df_milao.head(10).iterrows():
        print(f'   {i+1}. {row.iloc[0]}')
        
    # Procurar por produtos com "LOCO" ou "GRAN"
    loco = df_milao[df_milao.iloc[:, 0].str.contains('LOCO', case=False, na=False)]
    gran = df_milao[df_milao.iloc[:, 0].str.contains('GRAN', case=False, na=False)]
    
    print(f'\n🔍 Produtos com "LOCO": {len(loco)}')
    for i, row in loco.iterrows():
        print(f'   {row.iloc[0]}')
        
    print(f'\n🔍 Produtos com "GRAN": {len(gran)}')
    for i, row in gran.head(10).iterrows():
        print(f'   {row.iloc[0]}')
        
except Exception as e:
    print(f'❌ Erro: {e}')

print('\n💡 SOLUÇÃO: Preciso ver exatamente como está escrito o nome do produto!')
