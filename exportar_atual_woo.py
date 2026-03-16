import pandas as pd

print('🔍 INSTRUÇÕES PARA EXPORTAR WOOCOMMERCE ATUALIZADO')
print('=' * 60)
print()

print('📋 PROBLEMA IDENTIFICADO:')
print('   - WooCommerce criou produto novo (ID 20131)')
print('   - IDs mudaram desde última exportação')
print('   - Precisamos exportar estado atualizado')
print()

print('🔧 PASSO 1 - EXPORTAR WOOCOMMERCE ATUAL:')
print('   1. Acesse: WordPress → WooCommerce')
print('   2. Vá para: Produtos → Todos os produtos')
print('   3. Clique em: "Exportar" ou use plugin')
print('   4. Exporte TODOS os produtos como CSV')
print('   5. Salve como: wc-product-export-ATUAL.csv')
print()

print('🔧 PASSO 2 - ANALISAR ESTADO ATUAL:')
print('   - Verificar quantos ALECRIM existem agora')
print('   - Identificar IDs corretos')
print('   - Mapear com planilha')
print()

print('🔧 PASSO 3 - LIMPAR DUPLICATAS:')
print('   - Decidir qual ALECRIM manter')
print('   - Apagar os outros 3')
print('   - Deixar apenas 1 produto')
print()

print('🎯 RECOMENDAÇÃO:')
print('   MANTER: ID 12015 (com imagem)')
print('   APAGAR: IDs 19095, 18191, 20131')
print('   MOTIVO: Produto com imagem é mais completo')
print()

print('📁 QUANDO TIVER O ARQUIVO ATUALIZADO:')
print('   1. Salve como: wc-product-export-ATUAL.csv')
print('   2. Rode: python analisar_woo_atual.py')
print('   3. Siga as instruções')
print()

print('🚨 IMPORTANTE:')
print('   - Não importe nada até resolver isso')
print('   - Primeiro limpe as duplicatas')
print('   - Depois faça importação correta')
