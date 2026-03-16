import pandas as pd
import os
from datetime import datetime

print("🔧 PROCESSANDO: tabela_milao.xlsx (formato CSV)")

arquivo = "tabela_milao.xlsx"

# Ler como CSV com tabulação
df = pd.read_csv(arquivo, sep='\t', encoding='utf-8')
print(f"✅ Carregado: {len(df)} produtos")

print(f"📋 Colunas: {list(df.columns)}")

# Mostrar amostra
print(f"\n📋 Amostra dos dados:")
for i, row in df.head(10).iterrows():
    linha = []
    for val in row:
        if pd.notna(val) and str(val).strip():
            linha.append(str(val)[:60])
    if linha:
        print(f"   {i+1}. {' | '.join(linha[:3])}")

# Procurar CABALLO
caballos = []
for col in df.columns:
    if df[col].dtype == 'object':
        encontrados = df[df[col].str.contains('CABALLO', case=False, na=False)]
        if len(encontrados) > 0:
            for i, row in encontrados.iterrows():
                caballos.append(row[col])
                print(f"🐴 CABALLO: {row[col]}")

print(f"\n🐴 CABALLO encontrados: {len(caballos)}")

# Identificar colunas importantes
coluna_nome = None
coluna_preco_de = None
coluna_preco_por = None

for col in df.columns:
    col_lower = str(col).lower().strip()
    
    # Coluna de nome
    if not coluna_nome and any(p in col_lower for p in ['nome', 'name', 'produto', 'descrição', 'item']):
        coluna_nome = col
        print(f"   ✅ Nome: {col}")
    
    # Coluna preço DE
    elif not coluna_preco_de and any(p in col_lower for p in ['preço de', 'preco_de', 'valor de', 'original']):
        coluna_preco_de = col
        print(f"   ✅ Preço DE: {col}")
    
    # Coluna preço POR
    elif not coluna_preco_por and any(p in col_lower for p in ['preço por', 'preco_por', 'preco', 'valor']):
        coluna_preco_por = col
        print(f"   ✅ Preço POR: {col}")

# Se não encontrar colunas específicas, usar a primeira coluna como nome
if not coluna_nome:
    coluna_nome = df.columns[0]
    print(f"   ✅ Nome (primeira coluna): {coluna_nome}")

# Procurar colunas de preço por padrão
if not coluna_preco_de:
    for col in df.columns:
        if col != coluna_nome and df[col].dtype != 'object':
            coluna_preco_de = col
            print(f"   ✅ Preço DE (numérica): {col}")
            break

if not coluna_preco_por:
    for col in df.columns:
        if col != coluna_nome and col != coluna_preco_de and df[col].dtype != 'object':
            coluna_preco_por = col
            print(f"   ✅ Preço POR (numérica): {col}")
            break

print(f"\n📋 Colunas finais:")
print(f"   Nome: {coluna_nome}")
print(f"   Preço DE: {coluna_preco_de}")
print(f"   Preço POR: {coluna_preco_por}")

# Criar DataFrame padronizado
df_padronizado = pd.DataFrame()
df_padronizado['name'] = df[coluna_nome]

# Adicionar preços
if coluna_preco_de:
    df_padronizado['preco_de'] = df[coluna_preco_de]
else:
    df_padronizado['preco_de'] = 0.0

if coluna_preco_por:
    df_padronizado['preco_por'] = df[coluna_preco_por]
elif coluna_preco_de:
    df_padronizado['preco_por'] = df[coluna_preco_de]
else:
    df_padronizado['preco_por'] = 0.0

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

