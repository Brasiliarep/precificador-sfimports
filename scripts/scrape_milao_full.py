from selenium import webdriver
from selenium.webdriver.common.by import By
import pandas as pd
import time

driver = webdriver.Chrome()
driver.get("https://emporiomilaoprime.meucardapio.ai/")
time.sleep(5)

# SCROLL INFINITO 10x
for i in range(10):
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(3)

produtos = driver.find_elements(By.CSS_SELECTOR, ".produto, [class*='product'], .item")
print(f"✅ {len(produtos)} produtos encontrados!")

data = []
for p in produtos:
    try:
        nome = p.find_element(By.TAG_NAME, "h3").text
        preco = p.find_element(By.CSS_SELECTOR, "[class*='price']").text
        data.append({"name": nome, "price": preco})
    except:
        pass

pd.DataFrame(data).to_excel("milao_885_completo.xlsx", index=False)
print("✅ milao_885_completo.xlsx salvo!")
driver.quit()
