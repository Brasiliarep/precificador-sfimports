#!/usr/bin/env python3
"""
PROCESSADOR ESPECÍFICO PARA TABELA MILÃO 45MB
Encontra e processa automaticamente o arquivo grande

INSTRUÇÕES:
1. Execute: python processador_milao_45mb.py
2. O sistema vai encontrar seu arquivo de 45MB
3. Vai procurar o CABALLO LOCO automaticamente
4. Vai criar a tabela integrada pronta
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os

print("🔧 PROCESSADOR MILÃO 45MB - VERSÃO ESPECIAL")
print("=" * 60)

def encontrar_arquivo_grande():
    """Encontra o arquivo de 45MB automaticamente"""
    print("🔍 Procurando arquivo grande (45MB)...")
    
    arquivos_grandes = []
    
    for arquivo in os.listdir('.'):
        if arquivo.endswith(('.xlsx', '.xls', '.csv')):
            tamanho = os.path.getsize(arquivo) / (1024*1024)  # MB
            if tamanho > 20:  # Maiores que 20MB
                arquivos_grandes.append((arquivo, tamanho))
    
    if not arquivos_grandes:
        print("❌ Nenhum arquivo grande encontrado!")
        print("💡 Certifique-se que seu arquivo Milão está na pasta")
        return None
    
    # Mostrar arquivos encontrados
    print("📁 Arquivos grandes encontrados:")
    for arquivo, tamanho in arquivos_grandes:
        print(f"   📊 {arquivo} ({tamanho:.1f} MB)")
    
    # Pegar o maior arquivo
    arquivo_maior = max(arquivos_grandes, key=lambda x: x[1])
    print(f"\n✅ Arquivo selecionado: {arquivo_maior[0]} ({arquivo_maior[1]:.1f} MB)")
    
    return arquivo_maior[0]

def analisar_arquivo_grande(arquivo):
    """Analisa o arquivo grande sem carregar tudo"""
    print(f"\n🔍 Analisando arquivo grande: {arquivo}")
    
    try:
        # Ler apenas as primeiras 100 linhas para análise
        df_amostra = pd.read_excel(arquivo, nrows=100)
        
        print(f"📊 Estrutura da amostra:")
        print(f"   Colunas: {len(df_amostra.columns)}")
        print(f"   Colunas: {list(df_amostra.columns)}")
        
        print(f"\n📋 Amostra dos dados:")
        for i, row in df_amostra.head(10).iterrows():
            linha_dados = []
            for val in row:
                if pd.notna(val) and str(val).strip():
                    linha_dados.append(str(val)[:40])
            print(f"   {i+1}. {' | '.join(linha_dados[:3])}")
        
        return df_amostra.columns.tolist()
        
    except Exception as e:
        print(f"❌ Erro ao analisar: {e}")
        return None

def procurar_caballo_no_arquivo_grande(arquivo):
    """Procura CABALLO no arquivo grande usando chunks"""
    print(f"\n🐴 Procurando CABALLO LOCO no arquivo grande...")
    
    try:
        caballos_encontrados = []
        
        # Se for Excel, ler em chunks menores
        if arquivo.endswith('.xlsx'):
            # Ler linha por linha para não sobrecarregar
            print("⏳ Lendo arquivo em chunks (pode demorar)...")
            
            chunk_size = 500
            chunk_num = 0
            
            for chunk in pd.read_excel(arquivo, chunksize=chunk_size):
                chunk_num += 1
                print(f"   Analisando chunk {chunk_num} ({len(chunk)} linhas)...")
                
                # Procurar CABALLO em todas as colunas de texto
                for col in chunk.columns:
                    if chunk[col].dtype == 'object':
                        caballo = chunk[chunk[col].str.contains('CABALLO', case=False, na=False)]
                        if len(caballo) > 0:
                            for i, row in caballo.iterrows():
                                caballos_encontrados.append({
                                    'chunk': chunk_num,
                                    'linha': i,
                                    'dados': dict(row),
                                    'coluna': col
                                })
                                print(f"      🐴 ENCONTRADO! Chunk {chunk_num}, Linha {i}: {row[col]}")
        
        print(f"\n🐴 CABALLO LOCO encontrados: {len(caballos_encontrados)}")
        
        for i, item in enumerate(caballos_encontrados):
            print(f"      🐴 ENCONTRADO! Chunk {item['chunk']}, Linha {item['linha']}: {item['dados'][item['coluna']]}")
        
        return caballos_encontrados
        
    except Exception as e:
        print(f"❌ Erro ao procurar CABALLO: {e}")
        # Tentar método alternativo
        return procurar_caballo_alternativo(arquivo)

def procurar_caballo_alternativo(arquivo):
    """Método alternativo se chunks não funcionarem"""
    print("🔄 Tentando método alternativo...")
    
    try:
        # Ler o arquivo inteiro (pode demorar e usar muita memória)
        print("⚠️ Carregando arquivo inteiro (pode demorar)...")
        df = pd.read_excel(arquivo)
        
        print(f"✅ Arquivo carregado: {len(df)} linhas")
        
        caballos_encontrados = []
        
        # Procurar CABALLO em todas as colunas
        for col in df.columns:
            if df[col].dtype == 'object':
                caballo = df[df[col].str.contains('CABALLO', case=False, na=False)]
                if len(caballo) > 0:
                    for i, row in caballo.iterrows():
                        caballos_encontrados.append({
                            'linha': i,
                            'dados': dict(row),
                            'coluna': col
                        })
                        print(f"      🐴 ENCONTRADO! Linha {i}: {row[col]}")
        
        print(f"\n🐴 CABALLO LOCO encontrados: {len(caballos_encontrados)}")
        return caballos_encontrados
        
    except Exception as e:
        print(f"❌ Erro no método alternativo: {e}")
        return []

def criar_tabela_final(arquivo, caballos):
    """Cria a tabela final integrada"""
    print(f"\n🔧 Criando tabela final...")
    
    try:
        print("⏳ Carregando arquivo completo para processamento...")
        
        # Tentar ler o arquivo completo
        if len(caballos) > 0:
            print("✅ CABALLO encontrado, processando arquivo completo...")
            df = pd.read_excel(arquivo)
        else:
            print("⚠️ CABALLO não encontrado, processando amostra...")
            df = pd.read_excel(arquivo, nrows=1000)
        
        print(f"📊 Total de linhas: {len(df)}")
        
        # Identificar colunas importantes
        colunas_nome = ['nome', 'name', 'produto', 'descrição', 'item']
        colunas_preco_de = ['preço de', 'preco_de', 'preco original', 'valor de']
        colunas_preco_por = ['preço por', 'preco_por', 'preco', 'valor']
        
        coluna_nome = None
        coluna_preco_de = None
        coluna_preco_por = None
        
        for col in df.columns:
            col_lower = str(col).lower()
            
            if not coluna_nome and any(nome in col_lower for nome in colunas_nome):
                coluna_nome = col
            elif not coluna_preco_de and any(preco in col_lower for preco in colunas_preco_de):
                coluna_preco_de = col
            elif not coluna_preco_por and any(preco in col_lower for preco in colunas_preco_por):
                coluna_preco_por = col
        
        print(f"📋 Colunas identificadas:")
        print(f"   Nome: {coluna_nome}")
        print(f"   Preço DE: {coluna_preco_de}")
        print(f"   Preço POR: {coluna_preco_por}")
        
        if not coluna_nome:
            print("❌ Coluna de nomes não encontrada!")
            return None
        
        # Criar DataFrame padronizado
        df_final = pd.DataFrame()
        df_final['name'] = df[coluna_nome]
        
        if coluna_preco_de:
            df_final['preco_de'] = df[coluna_preco_de]
        else:
            df_final['preco_de'] = 0.0
            
        if coluna_preco_por:
            df_final['preco_por'] = df[coluna_preco_por]
        elif coluna_preco_de:
            df_final['preco_por'] = df[coluna_preco_de]
        else:
            df_final['preco_por'] = 0.0
        
        # Limpar e padronizar
        df_final['price'] = df_final['preco_por']
        df_final['fornecedor'] = 'Emporio Milao'
        df_final['Match'] = 'milao_only'
        
        # Remover linhas vazias
        df_final = df_final.dropna(subset=['name'])
        df_final = df_final[df_final['name'].str.strip() != '']
        
        print(f"✅ Tabela padronizada: {len(df_final)} produtos")
        
        # Salvar arquivos
        arquivo_saida = 'MILAO_45MB_PROCESSADO.xlsx'
        df_final.to_excel(arquivo_saida, index=False)
        print(f"💾 Salvo: {arquivo_saida}")
        
        # Criar versão para o sistema
        colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'fornecedor', 'Match']
        df_sistema = df_final[colunas_sistema].copy()
        
        arquivo_sistema = 'MILAO_PARA_SISTEMA.xlsx'
        df_sistema.to_excel(arquivo_sistema, index=False)
        print(f"💾 Sistema: {arquivo_sistema}")
        
        return df_final
        
    except Exception as e:
        print(f"❌ Erro ao criar tabela final: {e}")
        return None

# Programa principal
if __name__ == "__main__":
    # 1. Encontrar arquivo grande
    arquivo_grande = encontrar_arquivo_grande()
    
    if not arquivo_grande:
        print("\n❌ Nenhum arquivo grande encontrado!")
        print("💡 Coloque seu arquivo Milão de 45MB na pasta e execute novamente")
        exit(1)
    
    # 2. Analisar estrutura
    colunas = analisar_arquivo_grande(arquivo_grande)
    
    if not colunas:
        print("❌ Não foi possível analisar o arquivo")
        exit(1)
    
    # 3. Procurar CABALLO
    caballos = procurar_caballo_no_arquivo_grande(arquivo_grande)
    
    # 4. Criar tabela final
    df_final = criar_tabela_final(arquivo_grande, caballos)
    
    if df_final is not None:
        print("\n" + "=" * 60)
        print("🎉 PROCESSAMENTO CONCLUÍDO!")
        print("=" * 60)
        print(f"📊 Produtos processados: {len(df_final)}")
        print(f"🐴 CABALLO LOCO encontrados: {len(caballos)}")
        print(f"\n📁 ARQUIVOS GERADOS:")
        print(f"   ✅ MILAO_45MB_PROCESSADO.xlsx - Dados completos")
        print(f"   ✅ MILAO_PARA_SISTEMA.xlsx - Para importar")
        print(f"\n🚀 PRÓXIMO PASSO:")
        print(f"   Use MILAO_PARA_SISTEMA.xlsx no seu sistema SF Imports!")
        print(f"   Ele já está formatado com as colunas corretas!")
    else:
        print("❌ Falha no processamento")
