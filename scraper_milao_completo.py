#!/usr/bin/env python3
"""
SCRAPER DEFINITIVO - EMPÓRIO MILÃO PRIME
Site: https://emporiomilaoprime.meucardapio.ai/
Extrai TODOS os produtos e preços

INSTRUÇÕES:
1. pip install requests beautifulsoup4 selenium webdriver-manager
2. python scraper_milao_completo.py
3. Resultado: MILAO_COMPLETO.xlsx com TODOS os produtos
"""

import time
import re
import pandas as pd
from datetime import datetime

print("=" * 80)
print("🍷 SCRAPER EMPÓRIO MILÃO PRIME - VERSÃO DEFINITIVA")
print("=" * 80)
print()

# Tentar com Selenium (melhor para sites JavaScript)
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    
    print("✅ Selenium instalado! Usando método JavaScript...")
    
    # Configurar Chrome
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Sem abrir janela
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    print("🚀 Iniciando navegador...")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # Acessar site
    url = "https://emporiomilaoprime.meucardapio.ai/"
    print(f"📡 Acessando: {url}")
    driver.get(url)
    
    # Esperar carregar
    print("⏳ Aguardando produtos carregarem (15 segundos)...")
    time.sleep(15)
    
    # Rolar a página até o final para carregar lazy loading
    print("📜 Rolando página para carregar todos os produtos...")
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height
        print(f"   Rolando... altura: {new_height}px")
    
    print("\n🔍 Extraindo produtos...")
    
    # Tentar vários seletores possíveis
    seletores_produto = [
        'div[class*="product"]',
        'div[class*="item"]',
        'article',
        'div[class*="card"]',
        '[data-product]',
        '.menu-item',
    ]
    
    produtos = []
    
    for seletor in seletores_produto:
        try:
            elementos = driver.find_elements(By.CSS_SELECTOR, seletor)
            if len(elementos) > 5:  # Se encontrou vários elementos
                print(f"✅ Seletor funcionou: {seletor} ({len(elementos)} elementos)")
                
                for elem in elementos:
                    try:
                        # Extrair nome
                        nome_elem = None
                        for tag in ['h1', 'h2', 'h3', 'h4', 'span', 'p']:
                            try:
                                nome_elem = elem.find_element(By.TAG_NAME, tag)
                                nome_texto = nome_elem.text.strip()
                                if len(nome_texto) > 3 and not nome_texto.startswith('R$'):
                                    break
                            except:
                                continue
                        
                        if not nome_elem:
                            continue
                        
                        nome = nome_elem.text.strip()
                        
                        # Extrair preços
                        texto_completo = elem.text
                        precos = re.findall(r'R\$\s*([\d.,]+)', texto_completo)
                        
                        preco_de = None
                        preco_por = None
                        
                        if len(precos) >= 2:
                            # Tem preço DE e POR
                            preco_de_texto = precos[0].replace('.', '').replace(',', '.')
                            preco_por_texto = precos[1].replace('.', '').replace(',', '.')
                            preco_de = float(preco_de_texto)
                            preco_por = float(preco_por_texto)
                        elif len(precos) == 1:
                            # Só tem um preço
                            preco_texto = precos[0].replace('.', '').replace(',', '.')
                            preco_por = float(preco_texto)
                            preco_de = preco_por
                        
                        if nome and preco_por:
                            produto = {
                                'name': nome,
                                'preco_de': preco_de if preco_de else preco_por,
                                'preco_por': preco_por,
                                'price': preco_por,
                                'fornecedor': 'Emporio Milao'
                            }
                            
                            # Evitar duplicatas
                            if produto not in produtos:
                                produtos.append(produto)
                                print(f"  ✅ {nome}: R$ {preco_por:.2f}")
                    
                    except Exception as e:
                        continue
                
                if len(produtos) > 10:
                    break  # Encontrou produtos suficientes
        
        except:
            continue
    
    driver.quit()
    
    if not produtos:
        print("\n⚠️ Método Selenium não encontrou produtos")
        print("💡 Tentando método alternativo...")
        raise Exception("Selenium falhou")
    
    print(f"\n✅ Total extraído: {len(produtos)} produtos")
    
