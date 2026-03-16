#!/usr/bin/env python3
"""
PROCESSADOR TABELA MILÃO COMPLETA (45MB)
Para usar com o arquivo grande localmente

INSTRUÇÕES:
1. Coloque sua tabela Milão completa na pasta
2. Execute: python processar_milao_grande.py
3. Resultado: Tabela integrada pronta para o sistema
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os

print("🔧 PROCESSADOR TABELA MILÃO COMPLETA")
print("=" * 60)

def encontrar_arquivo_milao():
    """Procura automaticamente o arquivo Milão grande"""
    arquivos_possiveis = [
        'milao_completo.xlsx',
        'tabela_milao.xlsx', 
        'milao_todos.xlsx',
        'planilha_milao.xlsx',
        'produtos_milao.xlsx',
        'MILAO_COMPLETO.xlsx'
    ]
    
    print("🔍 Procurando arquivo Milão grande...")
    
    for arquivo in arquivos_possiveis:
        if os.path.exists(arquivo):
            tamanho = os.path.getsize(arquivo) / (1024*1024)  # MB
            print(f"✅ Encontrado: {arquivo} ({tamanho:.1f} MB)")
            return arquivo
    
    # Listar todos os arquivos Excel grandes
    print("\n📁 Arquivos Excel encontrados:")
    for arquivo in os.listdir('.'):
        if arquivo.endswith(('.xlsx', '.xls')) and os.path.getsize(arquivo) > 10*1024*1024:  # > 10MB
            tamanho = os.path.getsize(arquivo) / (1024*1024)
            print(f"   📊 {arquivo} ({tamanho:.1f} MB)")
    
    return None

def analisar_estrutura(arquivo):
    """Analisa a estrutura do arquivo Milão"""
    print(f"\n🔍 Analisando estrutura: {arquivo}")
    
    try:
        # Tentar ler apenas as primeiras linhas para não sobrecarregar
        df = pd.read_excel(arquivo, nrows=100)
        
        print(f"📊 Estrutura encontrada:")
        print(f"   Total de colunas: {len(df.columns)}")
        print(f"   Colunas: {list(df.columns)}")
        
        print(f"\n📋 Amostra dos dados:")
        for i, row in df.head(10).iterrows():
            linha = []
            for val in row:
                if pd.notna(val) and str(val).strip():
                    linha.append(str(val)[:50])
            print(f"   {i+1}. {' | '.join(linha[:3])}")
        
        return df.columns.tolist()
        
    except Exception as e:
        print(f"❌ Erro ao analisar: {e}")
        return None

def procurar_caballo(arquivo):
    """Procura especificamente pelo CABALLO LOCO"""
    print(f"\n🐴 Procurando CABALLO LOCO em: {arquivo}")
    
    try:
        # Ler em chunks para não sobrecarregar memória
        chunk_size = 1000
        caballo_encontrados = []
        
        for chunk in pd.read_excel(arquivo, chunksize=chunk_size):
            # Procurar CABALLO em todas as colunas de texto
            for col in chunk.columns:
                if chunk[col].dtype == 'object':
                    caballo = chunk[chunk[col].str.contains('CABALLO', case=False, na=False)]
                    if len(caballo) > 0:
                        for i, row in caballo.iterrows():
                            caballo_encontrados.append({
                                'linha': i,
                                'dados': dict(row),
                                'coluna_encontrada': col
                            })
        
        print(f"🐴 CABALLO encontrado: {len(caballo_encontrados)} ocorrências")
        for i, item in enumerate(caballo_encontrados):
            print(f"   {i+1}. Linha {item['linha']}: {item['dados'][item['coluna_encontrada']]}")
        
        return caballo_encontrados
        
    except Exception as e:
        print(f"❌ Erro ao procurar CABALLO: {e}")
        return []

def processar_tabela_completa(arquivo):
    """Processa a tabela completa do Milão"""
    print(f"\n🔄 Processando tabela completa: {arquivo}")
    
    try:
        # Ler a tabela completa
        print("⏳ Carregando tabela completa (pode demorar)...")
        df = pd.read_excel(arquivo)
        print(f"✅ Carregado: {len(df)} produtos")
        
        # Identificar colunas importantes
        colunas_nome_possiveis = ['nome', 'produto', 'name', 'descrição', 'item', 'produto_nome']
        colunas_preco_possiveis = ['preço', 'price', 'valor', 'preco_de', 'preco_por']
        
        coluna_nome = None
        coluna_preco_de = None
        coluna_preco_por = None
        
        for col in df.columns:
            col_lower = str(col).lower()
            if any(nome in col_lower for nome in colunas_nome_possiveis):
                coluna_nome = col
            elif 'de' in col_lower and any(preco in col_lower for preco in colunas_preco_possiveis):
                coluna_preco_de = col
            elif 'por' in col_lower and any(preco in col_lower for preco in colunas_preco_possiveis):
                coluna_preco_por = col
        
        print(f"📋 Colunas identificadas:")
        print(f"   Nome: {coluna_nome}")
        print(f"   Preço DE: {coluna_preco_de}")
        print(f"   Preço POR: {coluna_preco_por}")
        
        # Criar DataFrame padronizado
        if coluna_nome:
            df_padronizado = pd.DataFrame()
            df_padronizado['name'] = df[coluna_nome]
            
            if coluna_preco_de:
                df_padronizado['preco_de'] = df[coluna_preco_de]
            else:
                df_padronizado['preco_de'] = 0.0
                
            if coluna_preco_por:
                df_padronizado['preco_por'] = df[coluna_preco_por]
            elif coluna_preco_de:
                df_padronizado['preco_por'] = df[coluna_preco_de]
            else:
                df_padronizado['preco_por'] = 0.0
            
            df_padronizado['price'] = df_padronizado['preco_por']
            df_padronizado['fornecedor'] = 'Emporio Milao'
            df_padronizado['Match'] = 'milao_only'
            
            # Limpar dados
            df_padronizado = df_padronizado.dropna(subset=['name'])
            df_padronizado = df_padronizado[df_padronizado['name'].str.strip() != '']
            
            print(f"✅ Padronizado: {len(df_padronizado)} produtos válidos")
            
            # Salvar tabela processada
            arquivo_saida = 'MILAO_GRANDE_PROCESSADO.xlsx'
            df_padronizado.to_excel(arquivo_saida, index=False)
            print(f"💾 Salvo: {arquivo_saida}")
            
            return df_padronizado
        
        else:
            print("❌ Não foi possível identificar coluna de nomes")
            return None
            
    except Exception as e:
        print(f"❌ Erro ao processar: {e}")
        return None

def criar_match_com_sf(df_milao):
    """Cria o match com tabela SF"""
    print("\n🔗 Criando MATCH com SF Imports...")
    
    try:
        # Carregar SF se existir
        if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
            df_sf = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx')
            print(f"✅ SF carregado: {len(df_sf)} produtos")
        else:
            print("⚠️ Tabela SF não encontrada")
            df_sf = pd.DataFrame()
        
        # Sistema de match por similaridade
        if len(df_sf) > 0:
            print("🔍 Fazendo match por similaridade...")
            
            # Adicionar coluna de match
            df_milao['Match'] = 'milao_only'
            df_sf['Match'] = 'sf_only'
            
            # Função de similaridade simples
            def similar(nome1, nome2):
                nome1 = str(nome1).lower().strip()
                nome2 = str(nome2).lower().strip()
                
                # Palavras chave importantes
                palavras_chave = ['caballo', 'loco', 'gran', 'cru', 'malbec', 'tinto']
                
                for palavra in palavras_chave:
                    if palavra in nome1 and palavra in nome2:
                        return True
                
                return False
            
            # Fazer match
            matches = 0
            for i, row_milao in df_milao.iterrows():
                for j, row_sf in df_sf.iterrows():
                    if similar(row_milao['name'], row_sf.get('name', row_sf.get('produto', ''))):
                        df_milao.loc[i, 'Match'] = 'both_matched'
                        df_sf.loc[j, 'Match'] = 'both_matched'
                        matches += 1
                        break
            
            print(f"✅ Matches encontrados: {matches}")
            
            # Combinar tabelas
            df_final = pd.concat([df_sf, df_milao], ignore_index=True)
        else:
            df_final = df_milao
        
        # Salvar final
        df_final.to_excel('SF_MILAO_FINAL_INTEGRADO.xlsx', index=False)
        print(f"💾 Final salvo: SF_MILAO_FINAL_INTEGRADO.xlsx")
        print(f"📊 Total final: {len(df_final)} produtos")
        
        return df_final
        
    except Exception as e:
        print(f"❌ Erro no match: {e}")
        return df_milao

# Programa principal
if __name__ == "__main__":
    # 1. Encontrar arquivo
    arquivo_milao = encontrar_arquivo_milao()
    
    if not arquivo_milao:
        print("\n❌ Nenhum arquivo Milão encontrado!")
        print("💡 Coloque sua tabela Milão na pasta e execute novamente")
        exit(1)
    
    # 2. Analisar estrutura
    colunas = analisar_estrutura(arquivo_milao)
    
    if not colunas:
        print("❌ Não foi possível analisar o arquivo")
        exit(1)
    
    # 3. Procurar CABALLO
    caballos = procurar_caballo(arquivo_milao)
    
    # 4. Processar tabela
    df_milao = processar_tabela_completa(arquivo_milao)
    
    if df_milao is not None:
        # 5. Criar match com SF
        df_final = criar_match_com_sf(df_milao)
        
        print("\n" + "=" * 60)
        print("🎉 PROCESSAMENTO CONCLUÍDO!")
        print("=" * 60)
        print(f"📊 Produtos Milão: {len(df_milao)}")
        print(f"📊 Produtos finais: {len(df_final)}")
        print(f"🐴 CABALLO encontrados: {len(caballos)}")
        print(f"\n💡 Use o arquivo SF_MILAO_FINAL_INTEGRADO.xlsx no sistema!")
    else:
        print("❌ Falha no processamento")
