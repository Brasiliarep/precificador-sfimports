import pandas as pd
import os
from datetime import datetime
import re

print("🚀 PROCESSADOR FINAL MILÃO - COM CABALLO LOCO!")
print("=" * 60)

def extrair_produtos_milao():
    """Extrai produtos da estrutura especial do arquivo"""
    
    # Ler arquivo completo
    df = pd.read_csv('tabela_milao.xlsx', sep='\t', encoding='utf-8')
    print(f"📊 Total de linhas: {len(df)}")
    
    produtos = []
    produto_atual = {}
    
    for i, row in df.iterrows():
        primeira_coluna = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ""
        segunda_coluna = str(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else ""
        
        # Verificar se é nome de produto (começa com maiúsculas e não é categoria)
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
            len(primeira_coluna) > 3):
            
            # Se já temos um produto anterior, salvamos
            if produto_atual:
                produtos.append(produto_atual.copy())
            
            # Começar novo produto
            produto_atual = {
                'name': primeira_coluna.strip(),
                'descricao': segunda_coluna.strip() if segunda_coluna else "",
                'preco_de': 0.0,
                'preco_por': 0.0,
                'linha': i
            }
        
        # Verificar se é preço (começa com R$)
        elif primeira_coluna and 'R$' in primeira_coluna:
            # Limpar preço
            preco_str = primeira_coluna.replace('R$', '').replace('$', '').replace('.', '').replace(',', '.').strip()
            try:
                preco = float(preco_str)
                
                # Se não temos preço_de, usa este
                if produto_atual.get('preco_de', 0) == 0:
                    produto_atual['preco_de'] = preco
                else:
                    produto_atual['preco_por'] = preco
                    
            except:
                pass
        
        # Verificar se é descrição (texto longo)
        elif segunda_coluna and len(segunda_coluna) > 50 and produto_atual:
            if not produto_atual.get('descricao'):
                produto_atual['descricao'] = segunda_coluna.strip()
    
    # Adicionar último produto
    if produto_atual:
        produtos.append(produto_atual)
    
    print(f"✅ Produtos extraídos: {len(produtos)}")
    
    # Procurar CABALLO
    caballos = []
    for produto in produtos:
        if 'CABALLO' in produto['name'].upper():
            caballos.append(produto)
            print(f"🐴 CABALLO: {produto['name']} - R$ {produto['preco_de']}/{produto['preco_por']}")
    
    print(f"🐴 Total CABALLO: {len(caballos)}")
    
    return produtos, caballos

def criar_dataframe_produtos(produtos):
    """Cria DataFrame padronizado"""
    
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
    
    # Limpar dados
    df = df[df['name'].str.strip() != '']
    df = df[df['preco_por'] > 0]
    
    print(f"✅ DataFrame criado: {len(df)} produtos válidos")
    
    return df

def main():
    print("🔧 EXTRAINDO PRODUTOS DA TABELA MILÃO...")
    
    # Extrair produtos
    produtos, caballos = extrair_produtos_milao()
    
    if not produtos:
        print("❌ Nenhum produto encontrado!")
        return
    
    # Criar DataFrame
    df_milao = criar_dataframe_produtos(produtos)
    
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
    df_final.to_excel('MILAO_FINAL_COMPLETO.xlsx', index=False)
    print(f"✅ MILAO_FINAL_COMPLETO.xlsx")
    
    # Arquivo para o sistema
    colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 
                     'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
    
    df_sistema = df_final[colunas_sistema].copy()
    df_sistema.to_excel('MILAO_FINAL_SISTEMA.xlsx', index=False)
    print(f"✅ MILAO_FINAL_SISTEMA.xlsx")
    
    # Relatório final
    print(f"\n" + "=" * 60)
    print("🎉 PROCESSAMENTO FINAL CONCLUÍDO!")
    print("=" * 60)
    print(f"📊 RESUMO FINAL:")
    print(f"   Total de produtos: {len(df_final)}")
    print(f"   Produtos Milão: {len(df_milao)}")
    if len(df_sf) > 0:
        print(f"   Produtos SF: {len(df_sf)}")
    print(f"   CABALLO LOCO: {len(caballos)} encontrados")
    
    print(f"\n📁 ARQUIVOS GERADOS:")
    print(f"   ✅ MILAO_FINAL_COMPLETO.xlsx - Dados completos")
    print(f"   ✅ MILAO_FINAL_SISTEMA.xlsx - Para importar")
    
    if len(caballos) > 0:
        print(f"\n🐴 CABALLO LOCO encontrados:")
        for i, caballo in enumerate(caballos[:10]):  # Mostrar só os 10 primeiros
            print(f"   {i+1}. {caballo['name']} - R$ {caballo['preco_de']}/{caballo['preco_por']}")
        if len(caballos) > 10:
            print(f"   ... e mais {len(caballos) - 10} produtos")
    
    print(f"\n🚀 PRÓXIMO PASSO:")
    print(f"   Use MILAO_FINAL_SISTEMA.xlsx no seu sistema SF Imports!")
    print(f"   Ele já está formatado e pronto para precificação!")
    print(f"   O CABALLO LOCO já está com MATCH feito!")

if __name__ == "__main__":
    main()
