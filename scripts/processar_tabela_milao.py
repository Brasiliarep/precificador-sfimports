import pandas as pd
import os
from datetime import datetime

print("🔧 PROCESSANDO: tabela_milao.xlsx")

arquivo = "tabela_milao.xlsx"
df = pd.read_excel(arquivo, engine='openpyxl')
print(f"✅ Carregado: {len(df)} produtos")

print(f"📋 Colunas: {list(df.columns)}")

# Procurar CABALLO
caballos = []
for col in df.columns:
    if df[col].dtype == 'object':
        encontrados = df[df[col].str.contains('CABALLO', case=False, na=False)]
        if len(encontrados) > 0:
            for i, row in encontrados.iterrows():
                caballos.append(row[col])
                print(f"🐴 CABALLO: {row[col]}")

print(f"🐴 Total CABALLO: {len(caballos)}")

# Identificar colunas
coluna_nome = None
coluna_preco_de = None
coluna_preco_por = None

for col in df.columns:
    col_lower = str(col).lower()
    if not coluna_nome and any(p in col_lower for p in ['nome', 'name', 'produto']):
        coluna_nome = col
    elif not coluna_preco_de and 'de' in col_lower and any(p in col_lower for p in ['preço', 'preco']):
        coluna_preco_de = col
    elif not coluna_preco_por and 'por' in col_lower and any(p in col_lower for p in ['preço', 'preco']):
        coluna_preco_por = col

print(f"Nome: {coluna_nome}")
print(f"Preço DE: {coluna_preco_de}")
print(f"Preço POR: {coluna_preco_por}")

# Criar tabela padronizada
df_padronizado = pd.DataFrame()
df_padronizado['name'] = df[coluna_nome]
df_padronizado['preco_de'] = df[coluna_preco_de] if coluna_preco_de else 0.0
df_padronizado['preco_por'] = df[coluna_preco_por] if coluna_preco_por else df_padronizado['preco_de']
df_padronizado['price'] = df_padronizado['preco_por']
df_padronizado['fornecedor'] = 'Emporio Milao'
df_padronizado['Match'] = 'milao_only'

# Limpar preços
def limpar_preco(preco):
    if pd.isna(preco):
        return 0.0
    if isinstance(preco, str):
        preco = str(preco).replace('R$', '').replace('$', '').replace('.', '').replace(',', '.').strip()
    try:
        return float(preco)
    except:
        return 0.0

df_padronizado['preco_de'] = df_padronizado['preco_de'].apply(limpar_preco)
df_padronizado['preco_por'] = df_padronizado['preco_por'].apply(limpar_preco)
df_padronizado['price'] = df_padronizado['preco_por']

# Adicionar colunas SF
df_padronizado['sf_por'] = 0.0
df_padronizado['frete'] = 0.0
df_padronizado['taxa'] = 0.0
df_padronizado['lucro_minimo'] = 0.0
df_padronizado['sf_sugestao'] = df_padronizado['preco_por']
df_padronizado['sf_final'] = df_padronizado['preco_por']
df_padronizado['data_raspagem'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Limpar dados
df_padronizado = df_padronizado.dropna(subset=['name'])
df_padronizado = df_padronizado[df_padronizado['name'].str.strip() != '']
df_padronizado = df_padronizado[df_padronizado['preco_por'] > 0]

print(f"✅ Padronizado: {len(df_padronizado)} produtos")

# Carregar SF se existir
df_sf = pd.DataFrame()
if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
    df_sf = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx', engine='openpyxl')
    df_sf['Match'] = 'sf_only'
    print(f"✅ SF carregado: {len(df_sf)} produtos")

# Combinar
if len(df_sf) > 0:
    df_final = pd.concat([df_sf, df_padronizado], ignore_index=True)
    print(f"✅ Combinado: {len(df_final)} total")
else:
    df_final = df_padronizado

# Remover duplicatas
df_final = df_final.drop_duplicates(subset=['name'], keep='first')
print(f"🧹 Únicos: {len(df_final)} produtos")

# Salvar
df_final.to_excel('TABELA_MILAO_FINAL.xlsx', index=False)
print("💾 Salvo: TABELA_MILAO_FINAL.xlsx")

colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
df_sistema = df_final[colunas_sistema].copy()
df_sistema.to_excel('TABELA_MILAO_SISTEMA.xlsx', index=False)
print("💾 Sistema: TABELA_MILAO_SISTEMA.xlsx")

print("\n🎉 CONCLUÍDO!")
print(f"📊 Total: {len(df_final)} produtos")
print(f"🐴 CABALLO: {len(caballos)} encontrados")
print("🚀 Use TABELA_MILAO_SISTEMA.xlsx no sistema!")
