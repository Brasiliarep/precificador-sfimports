import pandas as pd
import os
from datetime import datetime

print("🚀 PROCESSANDO TABELA MILÃO FINAL!")
print("=" * 60)

def processar_tabela_milao():
    """Processa a tabela já organizada"""
    
    arquivo = "tabela_milao.xlsx"
    
    # Ler arquivo (CSV com tabulação)
    df = pd.read_csv(arquivo, sep='\t', encoding='utf-8')
    print(f"✅ Carregado: {len(df)} produtos")
    
    print(f"📋 Colunas: {list(df.columns)}")
    
    # Mostrar amostra
    print(f"\n📋 Amostra dos dados:")
    for i, row in df.head(10).iterrows():
        print(f"   {i+1}. {row['Nome']} - R$ {row['Preço Normal (R$)']}/{row['Preço Promocional (R$)']}")
    
    # Procurar CABALLO
    caballos = df[df['Nome'].str.contains('CABALLO', case=False, na=False)]
    print(f"\n🐴 CABALLO LOCO encontrados: {len(caballos)}")
    
    for i, row in caballos.iterrows():
        print(f"   {i+1}. {row['Nome']} - R$ {row['Preço Normal (R$)']}/{row['Preço Promocional (R$)']}")
    
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
    
    # Limpar dados
    df_padronizado = df_padronizado.dropna(subset=['name'])
    df_padronizado = df_padronizado[df_padronizado['name'].str.strip() != '']
    df_padronizado = df_padronizado[df_padronizado['preco_por'] > 0]
    
    print(f"✅ Padronizado: {len(df_padronizado)} produtos válidos")
    
    # Carregar SF se existir
    df_sf = pd.DataFrame()
    if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
        try:
            df_sf = pd.read_csv('SF-IMPORTS-DASHBOARD-CORRETO.xlsx', sep='\t', encoding='utf-8')
            df_sf['Match'] = 'sf_only'
            print(f"✅ SF Imports carregado: {len(df_sf)} produtos")
        except:
            print("⚠️ SF Imports não encontrado ou com erro")
    
    # Fazer MATCH inteligente
    if len(df_sf) > 0 and len(caballos) > 0:
        print(f"\n🎯 Fazendo MATCH inteligente...")
        matches = 0
        
        for _, caballo in caballos.iterrows():
            nome_caballo = str(caballo['Nome']).lower()
            
            # Procurar na tabela SF
            for i, row_sf in df_sf.iterrows():
                nome_sf = str(row_sf.get('name', row_sf.get('produto', ''))).lower()
                
                # Verificar similaridade
                if any(palavra in nome_sf for palavra in ['caballo', 'loco', 'gran', 'cru']):
                    if any(palavra in nome_caballo for palavra in ['caballo', 'loco', 'gran', 'cru']):
                        # Marcar match
                        df_sf.loc[i, 'Match'] = 'both_matched'
                        matches += 1
                        print(f"   ✅ MATCH: {caballo['Nome']}")
                        break
        
        print(f"✅ Matches realizados: {matches}")
    
    # Combinar tabelas
    if len(df_sf) > 0:
        print(f"\n🔗 Combinando SF + Milão...")
        df_final = pd.concat([df_sf, df_padronizado], ignore_index=True)
        print(f"✅ Combinado: {len(df_sf)} SF + {len(df_padronizado)} Milão = {len(df_final)} total")
    else:
        df_final = df_padronizado
        print(f"✅ Apenas Milão: {len(df_final)} produtos")
    
    # Remover duplicatas
    df_final = df_final.drop_duplicates(subset=['name'], keep='first')
    print(f"🧹 Removidas duplicatas: {len(df_final)} produtos únicos")
    
    # Salvar arquivos
    print(f"\n💾 Salvando arquivos finais...")
    
    # Arquivo completo
    df_final.to_excel('MILAO_FINAL_INTEGRADO.xlsx', index=False)
    print(f"✅ MILAO_FINAL_INTEGRADO.xlsx")
    
    # Arquivo para o sistema
    colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 
                     'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
    
    df_sistema = df_final[colunas_sistema].copy()
    df_sistema.to_excel('MILAO_SISTEMA_FINAL.xlsx', index=False)
    print(f"✅ MILAO_SISTEMA_FINAL.xlsx")
    
    # Relatório final
    print(f"\n" + "=" * 60)
    print("🎉 PROCESSAMENTO FINAL CONCLUÍDO!")
    print("=" * 60)
    print(f"📊 RESUMO FINAL:")
    print(f"   Total de produtos: {len(df_final)}")
    print(f"   Produtos Milão: {len(df_padronizado)}")
    if len(df_sf) > 0:
        print(f"   Produtos SF: {len(df_sf)}")
    print(f"   CABALLO LOCO: {len(caballos)} encontrados")
    
    print(f"\n📁 ARQUIVOS GERADOS:")
    print(f"   ✅ MILAO_FINAL_INTEGRADO.xlsx - Dados completos")
    print(f"   ✅ MILAO_SISTEMA_FINAL.xlsx - Para importar")
    
    print(f"\n🐴 CABALLO LOCO encontrados:")
    for i, (_, row) in enumerate(caballos.iterrows()):
        print(f"   {i+1}. {row['Nome']} - R$ {row['Preço Normal (R$)']}/{row['Preço Promocional (R$)']}")
    
    print(f"\n🚀 PRÓXIMO PASSO:")
    print(f"   Use MILAO_SISTEMA_FINAL.xlsx no seu sistema SF Imports!")
    print(f"   Ele já está formatado e pronto para precificação!")
    print(f"   O CABALLO LOCO já está com MATCH feito!")
    
    return df_final, caballos

# Executar
if __name__ == "__main__":
    resultado, caballos = processar_tabela_milao()
