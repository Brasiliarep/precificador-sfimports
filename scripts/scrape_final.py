from playwright.sync_api import sync_playwright
import pandas as pd
import re
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto("https://emporiomilaoprime.meucardapio.ai/")
    
    # Scroll lento 30x
    for i in range(30):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2)
        print(f"Scroll {i+1}")
    
    # INSPECIONA TODOS elementos com texto
    elements = page.query_selector_all("*")
    data = []
    
    for el in elements:
        text = el.inner_text()
        if 'R$' in text and len(text) < 200:
            nome = re.search(r'^([A-Z\s]+?)(?=\s-R\$)', text)
            preco = re.search(r'R\$\s*([\d,]+)', text)
            if nome and preco:
                data.append({
                    'name': nome.group(1).strip(),
                    'price': preco.group(0),
                    'preco_por': preco.group(1).replace(',','.'),
                    'text': text[:100]
                })
    
    df = pd.DataFrame(data).drop_duplicates('name')
    df.to_csv('milao_final_real.csv', index=False)
    print(f"✅ {len(df)} PRODUTOS REAIS milao_final_real.csv")
    browser.close()
