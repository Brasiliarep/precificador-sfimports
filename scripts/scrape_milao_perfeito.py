from selenium import webdriver
from selenium.webdriver.common.by import By
import pandas as pd
import time

driver = webdriver.Chrome()
driver.get("https://emporiomilaoprime.meucardapio.ai/")
print("⏳ Carregando lento...")

# SCROLL LENTO 20x (3s cada)
for i in range(20):
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
    time.sleep(3)
    print(f"Scroll {i+1}/20")

produtos = driver.find_elements(By.CSS_SELECTOR, ".produto, .product-item, .card, [class*='item']")
print(f"📦 {len(produtos)} itens")

data = []
for p in produtos[:100]:  # TOP 100
    try:
        nome = p.find_element(By.TAG_NAME, "h3").text or p.text.split('\n')[0]
        preco_elem = p.find_elements(By.CSS_SELECTOR, ".price, [class*='price'], .valor")
        preco = preco_elem[0].text if preco_elem else ''
        if 'R$' in preco:
            data.append([nome, preco, p.text[:200], ''])
    except:
        pass

pd.DataFrame(data, columns=['name','price','desc','image']).to_csv('milao_real_100.csv', index=False)
print(f"✅ {len(data)} salvos milao_real_100.csv")
driver.quit()
