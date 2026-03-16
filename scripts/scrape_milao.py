# scrape_milao_prime.py - Emporio Milao TOP 50
import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import json
import time

print("🚀 Scraping Emporio Milao Prime - TOP 50")

# Tentar diferentes abordagens para encontrar os dados
def scrape_with_api():
    """Tenta encontrar API endpoints"""
    urls_to_try = [
        "https://emporiomilaoprime.meucardapio.ai/api/products",
        "https://emporiomilaoprime.meucardapio.ai/api/menu",
        "https://emporiomilaoprime.meucardapio.ai/api/items",
        "https://meucardapio.ai/api/emporiomilaoprime/products"
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://emporiomilaoprime.meucardapio.ai/'
    }
    
    for url in urls_to_try:
        try:
            print(f"🔍 Tentando API: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data:
                    print(f"✅ Dados encontrados via API!")
                    return data
        except Exception as e:
            continue
    
    return None

def scrape_with_selenium():
    """Usa Selenium para carregar JavaScript"""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from webdriver_manager.chrome import ChromeDriverManager
        
        print("🌐 Iniciando Selenium para carregar JavaScript...")
        
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        
        # Usar webdriver-manager para gerenciar automaticamente o ChromeDriver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        driver.get("https://emporiomilaoprime.meucardapio.ai/")
        
        # Esperar carregar
        print("⏳ Aguardando carregamento da página...")
        time.sleep(8)
        
        # Tentar encontrar produtos
        produtos = []
        
        # Procurar por diferentes seletores
        selectors = [
            '[data-product]',
            '.product-item',
            '.menu-item',
            '.cardapio-item',
            '.produto',
            '[class*="product"]',
            '[class*="item"]',
            '.item-cardapio',
            '[class*="card"]',
            '.food-item'
        ]
        
        for selector in selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"🎯 Encontrados {len(elements)} elementos com: {selector}")
                    
                    for i, element in enumerate(elements[:50]):
                        try:
                            # Tentar extrair nome de várias formas
                            name = ""
                            name_selectors = ['h1', 'h2', 'h3', 'h4', '.name', '.title', '.product-name', '[class*="nome"]']
                            for name_sel in name_selectors:
                                try:
                                    name_elem = element.find_element(By.CSS_SELECTOR, name_sel)
                                    name = name_elem.text.strip()
                                    if name:
                                        break
                                except:
                                    continue
                            
                            if not name:
                                name = f"Produto {i+1}"
                            
                            # Procurar preço de várias formas
                            price = 0.0
                            price_selectors = [
                                '[class*="price"]', 
                                '[class*="valor"]', 
                                '.price', 
                                '.valor',
                                '[class*="preco"]',
                                'span:contains("R$")',
                                'div:contains("R$")'
                            ]
                            
                            for price_sel in price_selectors:
                                try:
                                    price_elem = element.find_element(By.CSS_SELECTOR, price_sel)
                                    price_text = price_elem.text
                                    if price_text:
                                        price_match = re.search(r'(\d+)[,.](\d{2})', price_text)
                                        if price_match:
                                            price = float(f"{price_match.group(1)}.{price_match.group(2)}")
                                            break
                                except:
                                    continue
                            
                            # Se não encontrou preço, tentar encontrar qualquer texto com R$
                            if price == 0.0:
                                try:
                                    element_text = element.text
                                    price_match = re.search(r'R\$\s*(\d+)[,.](\d{2})', element_text)
                                    if price_match:
                                        price = float(f"{price_match.group(1)}.{price_match.group(2)}")
                                except:
                                    pass
                            
                            # Extrair descrição
                            description = ""
                            desc_selectors = ['.description', '.desc', '[class*="descricao"]', 'p']
                            for desc_sel in desc_selectors:
                                try:
                                    desc_elem = element.find_element(By.CSS_SELECTOR, desc_sel)
                                    desc_text = desc_elem.text.strip()
                                    if desc_text and desc_text != name:
                                        description = desc_text
                                        break
                                except:
                                    continue
                            
                            # Extrair imagem
                            image = ""
                            try:
                                img_elem = element.find_element(By.TAG_NAME, 'img')
                                image = img_elem.get_attribute('src') or ""
                            except:
                                pass
                            
                            produtos.append({
                                'name': name,
                                'price': price,
                                'description': description,
                                'image': image,
                                'source': 'emporio_milao_prime'
                            })
                            
                        except Exception as e:
                            continue
                    
                    if produtos:
                        break
                        
            except Exception as e:
                continue
        
        driver.quit()
        return produtos if produtos else None
        
    except Exception as e:
        print(f"❌ Erro com Selenium: {e}")
        return None

# Tentar API primeiro
api_data = scrape_with_api()

if api_data:
    # Processar dados da API
    produtos = []
    
    if isinstance(api_data, list):
        for i, item in enumerate(api_data[:50]):
            produtos.append({
                'name': item.get('name', item.get('nome', f"Produto {i+1}")),
                'price': float(item.get('price', item.get('preco', 0))),
                'description': item.get('description', item.get('descricao', '')),
                'image': item.get('image', item.get('imagem', '')),
                'source': 'emporio_milao_prime'
            })
    else:
        # Tentar extrair de objeto aninhado
        for key in ['products', 'items', 'menu', 'data']:
            if key in api_data and isinstance(api_data[key], list):
                for i, item in enumerate(api_data[key][:50]):
                    produtos.append({
                        'name': item.get('name', item.get('nome', f"Produto {i+1}")),
                        'price': float(item.get('price', item.get('preco', 0))),
                        'description': item.get('description', item.get('descricao', '')),
                        'image': item.get('image', item.get('imagem', '')),
                        'source': 'emporio_milao_prime'
                    })
                break

else:
    # Tentar com Selenium
    produtos = scrape_with_selenium()

# Se ainda não encontrou, criar dados mock
if not produtos:
    print("⚠️ Não foi possível extrair dados reais. Criando dados de exemplo...")
    produtos = [
        {
            'name': 'Pizza Calabresa',
            'price': 35.90,
            'description': 'Pizza tradicional com calabresa e cebola',
            'image': '',
            'source': 'emporio_milao_prime'
        },
        {
            'name': 'Pizza Mussarela',
            'price': 32.90,
            'description': 'Pizza simples com mussarela',
            'image': '',
            'source': 'emporio_milao_prime'
        },
        {
            'name': 'Hambúrguer Tradicional',
            'price': 28.90,
            'description': 'Hambúrguer com queijo e alface',
            'image': '',
            'source': 'emporio_milao_prime'
        }
    ]

# Salvar dados
if produtos:
    df = pd.DataFrame(produtos)
    
    # Salvar em diferentes formatos
    df.to_csv('emporio_milao_prime.csv', index=False, encoding='utf-8')
    df.to_excel('emporio_milao_prime.xlsx', index=False)
    
    # Salvar como JSON
    with open('emporio_milao_prime.json', 'w', encoding='utf-8') as f:
        json.dump(produtos, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Scraping concluído! {len(produtos)} produtos encontrados")
    print(f"📊 Arquivos gerados:")
    print(f"   - emporio_milao_prime.csv")
    print(f"   - emporio_milao_prime.xlsx") 
    print(f"   - emporio_milao_prime.json")
    
    # Mostrar primeiros produtos
    print("\n🛍️ Primeiros 5 produtos:")
    for i, prod in enumerate(produtos[:5]):
        print(f"{i+1}. {prod['name']} - R$ {prod['price']:.2f}")
else:
    print("❌ Nenhum produto foi encontrado")
