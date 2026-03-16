import pandas as pd
import re

print("🍷 Criando arquivo final do Milão...")

# Usar dados do scrape original que funcionou
df = pd.read_json('emporio_milao_prime.json')

# Adicionar colunas necessárias
df['preco_de'] = df['price']  # Preço de = preço por (não tem promoção)
df['preco_por'] = df['price']
df['fornecedor'] = 'Emporio Milao'

# Limpar preços para formato numérico
def limpar_preco(preco):
    if isinstance(preco, str):
        # Remover R$ e espaços, substituir vírgula por ponto
        preco_limpo = re.sub(r'[^\d,]', '', preco).replace(',', '.')
        return float(preco_limpo) if preco_limpo else 0.0
    return float(preco)

df['preco_de'] = df['preco_de'].apply(limpar_preco)
df['preco_por'] = df['preco_por'].apply(limpar_preco)
df['price'] = df['price'].apply(limpar_preco)

# Reordenar colunas
df_final = df[['name', 'preco_de', 'preco_por', 'price', 'fornecedor', 'description', 'image']]

# Salvar em múltiplos formatos
df_final.to_excel('MILAO_COMPLETO.xlsx', index=False)
df_final.to_csv('milao_completo.csv', index=False)

print(f'✅ MILAO_COMPLETO.xlsx gerado com {len(df_final)} produtos!')
print(f'✅ milao_completo.csv gerado!')
print('\n📋 Amostra dos produtos:')
print(df_final[['name', 'preco_de', 'preco_por']].head(10).to_string(index=False))

# Procurar CABALLO
caballo = df_final[df_final['name'].str.contains('CABALLO', case=False, na=False)]
if len(caballo) > 0:
    print(f'\n🐴 CABALLO LOCO encontrados: {len(caballo)}')
    for _, row in caballo.iterrows():
        print(f'   {row["name"]}: R$ {row["preco_por"]:.2f}')
else:
    print('\n⚠️ CABALLO LOCO não encontrado')

print('\n🎉 Arquivo MILAO_COMPLETO.xlsx pronto para uso!')
