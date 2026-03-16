import pandas as pd

rint("🔍 ANALISANDO ESTRUTURA COMPLETA")

# Ler mais linhas para entender
df = pd.read_csv('tabela_milao.xlsx', sep='\t', encoding='utf-8', nrows=100)

print(f"📋 Estrutura:")
print(f"Linhas: {len(df)}")
print(f"Colunas: {list(df.columns)}")

print("\n📋 Primeiras 100 linhas:")
for i, row in df.iterrows():
    linha = []
    for val in row:
        if pd.notna(val) and str(val).strip():
            linha.append(str(val)[:80])
    if linha:
        print(f"{i+1:2d}. {' | '.join(linha)}")

# Procurar CABALLO em todo o arquivo
print("\n🐴 Procurando CABALLO no arquivo completo...")
df_completo = pd.read_csv('tabela_milao.xlsx', sep='\t', encoding='utf-8')
print(f"📊 Total de linhas no arquivo: {len(df_completo)}")

caballos = []
for i, row in df_completo.iterrows():
    for val in row:
        if pd.notna(val) and 'CABALLO' in str(val).upper():
            caballos.append((i, str(val)))
            print(f"🐴 Linha {i}: {val}")

print(f"\n🐴 Total CABALLO encontrados: {len(caballos)}")
