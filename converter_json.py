#!/usr/bin/env python3
"""
CONVERSOR JSON → EXCEL
Para quando você conseguir o JSON dos produtos manualmente

COMO USAR:
1. Salve o JSON como produtos.json
2. Execute: python converter_json.py
3. Resultado: MILAO_PRODUTOS.xlsx
"""

import json
import pandas as pd
from datetime import datetime
import re

print("🔄 CONVERSOR JSON → EXCEL\n")

# Ler JSON
try:
    with open('produtos.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"✅ JSON carregado com sucesso!")
except FileNotFoundError:
    print("❌ Arquivo produtos.json não encontrado!")
    print("\n📋 INSTRUÇÕES:")
    print("1. Abra https://emporiomilaoprime.meucardapio.ai/")
    print("2. F12 → Network → Recarregue")
    print("3. Procure requisição com 'products' ou 'items'")
    print("4. Clique → Response → Copie")
    print("5. Salve como produtos.json nesta pasta")
    exit(1)

def extrair_produtos(obj, produtos=[]):
    """Extrai produtos recursivamente de estrutura JSON"""
    if isinstance(obj, dict):
        # Se parece com um produto
        if any(key in obj for key in ['name', 'nome', 'title', 'product_name']):
            nome = obj.get('name') or obj.get('nome') or obj.get('title') or obj.get('product_name')
            preco_por = obj.get('price') or obj.get('preco') or obj.get('sale_price') or obj.get('valor') or 0
            preco_de = obj.get('original_price') or obj.get('preco_de') or obj.get('regular_price') or preco_por
            
            # Limpar valores
            if isinstance(preco_por, str):
                preco_por = float(re.sub(r'[^\d.,]', '', preco_por).replace(',', '.'))
            if isinstance(preco_de, str):
                preco_de = float(re.sub(r'[^\d.,]', '', preco_de).replace(',', '.'))
            
            produtos.append({
                'name': str(nome),
                'preco_de': float(preco_de) if preco_de else float(preco_por),
                'preco_por': float(preco_por),
                'price': float(preco_por),
                'fornecedor': 'Emporio Milao'
            })
        
        # Recursivo em valores
        for value in obj.values():
            if isinstance(value, (dict, list)):
                extrair_produtos(value, produtos)
    
    elif isinstance(obj, list):
        for item in obj:
            extrair_produtos(item, produtos)
    
    return produtos

# Extrair produtos
print("🔍 Extraindo produtos do JSON...")
produtos = extrair_produtos(data)

if not produtos:
    print("❌ Nenhum produto encontrado no JSON!")
    print("\n📋 Estrutura do JSON:")
    print(json.dumps(data, indent=2)[:500])
    print("\n⚠️ Verifique se o JSON está correto")
    exit(1)

# Remover duplicatas
produtos_unicos = []
nomes_vistos = set()
for p in produtos:
    if p['name'] not in nomes_vistos:
        produtos_unicos.append(p)
        nomes_vistos.add(p['name'])

print(f"✅ {len(produtos_unicos)} produtos únicos encontrados")

# Criar DataFrame
df = pd.DataFrame(produtos_unicos)
df['data_raspagem'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Salvar
arquivo_saida = 'MILAO_PRODUTOS.xlsx'
df.to_excel(arquivo_saida, index=False)

print(f"\n✅ Arquivo salvo: {arquivo_saida}")
print(f"📊 Total: {len(df)} produtos")

# Mostrar amostra
print("\n📋 Primeiros 10 produtos:")
print(df[['name', 'preco_de', 'preco_por']].head(10).to_string(index=False))

# Procurar CABALLO
caballo = df[df['name'].str.contains('CABALLO', case=False, na=False)]
if len(caballo) > 0:
    print("\n🐴 CABALLO LOCO encontrados:")
    for _, row in caballo.iterrows():
        print(f"   {row['name']}: R$ {row['preco_por']:.2f}")
