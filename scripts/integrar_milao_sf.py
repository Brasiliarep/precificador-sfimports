#!/usr/bin/env python3
"""
INTEGRAÇÃO MILÃO + SF IMPORTS
Arquivo: MILAO_412_COLUNAS_EXATAS.xlsx
Resultados: SF_MILAO_INTEGRADO.xlsx
"""

import pandas as pd
import numpy as np
from datetime import datetime

print("🔄 INTEGRANDO MILÃO AO SISTEMA SF IMPORTS")
print("=" * 60)

# 1. CARREGAR TABELA DO MILÃO
print("\n📦 1. Carregando tabela do Milão...")
milao = pd.read_excel('MILAO_412_COLUNAS_EXATAS.xlsx')
print(f"✅ Milão: {len(milao)} produtos")

# 2. PADRONIZAR COLUNAS DO MILÃO
print("\n🔧 2. Padronizando colunas...")
milao_padronizado = milao.copy()
milao_padronizado.columns = ['name', 'preco_de', 'preco_por']

# Limpar e converter preços
def limpar_preco(preco):
    if pd.isna(preco):
        return 0.0
    if isinstance(preco, str):
        preco = str(preco).replace('R$', '').replace('$', '').replace(',', '.').strip()
    try:
        return float(preco)
    except:
        return 0.0

milao_padronizado['preco_de'] = milao_padronizado['preco_de'].apply(limpar_preco)
milao_padronizado['preco_por'] = milao_padronizado['preco_por'].apply(limpar_preco)
milao_padronizado['price'] = milao_padronizado['preco_por']  # Preço final = preço por

# Adicionar colunas padrão
milao_padronizado['fornecedor'] = 'Emporio Milao'
milao_padronizado['Match'] = 'milao_only'
milao_padronizado['sf_por'] = 0.0
milao_padronizado['frete'] = 0.0
milao_padronizado['taxa'] = 0.0
milao_padronizado['lucro_minimo'] = 0.0
milao_padronizado['sf_sugestao'] = milao_padronizado['preco_por']
milao_padronizado['sf_final'] = milao_padronizado['preco_por']
milao_padronizado['data_raspagem'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# 3. CARREGAR DADOS SF EXISTENTES (se houver)
print("\n📋 3. Verificando dados SF existentes...")
try:
    sf_existente = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx')
    print(f"✅ SF existente: {len(sf_existente)} produtos")
    tem_sf = True
except:
    print("⚠️ SF existente não encontrado")
    sf_existente = pd.DataFrame()
    tem_sf = False

# 4. PADRONIZAR COLUNAS SF
if tem_sf:
    print("\n🔧 4. Padronizando colunas SF...")
    
    # Verificar colunas SF
    colunas_sf_necessarias = ['name', 'preco_de', 'preco_por', 'price', 'fornecedor']
    
    for col in colunas_sf_necessarias:
        if col not in sf_existente.columns:
            if col == 'name' and 'produto' in sf_existente.columns:
                sf_existente['name'] = sf_existente['produto']
            elif col == 'fornecedor':
                sf_existente['fornecedor'] = 'SF Imports'
            else:
                sf_existente[col] = 0.0
    
    # Adicionar colunas faltantes
    if 'Match' not in sf_existente.columns:
        sf_existente['Match'] = 'sf_only'
    
    # Manter apenas colunas importantes
    colunas_finais = ['name', 'preco_de', 'preco_por', 'price', 'fornecedor', 'Match']
    for col in colunas_finais:
        if col not in sf_existente.columns:
            sf_existente[col] = ''
    
    sf_padronizado = sf_existente[colunas_finais].copy()
else:
    sf_padronizado = pd.DataFrame()

# 5. COMBINAR TABELAS
print("\n🔗 5. Combinando tabelas...")
if tem_sf:
    # Combinar SF + Milão
    todos_produtos = pd.concat([sf_padronizado, milao_padronizado], ignore_index=True)
    print(f"✅ Combinado: {len(sf_padronizado)} SF + {len(milao_padronizado)} Milão = {len(todos_produtos)} total")
else:
    # Apenas Milão
    todos_produtos = milao_padronizado.copy()
    print(f"✅ Apenas Milão: {len(todos_produtos)} produtos")

# 6. REMOVER DUPLICATAS
print("\n🧹 6. Removendo duplicatas...")
produtos_unicos = todos_produtos.drop_duplicates(subset=['name'], keep='first')
print(f"✅ Removidas {len(todos_produtos) - len(produtos_unicos)} duplicatas")
print(f"📊 Total único: {len(produtos_unicos)} produtos")

# 7. ORDENAR E SALVAR
print("\n💾 7. Salvando arquivos finais...")

# Ordenar por fornecedor e nome
produtos_unicos = produtos_unicos.sort_values(['fornecedor', 'name'])

# Salvar em múltiplos formatos
produtos_unicos.to_excel('SF_MILAO_INTEGRADO.xlsx', index=False)
produtos_unicos.to_csv('sf_milao_integrado.csv', index=False, encoding='utf-8')

# 8. CRIAR VERSÃO PARA SISTEMA (com colunas específicas)
print("\n⚙️ 8. Criando versão para o sistema...")

# Colunas que o sistema SF usa
colunas_sistema = [
    'name', 'preco_de', 'preco_por', 'price',
    'sf_por', 'frete', 'taxa', 'lucro_minimo', 
    'sf_sugestao', 'sf_final', 'fornecedor', 'Match'
]

# Garantir que todas as colunas existam
for col in colunas_sistema:
    if col not in produtos_unicos.columns:
        produtos_unicos[col] = 0.0 if 'preco' in col or col in ['sf_por', 'frete', 'taxa', 'lucro_minimo', 'sf_sugestao', 'sf_final'] else ''

# Versão final para o sistema
sistema_df = produtos_unicos[colunas_sistema].copy()
sistema_df.to_excel('SF_MILAO_SISTEMA.xlsx', index=False)

# 9. RELATÓRIO FINAL
print("\n" + "=" * 60)
print("🎉 INTEGRAÇÃO CONCLUÍDA!")
print("=" * 60)

print(f"\n📊 RESUMO FINAL:")
print(f"   Total de produtos: {len(produtos_unicos)}")
if tem_sf:
    print(f"   Produtos SF: {len(sf_padronizado)}")
print(f"   Produtos Milão: {len(milao_padronizado)}")

print(f"\n📁 ARQUIVOS GERADOS:")
print(f"   ✅ SF_MILAO_INTEGRADO.xlsx - Dados completos")
print(f"   ✅ sf_milao_integrado.csv - Versão CSV")
print(f"   ✅ SF_MILAO_SISTEMA.xlsx - Para o sistema")

# Mostrar amostra
print(f"\n📋 AMOSTRA (primeiros 10):")
print(produtos_unicos[['name', 'preco_de', 'preco_por', 'fornecedor']].head(10).to_string(index=False))

# Procurar produtos específicos
print(f"\n🔍 PRODUTOS ESPECÍFICOS:")
vinhos = produtos_unicos[produtos_unicos['name'].str.contains('VINHO', case=False, na=False)]
print(f"   Vinhos encontrados: {len(vinhos)}")

queijos = produtos_unicos[produtos_unicos['name'].str.contains('QUEIJO', case=False, na=False)]
print(f"   Queijos encontrados: {len(queijos)}")

print(f"\n🚀 PRÓXIMO PASSO:")
print(f"   Use o arquivo SF_MILAO_SISTEMA.xlsx no seu sistema de precificação!")
print(f"   Ele já está formatado com todas as colunas necessárias.")
