"""
SCRIPT PARA CORRIGIR PREÇOS - VERSÃO SEM ERROS

INSTRUÇÕES:
1. Salvar como: corrigir_precos.py
2. Colocar na pasta: C:\\app precificador\\precificador-sfimports\\
3. Executar: python corrigir_precos.py
"""

import pandas as pd
import os

print("=" * 60)
print("CORREÇÃO DE PREÇOS - VERSÃO DEFINITIVA")
print("=" * 60)

# ============================================================
# PASSO 1: CARREGAR WOOCOMMERCE
# ============================================================

print("\n1. Carregando WooCommerce...")

try:
    woo = pd.read_csv('wc-product-export-19-2-2026-1771549530495.csv')
    print(f"   ✅ WooCommerce carregado: {len(woo)} produtos")
except FileNotFoundError:
    print("   ❌ ERRO: Arquivo WooCommerce não encontrado!")
    print("   📋 Coloque o arquivo: wc-product-export-19-2-2026-1771549530495.csv")
    print("   📁 Na mesma pasta deste script")
    exit(1)

# ============================================================
# FUNÇÃO: CONVERTER PREÇOS
# ============================================================

def converter_preco(valor):
    """Converter qualquer formato de preço para float"""
    try:
        if pd.isna(valor) or valor == '' or valor == 0:
            return 0.0
        if isinstance(valor, (int, float)):
            return float(valor)
        # Remover R$, espaços, e converter
        valor_str = str(valor)
        valor_str = valor_str.replace('R$', '')
        valor_str = valor_str.replace(' ', '')
        valor_str = valor_str.replace('.', '')  # Remover separador de milhar
        valor_str = valor_str.replace(',', '.')  # Vírgula vira ponto decimal
        return float(valor_str)
    except:
        return 0.0

# ============================================================
# CRIAR DICIONÁRIO DE PREÇOS
# ============================================================

print("\n2. Processando preços do WooCommerce...")

precos_woo = {}
erros = 0

for idx, row in woo.iterrows():
    try:
        nome = str(row['Nome']).upper().strip()
        
        preco_regular = converter_preco(row['Preço'])
        preco_promo = converter_preco(row.get('Preço promocional', 0))
        
        # Se não tem preço promocional, usar o regular
        if preco_promo == 0:
            preco_promo = preco_regular
        
        # Se não tem preço regular, usar o promocional
        if preco_regular == 0:
            preco_regular = preco_promo
        
        # Só adicionar se tiver pelo menos um preço válido
        if preco_regular > 0 or preco_promo > 0:
            precos_woo[nome] = {
                'sf_de': preco_regular,
                'sf_por': preco_promo
            }
    except Exception as e:
        erros += 1
        if erros <= 5:  # Mostrar só os primeiros 5 erros
            print(f"   ⚠️ Erro na linha {idx}: {e}")

print(f"   ✅ Preços processados: {len(precos_woo)}")
if erros > 0:
    print(f"   ⚠️ Erros encontrados: {erros}")

# ============================================================
# PASSO 2: CARREGAR ARQUIVO BASE
# ============================================================

print("\n3. Carregando arquivo base...")

arquivo_base = None
arquivos_possiveis = [
    'public/SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx',
    'public/SF_MILAO_FINAL_COM_VINCULACAO_MANUAL.xlsx',
    'public/SF_MILAO_PRECO_CORRIGIDO_CIRURGICO.xlsx',
    'SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx',
    'SF_MILAO_FINAL_COM_VINCULACAO_MANUAL.xlsx'
]

for arquivo in arquivos_possiveis:
    if os.path.exists(arquivo):
        arquivo_base = arquivo
        break

if not arquivo_base:
    print("   ❌ ERRO: Nenhum arquivo base encontrado!")
    print("   📋 Coloque um destes arquivos:")
    for arq in arquivos_possiveis:
        print(f"      - {arq}")
    exit(1)

try:
    df = pd.read_excel(arquivo_base)
    print(f"   ✅ Arquivo carregado: {arquivo_base}")
    print(f"   📊 Total de produtos: {len(df)}")
except Exception as e:
    print(f"   ❌ ERRO ao ler arquivo: {e}")
    exit(1)

# ============================================================
# PASSO 3: ATUALIZAR PREÇOS
# ============================================================

print("\n4. Atualizando preços...")

atualizados = 0
nao_encontrados = 0
nomes_nao_encontrados = []

