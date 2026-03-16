import pandas as pd
from difflib import SequenceMatcher

# Ler ambos os arquivos
df_planilha = pd.read_excel('SF_MILAO_DEFINITIVO_CORRIGIDO.xlsx')
df_woo = pd.read_csv('wc-product-export-19-2-2026-1771549530495.csv')

print('🔍 MAPEAMENTO COMPLETO PLANILHA × WOOCOMMERCE')
print('=' * 60)
print()

print(f'📊 ESTATÍSTICAS:')
print(f'   Planilha: {len(df_planilha)} produtos')
print(f'   WooCommerce: {len(df_woo)} produtos')
print()

# Função para similaridade de strings
def similaridade(a, b):
    return SequenceMatcher(None, str(a).upper(), str(b).upper()).ratio()

# Mapear produtos por similaridade de nome
mapeamentos = []
produtos_sem_match = []

print('🔍 MAPEANDO PRODUTOS...')
print()

for idx_plan, row_plan in df_planilha.iterrows():
    nome_plan = str(row_plan['Produto']).strip()
    id_plan = row_plan['ID']
    
    melhor_match = None
    melhor_score = 0
    melhor_id_woo = None
    
    for idx_woo, row_woo in df_woo.iterrows():
        nome_woo = str(row_woo['Nome']).strip()
        id_woo = row_woo['ID']
        
        # Calcular similaridade
        score = similaridade(nome_plan, nome_woo)
        
        # Se similaridade > 80%, considerar match
        if score > 0.8 and score > melhor_score:
            melhor_score = score
            melhor_match = nome_woo
            melhor_id_woo = id_woo
    
    if melhor_match:
        mapeamentos.append({
            'id_planilha': id_plan,
            'produto_planilha': nome_plan,
            'id_woo': melhor_id_woo,
            'produto_woo': melhor_match,
            'similaridade': melhor_score
        })
    else:
        produtos_sem_match.append({
            'id_planilha': id_plan,
            'produto_planilha': nome_plan
        })

# Mostrar resultados
print(f'✅ Produtos mapeados: {len(mapeamentos)}')
print(f'❌ Produtos sem match: {len(produtos_sem_match)}')
print()

# Mostrar exemplos de mapeamentos
print('🔍 EXEMPLOS DE MAPEAMENTOS:')
print('ID Plan | ID Woo | Similaridade | Produto Planilha → Produto Woo')
print('-' * 80)

for i, map in enumerate(mapeamentos[:10]):
    id_plan = map['id_planilha']
    id_woo = map['id_woo']
    score = map['similaridade']
    plan = map['produto_planilha'][:30]
    woo = map['produto_woo'][:30]
    print(f'{id_plan:8} | {id_woo:6} | {score:10.2%} | {plan} → {woo}')

if len(mapeamentos) > 10:
    print(f'... e mais {len(mapeamentos) - 10} mapeamentos')

print()

# Verificar produtos ALECRIM especificamente
print('🔍 ANÁLISE ESPECÍFICA - ALECRIM:')
alecrim_mapeados = [m for m in mapeamentos if 'ALECRIM' in m['produto_planilha'].upper()]
if alecrim_mapeados:
    for map in alecrim_mapeados:
        print(f"   Planilha ID {map['id_planilha']}: {map['produto_planilha']}")
        print(f"   → Woo ID {map['id_woo']}: {map['produto_woo']} ({map['similaridade']:.1%} similaridade)")
else:
    print('   Nenhum ALECRIM mapeado automaticamente')

print()

# Salvar mapeamentos
df_mapeamentos = pd.DataFrame(mapeamentos)
df_mapeamentos.to_csv('mapeamento_planilha_woo.csv', index=False)

df_sem_match = pd.DataFrame(produtos_sem_match)
df_sem_match.to_csv('produtos_sem_match.csv', index=False)

print('📁 Arquivos gerados:')
print('   mapeamento_planilha_woo.csv - Produtos mapeados')
print('   produtos_sem_match.csv - Produtos sem correspondência')

print()
print('🎯 PRÓXIMOS PASSOS:')
print('1. Analisar mapeamento_planilha_woo.csv')
print('2. Verificar produtos sem_match.csv')
print('3. Atualizar IDs na planilha original')
print('4. Importar CSV corrigido')
