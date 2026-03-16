import pandas as pd
import os

print("🔍 VERIFICANDO INTEGRAÇÃO SF + MILÃO")
print("=" * 50)

# Ler tabela SF
df_sf = pd.DataFrame()
arquivos_sf = [f for f in os.listdir('.') if 'SF' in f.upper() and f.endswith('.xlsx')]

if arquivos_sf:
    print(f"📁 Arquivos SF encontrados: {arquivos_sf}")
    arquivo_sf = arquivos_sf[-1]  # Usar o mais recente
    print(f"📋 Usando: {arquivo_sf}")
    
    try:
        df_sf = pd.read_excel(arquivo_sf, engine='openpyxl')
        print(f"✅ SF carregado: {len(df_sf)} produtos")
        print(f"📋 Colunas SF: {list(df_sf.columns)}")
    except Exception as e:
        print(f"❌ Erro ao ler SF: {e}")
else:
    print("❌ Nenhum arquivo SF encontrado")

# Ler tabela Milão final
df_milao = pd.DataFrame()
if os.path.exists('MILAO_SISTEMA_FINAL.xlsx'):
    try:
        df_milao = pd.read_excel('MILAO_SISTEMA_FINAL.xlsx', engine='openpyxl')
        print(f"✅ Milão carregado: {len(df_milao)} produtos")
        print(f"📋 Colunas Milão: {list(df_milao.columns)}")
    except Exception as e:
        print(f"❌ Erro ao ler Milão: {e}")

if len(df_sf) > 0 and len(df_milao) > 0:
    print("\n🎯 VERIFICANDO PRODUTOS EM COMUM:")
    
    # Procurar CABALLO LOCO em ambas
    caballos_sf = df_sf[df_sf['name'].str.contains('CABALLO', case=False, na=False)]
    caballos_milao = df_milao[df_milao['name'].str.contains('CABALLO', case=False, na=False)]
    
    print(f"🐴 CABALLO LOCO na SF: {len(caballos_sf)}")
    print(f"🐴 CABALLO LOCO na Milão: {len(caballos_milao)}")
    
    # Comparar nomes similares
    print("\n🔍 COMPARAÇÃO DE NOMES:")
    produtos_comuns = 0
    
    for _, milao_row in df_milao.iterrows():
        nome_milao = str(milao_row['name']).lower()
        
        for _, sf_row in df_sf.iterrows():
            nome_sf = str(sf_row['name']).lower()
            
            # Verificar similaridade
            if 'caballo' in nome_milao and 'caballo' in nome_sf:
                if any(palavra in nome_sf for palavra in nome_milao.split() if len(palavra) > 3):
                    produtos_comuns += 1
                    print(f"   ✅ MATCH: {milao_row['name']}")
                    print(f"      SF: {sf_row['name']}")
                    break
    
    print(f"\n📊 PRODUTOS EM COMUM: {produtos_comuns}")
    
    # Fazer integração completa
    print("\n🔗 FAZENDO INTEGRAÇÃO COMPLETA...")
    
    # Marcar produtos Milão
    df_milao['source'] = 'milao'
    
    # Marcar produtos SF
    df_sf['source'] = 'sf'
    
    # Combinar
    df_integrado = pd.concat([df_sf, df_milao], ignore_index=True)
    print(f"✅ Combinado: {len(df_sf)} SF + {len(df_milao)} Milão = {len(df_integrado)} total")
    
    # Remover duplicatas por nome
    df_final = df_integrado.drop_duplicates(subset=['name'], keep='first')
    print(f"🧹 Removidas duplicatas: {len(df_final)} produtos únicos")
    
    # Salvar integração final
    df_final.to_excel('SF_MILAO_INTEGRADO_FINAL.xlsx', index=False)
    print(f"✅ Salvo: SF_MILAO_INTEGRADO_FINAL.xlsx")
    
    # Salvar versão para sistema
    colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
    df_sistema = df_final[colunas_sistema]
    df_sistema.to_excel('SF_MILAO_SISTEMA_FINAL.xlsx', index=False)
    print(f"✅ Salvo: SF_MILAO_SISTEMA_FINAL.xlsx")
    
else:
    print("❌ Não foi possível fazer integração")
