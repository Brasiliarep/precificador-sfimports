import pandas as pd

# Verificar arquivo de exportação do WooCommerce
try:
    df_woo = pd.read_csv('wc-product-export-19-2-2026-1771549530495.csv')
    print('🔍 EXPORTAÇÃO WOOCOMMERCE ENCONTRADA')
    print('=' * 50)
    print(f'📋 Total de produtos no WooCommerce: {len(df_woo)}')
    print()
    
    # Verificar colunas importantes
    print('📊 Colunas disponíveis:')
    for i, col in enumerate(df_woo.columns[:10]):  # Mostrar primeiras 10 colunas
        print(f'   {i+1:2d}. {col}')
    print('   ... (mais colunas)')
    print()
    
    # Procurar por produtos ALECRIM
    if 'Name' in df_woo.columns:
        alecrim_woo = df_woo[df_woo['Name'].str.contains('ALECRIM', case=False, na=False)]
        print('🔍 PRODUTOS ALECRIM NO WOOCOMMERCE:')
        if not alecrim_woo.empty:
            for idx, row in alecrim_woo.iterrows():
                id_val = row.get('ID', 'N/A')
                name = row.get('Name', 'N/A')
                price = row.get('Price', 'N/A')
                print(f'   ID {id_val}: {name} - R$ {price}')
        else:
            print('   Nenhum produto ALECRIM encontrado')
    
    # Salvar lista simplificada para comparação
    if 'ID' in df_woo.columns and 'Name' in df_woo.columns:
        df_woo_simples = df_woo[['ID', 'Name']].copy()
        df_woo_simples.to_csv('produtos_woocommerce.csv', index=False)
        print()
        print('📁 Lista WooCommerce salva: produtos_woocommerce.csv')
    
except FileNotFoundError:
    print('❌ Arquivo de exportação WooCommerce não encontrado')
    print('📋 É necessário exportar produtos do WooCommerce primeiro')
    print('🔧 Como exportar:')
    print('   1. Acesse WordPress → WooCommerce')
    print('   2. Vá para Produtos → Todos os produtos')
    print('   3. Clique em "Exportar" ou use plugin de exportação')
    print('   4. Salve como CSV na pasta do projeto')

except Exception as e:
    print(f'❌ Erro ao ler arquivo: {e}')