for idx, row in df.iterrows():
    nome_produto = str(row.get('Produto', '')).upper().strip()
    
    if nome_produto in precos_woo:
        # ATUALIZAR PREÇOS
        df.at[idx, 'SF de'] = precos_woo[nome_produto]['sf_de']
        df.at[idx, 'SF por'] = precos_woo[nome_produto]['sf_por']
        df.at[idx, 'Venda'] = precos_woo[nome_produto]['sf_por']
        
        atualizados += 1
    else:
        nao_encontrados += 1
        if len(nomes_nao_encontrados) < 10:
            nomes_nao_encontrados.append(nome_produto[:50])

print(f"   ✅ Produtos atualizados: {atualizados}")
print(f"   ⚠️ Produtos não encontrados: {nao_encontrados}")

if len(nomes_nao_encontrados) > 0:
    print("\n   📋 Exemplos não encontrados:")
    for nome in nomes_nao_encontrados[:5]:
        print(f"      - {nome}")

# ============================================================
# PASSO 4: RECALCULAR LUCROS
# ============================================================

print("\n5. Recalculando lucros e margens...")

for idx, row in df.iterrows():
    try:
        sf_por = float(row.get('SF por', 0) or 0)
        milao_por = float(row.get('Milão Por', 0) or 0)
        
        if sf_por > 0 and milao_por > 0:
            lucro = sf_por - milao_por
            margem = (lucro / sf_por * 100)
            
            df.at[idx, 'Lucro'] = lucro
            df.at[idx, 'Margem %'] = margem
            df.at[idx, 'Custo Real'] = milao_por
    except:
        pass

print("   ✅ Cálculos atualizados")

# ============================================================
# PASSO 5: SALVAR ARQUIVO
# ============================================================

print("\n6. Salvando arquivo final...")

# Criar pasta public se não existir
if not os.path.exists('public'):
    os.makedirs('public')
    print("   📁 Pasta 'public' criada")

arquivo_saida = 'public/SF_MILAO_PRECOS_CORRETOS.xlsx'

try:
    df.to_excel(arquivo_saida, index=False, engine='openpyxl')
    print(f"   ✅ Arquivo salvo: {arquivo_saida}")
except Exception as e:
    print(f"   ❌ ERRO ao salvar: {e}")
    exit(1)

# ============================================================
# PASSO 6: VERIFICAÇÃO
# ============================================================

print("\n7. VERIFICAÇÃO FINAL:")

# Contar por status
total = len(df)
both = len(df[df['Status'] == 'both']) if 'Status' in df.columns else 0
sf_only = len(df[df['Status'] == 'sf-only']) if 'Status' in df.columns else 0

print(f"\n   📊 ESTATÍSTICAS:")
print(f"      Total: {total}")
print(f"      Both: {both}")
print(f"      SF Only: {sf_only}")

# Verificar se ainda tem produtos com R$ 10,50
if 'Status' in df.columns:
    sf_only_df = df[df['Status'] == 'sf-only']
    com_10_50 = len(sf_only_df[sf_only_df['SF de'] == 10.50])
    
    if com_10_50 > 0:
        print(f"\n   ⚠️ ATENÇÃO: {com_10_50} produtos ainda com R$ 10,50")
    else:
        print(f"\n   ✅ SUCESSO: Nenhum produto com R$ 10,50!")
    
    # Mostrar exemplos
    print(f"\n   🔍 EXEMPLOS DE PRODUTOS SF ONLY:")
    for idx, row in sf_only_df.head(3).iterrows():
        print(f"\n      {row.get('Produto', '')[:50]}")
        print(f"      SF DE: R$ {row.get('SF de', 0):.2f}")
        print(f"      SF POR: R$ {row.get('SF por', 0):.2f}")

# ============================================================
# CONCLUSÃO
# ============================================================

print("\n" + "=" * 60)
print("✅ CORREÇÃO CONCLUÍDA COM SUCESSO!")
print("=" * 60)

print(f"\n📁 Arquivo gerado:")
print(f"   {arquivo_saida}")

print(f"\n🔧 PRÓXIMOS PASSOS:")
print(f"   1. Verificar se o arquivo foi criado")
print(f"   2. Atualizar código para usar: SF_MILAO_PRECOS_CORRETOS.xlsx")
print(f"   3. Limpar cache do navegador (CTRL + SHIFT + DELETE)")
print(f"   4. Recarregar página (CTRL + F5)")

print("\n" + "=" * 60)
