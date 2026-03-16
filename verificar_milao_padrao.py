import pandas as pd

print('🔍 VERIFICANDO milao_padrao.csv (3995 produtos)...')
print('=' * 60)

df = pd.read_csv('milao_padrao.csv')
print(f'📊 Total: {len(df)} produtos')
print(f'📋 Colunas: {list(df.columns)}')

# Mostrar primeiras linhas para entender estrutura
print(f'\n📋 Primeiras 20 linhas:')
for i, row in df.head(20).iterrows():
    print(f'   {i+1}. {str(row.iloc[0])[:80]}...')

# Procurar CABALLO
print(f'\n🔍 Procurando CABALLO...')
for col in df.columns:
    if df[col].dtype == 'object':
        caballo = df[df[col].str.contains('CABALLO', case=False, na=False)]
        if len(caballo) > 0:
            print(f'   🐴 ENCONTRADO na coluna "{col}": {len(caballo)}')
            for i, row in caballo.iterrows():
                print(f'      - {row[col]}')

# Procurar LOCO
print(f'\n🔍 Procurando LOCO...')
for col in df.columns:
    if df[col].dtype == 'object':
        loco = df[df[col].str.contains('LOCO', case=False, na=False)]
        if len(loco) > 0:
            print(f'   🎯 ENCONTRADO na coluna "{col}": {len(loco)}')
            for i, row in loco.iterrows():
                print(f'      - {row[col]}')

# Procurar GRAN CRU
print(f'\n🔍 Procurando GRAN CRU...')
for col in df.columns:
    if df[col].dtype == 'object':
        gran_cru = df[df[col].str.contains('GRAN.*CRU|CRU.*GRAN', case=False, na=False)]
        if len(gran_cru) > 0:
            print(f'   🎯 ENCONTRADO na coluna "{col}": {len(gran_cru)}')
            for i, row in gran_cru.iterrows():
                print(f'      - {row[col]}')

# Procurar só GRAN
print(f'\n🔍 Procurando GRAN...')
for col in df.columns:
    if df[col].dtype == 'object':
        gran = df[df[col].str.contains('GRAN', case=False, na=False)]
        if len(gran) > 0:
            print(f'   🎯 ENCONTRADO na coluna "{col}": {len(gran)} ocorrências')
            for i, row in gran.head(10).iterrows():
                print(f'      - {row[col]}')
            if len(gran) > 10:
                print(f'      ... e mais {len(gran) - 10} produtos')
