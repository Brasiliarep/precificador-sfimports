import pandas as pd
import re

def corrigir_planilha():
    """
    Corrige a planilha sf_milao_final_vinculacao.xlsx para o formato esperado pelo sistema
    """
    
    # Ler o arquivo original (se existir)
    try:
        df = pd.read_excel('sf_milao_final_vinculacao.xlsx', engine='openpyxl')
        print(f"✅ Planilha original lida: {len(df)} linhas")
    except Exception as e:
        print(f"❌ Erro ao ler planilha original: {e}")
        print("📝 Criando planilha de exemplo...")
        
        # Criar dados de exemplo baseado na sua descrição
        dados_exemplo = [
            {
                'NOME PRODUTO': 'VINHO TINTO LA LINDA CABERNET SAUVIGNON',
                'Status': '⚠️ REVISAR',
                'Match %': 83.6,
                'Milão DE': 790,
                'Milão POR': 699.9,
                'SF DE': 299.9,
                'SF POR': 299.9,
                'Descrição': 'Vinho tinto de excelente qualidade',
                'Ação': 'Revisar manualmente',
                'Nome SF': 'VINHO TINTO LA LINDA CABERNET SAUVIGNON',
                'Nome Milão': 'VINHO TINTO GANDOLINI CABERNET SAUVIGNON'
            },
            {
                'NOME PRODUTO': 'VINHO BRANCO CHABLIS LOUIS JADOT',
                'Status': '⚠️ REVISAR',
                'Match %': 82.1,
                'Milão DE': 309.9,
                'Milão POR': 299.9,
                'SF DE': 299.9,
                'SF POR': 299.9,
                'Descrição': 'Chabils é uma ilha de vinhedos isolada',
                'Ação': 'Revisar manualmente',
                'Nome SF': 'VINHO BRANCO CHABLIS LOUIS JADOT',
                'Nome Milão': 'VINHO BRANCO CHABLIS LOUIS LATOUR'
            }
        ]
        
        df = pd.DataFrame(dados_exemplo)
    
    print(f"📊 Colunas encontradas: {list(df.columns)}")
    
    # MAPEAMENTO DAS COLUNAS - AJUSTAR PARA O FORMATO ESPERADO
    mapeamento_colunas = {
        # Colunas atuais -> Colunas esperadas pelo sistema
        'NOME PRODUTO': 'Produto',
        'Milão DE': 'Milão De',
        'Milão POR': 'Milão Por', 
        'SF DE': 'SF de',
        'SF POR': 'SF por',
        'Status': 'Status',
        'Match %': 'Match',
        'Descrição': 'Descrição',
        'Ação': 'Ação',
        'Nome SF': 'Nome SF',
        'Nome Milão': 'Nome Milão'
    }
    
    # Renomear colunas
    df_corrigido = df.rename(columns=mapeamento_colunas)
    
    # Garantir que todas as colunas esperadas existam
    colunas_esperadas = [
        'Produto', 'Milão De', 'Milão Por', 'SF de', 'SF por', 
        'Status', 'Match', 'Descrição', 'Ação', 'Nome SF', 'Nome Milão'
    ]
    
    for col in colunas_esperadas:
        if col not in df_corrigido.columns:
            df_corrigido[col] = ''
    
    # Adicionar colunas extras que o sistema usa
    df_corrigido['ID'] = range(1, len(df_corrigido) + 1)
    df_corrigido['Venda'] = df_corrigido['SF por']  # Preço final
    df_corrigido['Custo Real'] = df_corrigido['Milão Por']  # Custo
    df_corrigido['Lucro'] = df_corrigido['SF por'] - df_corrigido['Milão Por']
    df_corrigido['Margem %'] = ((df_corrigido['SF por'] - df_corrigido['Milão Por']) / df_corrigido['SF por'] * 100).round(2)
    
    # Ajustar coluna Status para o formato esperado
    def ajustar_status(status):
        if pd.isna(status) or status == '':
            return 'milao-only'
        status_str = str(status).lower()
        if 'both' in status_str or 'sf' in status_str:
            return 'both'
        elif 'sf only' in status_str:
            return 'sf-only'
        else:
            return 'milao-only'
    
    df_corrigido['Status'] = df_corrigido['Status'].apply(ajustar_status)
    
    # Reordenar colunas na ordem esperada
    ordem_colunas = [
        'ID', 'Produto', 'Status', 'Match', 'Milão De', 'Milão Por',
        'SF de', 'SF por', 'Venda', 'Custo Real', 'Lucro', 'Margem %',
        'Descrição', 'Ação', 'Nome SF', 'Nome Milão'
    ]
    
    df_final = df_corrigido[ordem_colunas]
    
    # Salvar arquivo corrigido
    arquivo_saida = 'sf_milao_final_corrigido.xlsx'
    df_final.to_excel(arquivo_saida, index=False, engine='openpyxl')
    
    print(f"✅ Planilha corrigida salva como: {arquivo_saida}")
    print(f"📊 Total de produtos: {len(df_final)}")
    print(f"📋 Colunas finais: {list(df_final.columns)}")
    
    # Estatísticas
    print(f"\n📈 ESTATÍSTICAS:")
    print(f"   - Produtos Both: {len(df_final[df_final['Status'] == 'both'])}")
    print(f"   - Produtos SF Only: {len(df_final[df_final['Status'] == 'sf-only'])}")
    print(f"   - Produtos Milão Only: {len(df_final[df_final['Status'] == 'milao-only'])}")
    
    return arquivo_saida

if __name__ == "__main__":
    corrigir_planilha()
