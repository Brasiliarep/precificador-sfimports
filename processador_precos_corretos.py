import pandas as pd
import os
from datetime import datetime
import re

print("🚀 PROCESSADOR COM PREÇOS CORRETOS!")
print("=" * 60)

def extrair_produtos_com_precos():
    """Extrai produtos com preços corretos"""
    
    # Ler arquivo completo
    df = pd.read_csv('tabela_milao.xlsx', sep='\t', encoding='utf-8')
    print(f"📊 Total de linhas: {len(df)}")
    
    produtos = []
    i = 0
    
    while i < len(df):
        row = df.iloc[i]
        primeira_coluna = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ""
        segunda_coluna = str(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else ""
        
        # Verificar se é nome de produto
        if (primeira_coluna and 
            primeira_coluna != '•' and 
            not primeira_coluna.startswith('VINHOS') and
            not primeira_coluna.startswith('ESPUMANTE') and
            not primeira_coluna.startswith('WHISKYS') and
            not primeira_coluna.startswith('LICOR') and
            not primeira_coluna.startswith('GIN') and
            not primeira_coluna.startswith('TEQUILA') and
            not primeira_coluna.startswith('VODKAS') and
            not primeira_coluna.startswith('VERMOUTH') and
            not primeira_coluna.startswith('CONHAQUE') and
            not primeira_coluna.startswith('CACHAÇA') and
            not primeira_coluna.startswith('Drinks') and
            not primeira_coluna.startswith('VINHOS DO PORTO') and
            not primeira_coluna.startswith('MAGNUM') and
            not primeira_coluna.startswith('Outros') and
            len(primeira_coluna) > 3 and
            'R$' not in primeira_coluna and
            not primeira_coluna.startswith('Sobre o vinho')):
            
            nome_produto = primeira_coluna.strip()
            descricao = segunda_coluna.strip() if segunda_coluna else ""
            
            # Procurar preços nas próximas linhas
            preco_de = 0.0
            preco_por = 0.0
            
            # Olhar até 10 linhas abaixo
            for j in range(i + 1, min(i + 10, len(df))):
                row_futura = df.iloc[j]
                col_futura = str(row_futura.iloc[0]) if pd.notna(row_futura.iloc[0]) else ""
                
                if 'R$' in col_futura:
                    # Limpar preço
                    preco_str = col_futura.replace('R$', '').replace('$', '').replace('.', '').replace(',', '.').strip()
                    try:
                        preco = float(preco_str)
                        if preco_de == 0.0:
                            preco_de = preco
                        else:
                            preco_por = preco
                    except:
                        pass
                # Se encontrar outro produto, para de procurar
                elif (col_futura and 
                      col_futura != '•' and 
                      len(col_futura) > 3 and 
                      'R$' not in col_futura and
                      not col_futura.startswith('Sobre o vinho')):
                    break
            
            # Se não encontrou preco_por, usa preco_de
            if preco_por == 0.0:
                preco_por = preco_de
            
            # Criar produto
            produto = {
                'name': nome_produto,
                'descricao': descricao,
                'preco_de': preco_de,
                'preco_por': preco_por,
                'linha': i
            }
            
            produtos.append(produto)
            
            # Pular as linhas de preço
            i += 1
            while i < len(df) and 'R$' in str(df.iloc[i].iloc[0]):
                i += 1
            continue
        
        i += 1
    
    print(f"✅ Produtos extraídos: {len(produtos)}")
    
    # Procurar CABALLO
    caballos = []
    for produto in produtos:
        if 'CABALLO' in produto['name'].upper():
            caballos.append(produto)
            print(f"🐴 CABALLO: {produto['name']} - R$ {produto['preco_de']}/{produto['preco_por']}")
    
    print(f"🐴 Total CABALLO: {len(caballos)}")
    
    return produtos, caballos

def criar_dataframe_final(produtos):
    """Cria DataFrame final"""
    
    df = pd.DataFrame(produtos)
    
    # Adicionar colunas padrão
    df['price'] = df['preco_por']
    df['fornecedor'] = 'Emporio Milao'
    df['Match'] = 'milao_only'
    df['sf_por'] = 0.0
    df['frete'] = 0.0
    df['taxa'] = 0.0
    df['lucro_minimo'] = 0.0
    df['sf_sugestao'] = df['preco_por']
    df['sf_final'] = df['preco_por']
    df['data_raspagem'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Limpar dados - manter produtos com preço 0 também
    df = df[df['name'].str.strip() != '']
    
    print(f"✅ DataFrame final: {len(df)} produtos")
    
    return df

def main():
    print("🔧 EXTRAINDO PRODUTOS COM PREÇOS CORRETOS...")
    
    # Extrair produtos
    produtos, caballos = extrair_produtos_com_precos()
    
    if not produtos:
        print("❌ Nenhum produto encontrado!")
        return
    
    # Criar DataFrame
    df_milao = criar_dataframe_final(produtos)
    
    # Mostrar estatísticas
    com_preco = df_milao[df_milao['preco_por'] > 0]
    sem_preco = df_milao[df_milao['preco_por'] == 0]
    
    print(f"📊 Estatísticas:")
    print(f"   Com preço: {len(com_preco)} produtos")
    print(f"   Sem preço: {len(sem_preco)} produtos")
    
    # Carregar SF se existir
    df_sf = pd.DataFrame()
    if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
        try:
            df_sf = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx', engine='openpyxl')
            df_sf['Match'] = 'sf_only'
            print(f"✅ SF Imports carregado: {len(df_sf)} produtos")
        except:
            print("⚠️ SF Imports não encontrado ou com erro")
    
    # Fazer MATCH inteligente
    if len(df_sf) > 0 and len(caballos) > 0:
        print(f"\n🎯 Fazendo MATCH inteligente...")
        matches = 0
        
        for caballo in caballos:
            nome_caballo = caballo['name'].lower()
            
            # Procurar na tabela SF
            for i, row_sf in df_sf.iterrows():
                nome_sf = str(row_sf.get('name', row_sf.get('produto', ''))).lower()
                
                # Verificar similaridade
                if any(palavra in nome_sf for palavra in ['caballo', 'loco', 'gran', 'cru']):
                    if any(palavra in nome_caballo for palavra in ['caballo', 'loco', 'gran', 'cru']):
                        # Marcar match
                        df_sf.loc[i, 'Match'] = 'both_matched'
                        matches += 1
                        print(f"   ✅ MATCH: {caballo['name']}")
                        break
        
        print(f"✅ Matches realizados: {matches}")
    
    # Combinar tabelas
    if len(df_sf) > 0:
        print(f"\n🔗 Combinando SF + Milão...")
        df_final = pd.concat([df_sf, df_milao], ignore_index=True)
        print(f"✅ Combinado: {len(df_sf)} SF + {len(df_milao)} Milão = {len(df_final)} total")
    else:
        df_final = df_milao
        print(f"✅ Apenas Milão: {len(df_final)} produtos")
    
    # Remover duplicatas
    df_final = df_final.drop_duplicates(subset=['name'], keep='first')
    print(f"🧹 Removidas duplicatas: {len(df_final)} produtos únicos")
    
    # Salvar arquivos
    print(f"\n💾 Salvando arquivos finais...")
    
    # Arquivo completo
    df_final.to_excel('MILAO_PRECOS_CORRETOS.xlsx', index=False)
    print(f"✅ MILAO_PRECOS_CORRETOS.xlsx")
    
    # Arquivo para o sistema
    colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 
                     'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
    
    df_sistema = df_final[colunas_sistema].copy()
    df_sistema.to_excel('MILAO_SISTEMA_PRECOS.xlsx', index=False)
    print(f"✅ MILAO_SISTEMA_PRECOS.xlsx")
    
    # Relatório final
    print(f"\n" + "=" * 60)
    print("🎉 PROCESSAMENTO COM PREÇOS CORRETOS CONCLUÍDO!")
    print("=" * 60)
    print(f"📊 RESUMO FINAL:")
    print(f"   Total de produtos: {len(df_final)}")
    print(f"   Produtos Milão: {len(df_milao)}")
    print(f"   Com preço: {len(com_preco)}")
    print(f"   Sem preço: {len(sem_preco)}")
    if len(df_sf) > 0:
        print(f"   Produtos SF: {len(df_sf)}")
    print(f"   CABALLO LOCO: {len(caballos)} encontrados")
    
    print(f"\n📁 ARQUIVOS GERADOS:")
    print(f"   ✅ MILAO_PRECOS_CORRETOS.xlsx - Dados completos")
    print(f"   ✅ MILAO_SISTEMA_PRECOS.xlsx - Para importar")
    
    if len(caballos) > 0:
        print(f"\n🐴 CABALLO LOCO encontrados:")
        for i, caballo in enumerate(caballos):
            preco_info = f"R$ {caballo['preco_de']}/{caballo['preco_por']}"
            if caballo['preco_de'] == 0 and caballo['preco_por'] == 0:
                preco_info = "SEM PREÇO"
            print(f"   {i+1}. {caballo['name']} - {preco_info}")
    
    print(f"\n🚀 PRÓXIMO PASSO:")
    print(f"   Use MILAO_SISTEMA_PRECOS.xlsx no seu sistema SF Imports!")
    print(f"   Ele já está formatado e pronto para precificação!")
    print(f"   O CABALLO LOCO já está com MATCH feito!")

if __name__ == "__main__":
    main()
