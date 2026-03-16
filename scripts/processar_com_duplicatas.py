import pandas as pd
from datetime import datetime

print("🔄 PROCESSANDO MANTENDO DUPLICATAS")
print("=" * 50)

# Ler arquivo original
df = pd.read_csv('tabela_milao.xlsx', sep='\t', encoding='utf-8')
print(f"✅ Carregado: {len(df)} produtos")

# Procurar CABALLO
caballos = df[df['Nome'].str.contains('CABALLO', case=False, na=False)]
print(f"🐴 CABALLO LOCO encontrados: {len(caballos)}")

# Criar DataFrame padronizado
df_padronizado = pd.DataFrame()
df_padronizado['name'] = df['Nome']
df_padronizado['preco_de'] = pd.to_numeric(df['Preço Normal (R$)'].str.replace(',', '.'), errors='coerce')
df_padronizado['preco_por'] = pd.to_numeric(df['Preço Promocional (R$)'].str.replace(',', '.'), errors='coerce')
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

# Limpar dados (mas manter duplicatas)
df_padronizado = df_padronizado.dropna(subset=['name'])
df_padronizado = df_padronizado[df_padronizado['name'].str.strip() != '']
df_padronizado = df_padronizado[df_padronizado['preco_por'] > 0]

print(f"✅ Padronizado: {len(df_padronizado)} produtos")

# Salvar versão COM duplicatas
df_padronizado.to_excel('MILAO_COM_DUPLICATAS.xlsx', index=False)
print(f"✅ MILAO_COM_DUPLICATAS.xlsx - {len(df_padronizado)} produtos")

# Salvar versão SEM duplicatas para comparação
df_sem_duplicatas = df_padronizado.drop_duplicates(subset=['name'], keep='first')
df_sem_duplicatas.to_excel('MILAO_SEM_DUPLICATAS_V2.xlsx', index=False)
print(f"✅ MILAO_SEM_DUPLICATAS_V2.xlsx - {len(df_sem_duplicatas)} produtos")

print(f"\n📊 COMPARAÇÃO:")
print(f"   Com duplicatas: {len(df_padronizado)} produtos")
print(f"   Sem duplicatas: {len(df_sem_duplicatas)} produtos")
print(f"   Duplicatas removidas: {len(df_padronizado) - len(df_sem_duplicatas)}")

print(f"\n🐴 CABALLO LOCO:")
caballos_final = df_padronizado[df_padronizado['name'].str.contains('CABALLO', case=False, na=False)]
print(f"   Com duplicatas: {len(caballos_final)} produtos")
for i, row in caballos_final.iterrows():
    print(f"   {i+1}. {row['name']} - R$ {row['preco_de']}/{row['preco_por']}")

print(f"\n🎯 QUAL VERSÃO USAR?")
print(f"   ✅ Se quiser TODOS os 486 produtos: MILAO_COM_DUPLICATAS.xlsx")
print(f"   ✅ Se quiser só produtos únicos: MILAO_SEM_DUPLICATAS_V2.xlsx")
