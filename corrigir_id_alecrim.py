import pandas as pd

# Ler planilha
df = pd.read_excel('SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')

print('🔍 CORRIGINDO ID DO VINHO TINTO ALECRIM')
print()

# Encontrar VINHO TINTO ALECRIM
alecrim_mask = df['Produto'].str.contains('ALECRIM', case=False, na=False)
alecrim_row = df[alecrim_mask]

if not alecrim_row.empty:
    idx = alecrim_row.index[0]
    id_atual = df.loc[idx, 'ID']
    nome_atual = df.loc[idx, 'Produto']
    
    print(f'📍 PRODUTO ENCONTRADO:')
    print(f'   Nome: {nome_atual}')
    print(f'   ID atual: {id_atual}')
    print()
    
    # IDs disponíveis no WooCommerce
    print('📋 IDs DISPONÍVEIS NO WOOCOMMERCE:')
    print('   1. ID 12015 - VINHO TINTO ALECRIM (com imagem) - R$ 29,90')
    print('   2. ID 19095 - VINHO TINTO ALECRIM (sem imagem) - R$ 36,65')
    print('   3. ID 18191 - VINHO TINTO ALECRIM (sem imagem) - R$ 36,65')
    print()
    
    # Usar o ID com imagem (recomendado)
    id_recomendado = 12015
    df.loc[idx, 'ID'] = id_recomendado
    
    print(f'✅ ID ATUALIZADO:')
    print(f'   Novo ID: {id_recomendado}')
    print(f'   Produto: {nome_atual}')
    print()
    
    # Salvar planilha corrigida
    df.to_excel('SF_MILAO_DEFINITIVO_CORRIGIDO_ID.xlsx', index=False)
    print('📁 Planilha salva como: SF_MILAO_DEFINITIVO_CORRIGIDO_ID.xlsx')
    print()
    print('🎯 PRÓXIMOS PASSOS:')
    print('1. Carregue esta nova planilha no SF Imports')
    print('2. Gere o CSV WooCommerce')
    print('3. Importe no WooCommerce')
    print('4. Apenas o produto com imagem será atualizado!')
    
else:
    print('❌ VINHO TINTO ALECRIM não encontrado na planilha')
