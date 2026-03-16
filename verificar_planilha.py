import pandas as pd

# Ler a planilha
try:
    df = pd.read_excel('SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')
    print('📋 ESTRUTURA DA PLANILHA:')
    print(f'Colunas: {list(df.columns)}')
    print(f'Linhas: {len(df)}')
    print()
    
    # Verificar se tem coluna ID
    if 'ID' in df.columns:
        print('✅ COLUNA ID ENCONTRADA')
        print('Primeiros 5 IDs:')
        print(df[['Produto', 'ID']].head())
    else:
        print('❌ COLUNA ID NÃO ENCONTRADA')
        print('Colunas disponíveis:')
        for i, col in enumerate(df.columns):
            print(f'{i+1:2d}. {col}')
    
    # Procurar VINHO TINTO ALECRIM
    if 'Produto' in df.columns:
        print()
        print('🔍 PROCURANDO VINHO TINTO ALECRIM:')
        alecrim = df[df['Produto'].str.contains('ALECRIM', case=False, na=False)]
        if not alecrim.empty:
            print(f'Encontrados {len(alecrim)} produtos:')
            for idx, row in alecrim.iterrows():
                print(f'  Linha {idx}: {row["Produto"]}')
                if 'ID' in df.columns and pd.notna(row.get('ID')):
                    print(f'    ID: {row["ID"]}')
        else:
            print('Nenhum produto ALECRIM encontrado')
            
except Exception as e:
    print(f'Erro: {e}')