# Adicionar colunas padrão SF
df_padronizado['fornecedor'] = 'Emporio Milao'
df_padronizado['Match'] = 'milao_only'
df_padronizado['sf_por'] = 0.0
df_padronizado['frete'] = 0.0
df_padronizado['taxa'] = 0.0
df_padronizado['lucro_minimo'] = 0.0
df_padronizado['sf_sugestao'] = df_padronizado['preco_por']
df_padronizado['sf_final'] = df_padronizado['preco_por']
df_padronizado['data_raspagem'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Limpar dados inválidos
df_padronizado = df_padronizado.dropna(subset=['name'])
df_padronizado = df_padronizado[df_padronizado['name'].str.strip() != '']
df_padronizado = df_padronizado[df_padronizado['preco_por'] > 0]

print(f"\n✅ Padronizado: {len(df_padronizado)} produtos válidos")

# Carregar SF Imports se existir
df_sf = pd.DataFrame()
if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
    try:
        df_sf = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx', engine='openpyxl')
        df_sf['Match'] = 'sf_only'
        print(f"✅ SF Imports carregado: {len(df_sf)} produtos")
    except:
        print("⚠️ SF Imports não encontrado ou com erro")

# Fazer MATCH inteligente
if len(df_sf) > 0 and len(caballos) > 0:
    print(f"\n🎯 Fazendo MATCH inteligente...")
    matches = 0
    
    for caballo in caballos:
        nome_caballo = str(caballo).lower()
        
        # Procurar na tabela SF
        for i, row_sf in df_sf.iterrows():
            nome_sf = str(row_sf.get('name', row_sf.get('produto', ''))).lower()
            
            # Verificar similaridade por palavras chave
            palavras_chave = ['caballo', 'loco', 'gran', 'cru', 'malbec']
            
            if any(palavra in nome_sf for palavra in palavras_chave):
                if any(palavra in nome_caballo for palavra in palavras_chave):
                    # Marcar match
                    df_sf.loc[i, 'Match'] = 'both_matched'
                    matches += 1
                    print(f"   ✅ MATCH: {caballo}")
                    break
    
    print(f"✅ Matches realizados: {matches}")

# Combinar tabelas
if len(df_sf) > 0:
    print(f"\n🔗 Combinando SF + Milão...")
    df_final = pd.concat([df_sf, df_padronizado], ignore_index=True)
    print(f"✅ Combinado: {len(df_sf)} SF + {len(df_padronizado)} Milão = {len(df_final)} total")
else:
    df_final = df_padronizado
    print(f"✅ Apenas Milão: {len(df_final)} produtos")

# Remover duplicatas
df_final = df_final.drop_duplicates(subset=['name'], keep='first')
print(f"🧹 Removidas duplicatas: {len(df_final)} produtos únicos")

# Salvar arquivos
print(f"\n💾 Salvando arquivos finais...")

# Arquivo completo
df_final.to_excel('TABELA_MILAO_FINAL.xlsx', index=False)
print(f"✅ TABELA_MILAO_FINAL.xlsx")

# Arquivo para o sistema
colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 
                 'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']

df_sistema = df_final[colunas_sistema].copy()
df_sistema.to_excel('TABELA_MILAO_SISTEMA.xlsx', index=False)
print(f"✅ TABELA_MILAO_SISTEMA.xlsx")

# Relatório final
print(f"\n" + "=" * 60)
print("🎉 PROCESSAMENTO CONCLUÍDO!")
print("=" * 60)
print(f"📊 RESUMO FINAL:")
print(f"   Total de produtos: {len(df_final)}")
print(f"   Produtos Milão: {len(df_padronizado)}")
if len(df_sf) > 0:
    print(f"   Produtos SF: {len(df_sf)}")
print(f"   CABALLO LOCO: {len(caballos)} encontrados")

print(f"\n📁 ARQUIVOS GERADOS:")
print(f"   ✅ TABELA_MILAO_FINAL.xlsx - Dados completos")
print(f"   ✅ TABELA_MILAO_SISTEMA.xlsx - Para importar")

if len(caballos) > 0:
    print(f"\n🐴 CABALLO LOCO encontrados:")
    for i, caballo in enumerate(caballos):
        print(f"   {i+1}. {caballo}")

print(f"\n🚀 PRÓXIMO PASSO:")
print(f"   Use TABELA_MILAO_SISTEMA.xlsx no seu sistema SF Imports!")
print(f"   Ele já está formatado e pronto para precificação!")
