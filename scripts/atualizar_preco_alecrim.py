import pandas as pd

# Ler planilha
try:
    df = pd.read_excel('sf_milao_final_vinculacao.xlsx')
    print('📊 Planilha carregada: sf_milao_final_vinculacao.xlsx')
except:
    try:
        df = pd.read_excel('SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')
        print('📊 Planilha carregada: SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')
    except:
        print('❌ Nenhuma planilha encontrada!')
        exit()

print('\n🔍 ATUALIZANDO PREÇO DO VINHO TINTO ALECRIM')
print()

# Encontrar VINHO TINTO ALECRIM
alecrim_mask = df['Produto'].str.contains('ALECRIM', case=False, na=False)
alecrim_row = df[alecrim_mask]

if not alecrim_row.empty:
    idx = alecrim_row.index[0]
    nome_atual = df.loc[idx, 'Produto']
    sf_de_atual = df.loc[idx, 'SF de']
    sf_final_atual = df.loc[idx, 'SF por']
    
    print(f'📍 PRODUTO ENCONTRADO (linha {idx}):')
    print(f'   Nome: {nome_atual}')
    print(f'   SF De atual: R$ {sf_de_atual}')
    print(f'   SF Final atual: R$ {sf_final_atual}')
    print()
    
    # Atualizar para o preço do site (produto com imagem)
    novo_sf_de = 36.65
    novo_sf_final = 36.65  # Mantém o mesmo preço
    
    print('🔄 ATUALIZANDO PREÇOS:')
    print(f'   SF De: R$ {sf_de_atual} → R$ {novo_sf_de}')
    print(f'   SF Final: R$ {sf_final_atual} → R$ {novo_sf_final}')
    
    # Atualizar valores
    df.loc[idx, 'SF de'] = novo_sf_de
    df.loc[idx, 'SF por'] = novo_sf_final
    
    print('\n✅ PREÇOS ATUALIZADOS!')
    
    # Salvar planilha
    try:
        df.to_excel('sf_milao_final_vinculacao.xlsx', index=False)
        print('📁 Planilha salva: sf_milao_final_vinculacao.xlsx')
    except:
        df.to_excel('SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx', index=False)
        print('📁 Planilha salva: SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')
    
    print('\n🎯 PRÓXIMOS PASSOS:')
    print('1. Recarregue a planilha no sistema SF Imports')
    print('2. Clique em "📦 Up Cat" para gerar o catálogo atualizado')
    print('3. Faça upload do novo arquivo JSON')
    print('4. O preço do Alecrim será R$ 36,65 no catálogo verde')
    
else:
    print('❌ VINHO TINTO ALECRIM não encontrado na planilha')
