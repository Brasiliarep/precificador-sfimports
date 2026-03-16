import pandas as pd
import re

def criar_planilha_completa():
    """
    Cria planilha completa com base nos dados mostrados pelo usuário
    no formato exato que o sistema espera
    """
    
    # Dados baseados na sua planilha (primeiros produtos)
    dados = [
        {
            'Produto': 'VINHO TINTO LA LINDA CABERNET SAUVIGNON ↔ VINHO TINTO GANDOLINI CABERNET SAUVIGNON',
            'Status': 'both',
            'Milão De': 790,
            'Milão Por': 699.9,
            'SF de': 299.9,
            'SF por': 299.9,
            'Venda': 299.9,
            'Custo Real': 699.9,
            'Lucro': -400.0,
            'Margem %': -133.4,
            'Descrição': 'Stefano Gandolini se dedica a fazer um único vinho, Las 3 Marias Vineyards Cabernet Sauvignon.',
            'Ação': 'Revisar manualmente',
            'Nome SF': 'VINHO TINTO LA LINDA CABERNET SAUVIGNON',
            'Nome Milão': 'VINHO TINTO GANDOLINI CABERNET SAUVIGNON'
        },
        {
            'Produto': 'VINHO BRANCO CHABLIS LOUIS JADOT ↔ VINHO BRANCO CHABLIS LOUIS LATOUR',
            'Status': 'both',
            'Milão De': 309.9,
            'Milão Por': 299.9,
            'SF de': 299.9,
            'SF por': 299.9,
            'Venda': 299.9,
            'Custo Real': 299.9,
            'Lucro': 0.0,
            'Margem %': 0.0,
            'Descrição': 'Chablis é uma ilha de vinhedos isolada na porção mais ao norte da Borgonha.',
            'Ação': 'Revisar manualmente',
            'Nome SF': 'VINHO BRANCO CHABLIS LOUIS JADOT',
            'Nome Milão': 'VINHO BRANCO CHABLIS LOUIS LATOUR'
        },
        {
            'Produto': 'CARNIVOR CABERNET SAUVIGNON ↔ VINHO TINTO CRIOS TORRONTES CABERNET SAUVIGNON',
            'Status': 'both',
            'Milão De': 59.9,
            'Milão Por': 49.9,
            'SF de': 79.9,
            'SF por': 79.9,
            'Venda': 79.9,
            'Custo Real': 49.9,
            'Lucro': 30.0,
            'Margem %': 37.5,
            'Descrição': 'Descubra a paixão da Argentina neste vinho encantador do Valle de Uco.',
            'Ação': 'Revisar manualmente',
            'Nome SF': 'CARNIVOR CABERNET SAUVIGNON',
            'Nome Milão': 'VINHO TINTO CRIOS TORRONTES CABERNET SAUVIGNON'
        },
        {
            'Produto': 'Pueblo sol tannat 750 ml ↔ VINHO TT PUEBLO SOL TANNAT',
            'Status': 'both',
            'Milão De': 22.9,
            'Milão Por': 19.9,
            'SF de': 0,
            'SF por': 0,
            'Venda': 0,
            'Custo Real': 19.9,
            'Lucro': -19.9,
            'Margem %': -100.0,
            'Descrição': 'No paladar, o Pueblo del Sol Tannat revela-se jovem e vibrante.',
            'Ação': 'Revisar manualmente',
            'Nome SF': 'Pueblo sol tannat 750 ml',
            'Nome Milão': 'VINHO TT PUEBLO SOL TANNAT'
        },
        {
            'Produto': 'WHISKY GRAND OLD PARR 12 ANOS 1 LITRO',
            'Status': 'milao-only',
            'Milão De': 139.9,
            'Milão Por': 129.9,
            'SF de': 0,
            'SF por': 0,
            'Venda': 0,
            'Custo Real': 129.9,
            'Lucro': -129.9,
            'Margem %': -100.0,
            'Descrição': 'Para chivas, o sucesso é um blend, na vida e no scotch.',
            'Ação': 'VINCULAR MANUALMENTE - Escolher produto SF ou criar novo',
            'Nome SF': '',
            'Nome Milão': 'WHISKY GRAND OLD PARR 12 ANOS 1 LITRO'
        },
        {
            'Produto': 'WHISKY JAPANESE THE CHITA SINGLE GRAIN',
            'Status': 'milao-only',
            'Milão De': 419.9,
            'Milão Por': 369.9,
            'SF de': 0,
            'SF por': 0,
            'Venda': 0,
            'Custo Real': 369.9,
            'Lucro': -369.9,
            'Margem %': -100.0,
            'Descrição': 'Whisky The Chita 700 ml - Single Grain Japanese.',
            'Ação': 'VINCULAR MANUALMENTE - Escolher produto SF ou criar novo',
            'Nome SF': '',
            'Nome Milão': 'WHISKY JAPANESE THE CHITA SINGLE GRAIN'
        },
        {
            'Produto': 'CHATEAU PONTET CANET',
            'Status': 'sf-only',
            'Milão De': 0,
            'Milão Por': 0,
            'SF de': 0,
            'SF por': 0,
            'Venda': 0,
            'Custo Real': 0,
            'Lucro': 0,
            'Margem %': 0,
            'Descrição': 'Produto sem fornecedor Milão',
            'Ação': 'Produto sem fornecedor Milão',
            'Nome SF': 'CHATEAU PONTET CANET',
            'Nome Milão': ''
        }
    ]
    
    # Criar DataFrame
    df = pd.DataFrame(dados)
    
    # Adicionar coluna ID
    df['ID'] = range(1, len(df) + 1)
    
    # Reordenar colunas
    ordem_colunas = [
        'ID', 'Produto', 'Status', 'Milão De', 'Milão Por',
        'SF de', 'SF por', 'Venda', 'Custo Real', 'Lucro', 'Margem %',
        'Descrição', 'Ação', 'Nome SF', 'Nome Milão'
    ]
    
    df = df[ordem_colunas]
    
    # Salvar arquivo
    arquivo_saida = 'sf_milao_final_formatado.xlsx'
    df.to_excel(arquivo_saida, index=False, engine='openpyxl')
    
    print(f"✅ Planilha criada: {arquivo_saida}")
    print(f"📊 Total de produtos: {len(df)}")
    print(f"📋 Colunas: {list(df.columns)}")
    
    # Estatísticas
    print(f"\n📈 ESTATÍSTICAS:")
    print(f"   - Both (SF + Milão): {len(df[df['Status'] == 'both'])}")
    print(f"   - SF Only: {len(df[df['Status'] == 'sf-only'])}")
    print(f"   - Milão Only: {len(df[df['Status'] == 'milao-only'])}")
    
    # Mostrar primeiras linhas
    print(f"\n📋 AMOSTRA DOS DADOS:")
    print(df.head(3).to_string())
    
    return arquivo_saida

if __name__ == "__main__":
    criar_planilha_completa()