except Exception as e:
    print(f"\n⚠️ Selenium não disponível ou falhou: {e}")
    print("\n🔄 Usando método alternativo (HTML estático)...")
    
    import requests
    from bs4 import BeautifulSoup
    
    url = "https://emporiomilaoprime.meucardapio.ai/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers, timeout=15)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Procurar scripts com dados JSON
    scripts = soup.find_all('script')
    produtos = []
    
    for script in scripts:
        if script.string and ('product' in script.string.lower() or 'item' in script.string.lower()):
            # Tentar extrair JSON
            try:
                import json
                # Procurar por arrays ou objetos JSON
                matches = re.findall(r'\{[^{}]*"name"[^{}]*\}', script.string)
                for match in matches:
                    try:
                        data = json.loads(match)
                        if 'name' in data:
                            produtos.append({
                                'name': data.get('name', ''),
                                'preco_por': float(str(data.get('price', 0)).replace(',', '.')),
                                'preco_de': float(str(data.get('original_price', data.get('price', 0))).replace(',', '.')),
                                'price': float(str(data.get('price', 0)).replace(',', '.')),
                                'fornecedor': 'Emporio Milao'
                            })
                    except:
                        continue
            except:
                continue
    
    if not produtos:
        print("\n❌ ERRO: Nenhum método conseguiu extrair produtos!")
        print("\n📋 SOLUÇÃO MANUAL:")
        print("1. Abra: https://emporiomilaoprime.meucardapio.ai/")
        print("2. Pressione F12 → Network → Recarregue")
        print("3. Procure por 'products' ou 'items' nas requisições")
        print("4. Copie a resposta JSON")
        print("5. Salve como produtos.json")
        print("6. Execute: python converter_json.py")
        exit(1)

# Remover duplicatas
produtos_unicos = []
nomes_vistos = set()
for p in produtos:
    if p['name'] not in nomes_vistos:
        produtos_unicos.append(p)
        nomes_vistos.add(p['name'])

print(f"\n📊 Produtos únicos: {len(produtos_unicos)}")

# Criar DataFrame
df = pd.DataFrame(produtos_unicos)

# Adicionar coluna de data
df['data_raspagem'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Reordenar colunas
colunas_ordem = ['name', 'preco_de', 'preco_por', 'price', 'fornecedor', 'data_raspagem']
df = df[colunas_ordem]

# Salvar Excel
arquivo_saida = 'MILAO_COMPLETO.xlsx'
df.to_excel(arquivo_saida, index=False)

print(f"\n✅ SUCESSO! Arquivo salvo: {arquivo_saida}")
print(f"📊 Total de produtos: {len(df)}")

# Mostrar amostra
print("\n📋 AMOSTRA (primeiros 10 produtos):")
print(df.head(10).to_string(index=False))

# Procurar CABALLO LOCO
print("\n🔍 Procurando CABALLO LOCO...")
caballo = df[df['name'].str.contains('CABALLO', case=False, na=False)]
if len(caballo) > 0:
    print("✅ ENCONTRADO!")
    for _, row in caballo.iterrows():
        print(f"   {row['name']}")
        print(f"   De: R$ {row['preco_de']:.2f}")
        print(f"   Por: R$ {row['preco_por']:.2f}")
        print()
else:
    print("⚠️ CABALLO LOCO não encontrado na raspagem")

print("\n" + "=" * 80)
print("🎉 RASPAGEM CONCLUÍDA!")
print("=" * 80)
print(f"\n📂 Arquivo gerado: {arquivo_saida}")
print("📊 Use este arquivo no seu sistema de precificação")
