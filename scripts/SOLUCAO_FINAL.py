#!/usr/bin/env python3
"""
SOLUÇÃO DEFINITIVA - MILÃO + SF IMPORTS
Para usar com qualquer arquivo Milão (inclusive 45MB)

INSTRUÇÕES:
1. Coloque seu arquivo Milão na pasta (qualquer nome)
2. Execute: python SOLUCAO_FINAL.py
3. Sistema vai encontrar automaticamente e processar
"""

import pandas as pd
import os
from datetime import datetime

print("🚀 SOLUÇÃO DEFINITIVA - MILÃO + SF IMPORTS")
print("=" * 60)

def main():
    print("📁 Procurando arquivos Milão disponíveis...")
    
    # Listar todos os arquivos
    arquivos_excel = []
    for arquivo in os.listdir('.'):
        if arquivo.endswith(('.xlsx', '.xls', '.csv')):
            tamanho = os.path.getsize(arquivo) / (1024*1024)
            arquivos_excel.append((arquivo, tamanho))
    
    # Mostrar todos os arquivos
    print(f"\n📊 Arquivos encontrados ({len(arquivos_excel)}):")
    for i, (arquivo, tamanho) in enumerate(arquivos_excel):
        print(f"   {i+1}. {arquivo} ({tamanho:.1f} MB)")
    
    if not arquivos_excel:
        print("❌ Nenhum arquivo encontrado!")
        return
    
    # Deixar usuário escolher ou usar o maior
    print(f"\n🎯 OPÇÕES:")
    print(f"   1. Usar arquivo maior automático")
    print(f"   2. Digitar nome do arquivo")
    
    try:
        opcao = input("\nEscolha (1 ou 2): ").strip()
        
        if opcao == "1":
            # Usar o maior arquivo
            arquivo_selecionado = max(arquivos_excel, key=lambda x: x[1])[0]
            print(f"✅ Arquivo selecionado: {arquivo_selecionado}")
        else:
            # Digitar nome
            nome_arquivo = input("Digite o nome do arquivo: ").strip()
            if os.path.exists(nome_arquivo):
                arquivo_selecionado = nome_arquivo
                print(f"✅ Arquivo encontrado: {arquivo_selecionado}")
            else:
                print("❌ Arquivo não encontrado!")
                return
    except:
        # Usar o maior arquivo automaticamente
        arquivo_selecionado = max(arquivos_excel, key=lambda x: x[1])[0]
        print(f"✅ Usando arquivo maior: {arquivo_selecionado}")
    
    # Processar arquivo selecionado
    processar_arquivo(arquivo_selecionado)

def processar_arquivo(arquivo):
    print(f"\n🔧 Processando: {arquivo}")
    
    try:
        # Ler arquivo
        print("⏳ Carregando arquivo...")
        df = pd.read_excel(arquivo)
        print(f"✅ Carregado: {len(df)} produtos")
        
        # Mostrar estrutura
        print(f"📋 Colunas: {list(df.columns)}")
        
        # Procurar CABALLO
        print(f"\n🐴 Procurando CABALLO LOCO...")
        caballos = []
        
        for col in df.columns:
            if df[col].dtype == 'object':
                encontrados = df[df[col].str.contains('CABALLO', case=False, na=False)]
                if len(encontrados) > 0:
                    for i, row in encontrados.iterrows():
                        caballos.append({
                            'linha': i,
                            'nome': row[col],
                            'coluna': col
                        })
                        print(f"   🐴 Linha {i}: {row[col]}")
        
        print(f"🐴 CABALLO LOCO encontrados: {len(caballos)}")
        
        # Padronizar colunas
        print(f"\n🔧 Padronizando colunas...")
        
        # Encontrar colunas importantes
        coluna_nome = None
        coluna_preco_de = None
        coluna_preco_por = None
        
        for col in df.columns:
            col_lower = str(col).lower()
            
            # Coluna de nome
            if not coluna_nome and any(p in col_lower for p in ['nome', 'name', 'produto', 'descrição', 'item']):
                coluna_nome = col
            
            # Coluna preço DE
            elif not coluna_preco_de and any(p in col_lower for p in ['preço de', 'preco_de', 'valor de', 'original']):
                coluna_preco_de = col
            
            # Coluna preço POR
            elif not coluna_preco_por and any(p in col_lower for p in ['preço por', 'preco_por', 'preco', 'valor']):
                coluna_preco_por = col
        
        print(f"📋 Colunas identificadas:")
        print(f"   Nome: {coluna_nome}")
        print(f"   Preço DE: {coluna_preco_de}")
        print(f"   Preço POR: {coluna_preco_por}")
        
        if not coluna_nome:
            print("❌ Coluna de nomes não encontrada!")
            print("💡 Verifique se o arquivo tem coluna com nome dos produtos")
            return
        
        # Criar DataFrame padronizado
        df_padronizado = pd.DataFrame()
        df_padronizado['name'] = df[coluna_nome]
        
        # Adicionar preços
        if coluna_preco_de:
            df_padronizado['preco_de'] = df[coluna_preco_de]
        else:
            df_padronizado['preco_de'] = df_padronizado['name']  # Placeholder
        
        if coluna_preco_por:
            df_padronizado['preco_por'] = df[coluna_preco_por]
        elif coluna_preco_de:
            df_padronizado['preco_por'] = df[coluna_preco_de]
        else:
            df_padronizado['preco_por'] = df_padronizado['name']  # Placeholder
        
        # Limpar preços
        def limpar_preco(preco):
            if pd.isna(preco):
                return 0.0
            if isinstance(preco, str):
                preco = str(preco).replace('R$', '').replace('$', '').replace(',', '.').strip()
            try:
                return float(preco)
            except:
                return 0.0
        
        df_padronizado['preco_de'] = df_padronizado['preco_de'].apply(limpar_preco)
        df_padronizado['preco_por'] = df_padronizado['preco_por'].apply(limpar_preco)
        df_padronizado['price'] = df_padronizado['preco_por']
        
        # Adicionar colunas padrão
        df_padronizado['fornecedor'] = 'Emporio Milao'
        df_padronizado['Match'] = 'milao_only'
        df_padronizado['sf_por'] = 0.0
        df_padronizado['frete'] = 0.0
        df_padronizado['taxa'] = 0.0
        df_padronizado['lucro_minimo'] = 0.0
        df_padronizado['sf_sugestao'] = df_padronizado['preco_por']
        df_padronizado['sf_final'] = df_padronizado['preco_por']
        df_padronizado['data_raspagem'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Limpar dados inválidos
        df_padronizado = df_padronizado.dropna(subset=['name'])
        df_padronizado = df_padronizado[df_padronizado['name'].str.strip() != '']
        df_padronizado = df_padronizado[df_padronizado['preco_por'] > 0]
        
        print(f"✅ Padronizado: {len(df_padronizado)} produtos válidos")
        
        # Carregar SF se existir
        df_sf = pd.DataFrame()
        if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
            df_sf = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx')
            print(f"✅ SF Imports carregado: {len(df_sf)} produtos")
            
            # Adicionar Match para SF
            df_sf['Match'] = 'sf_only'
        
        # Combinar tabelas
        if len(df_sf) > 0:
            print(f"\n🔗 Combinando SF + Milão...")
            df_final = pd.concat([df_sf, df_padronizado], ignore_index=True)
            print(f"✅ Combinado: {len(df_sf)} SF + {len(df_padronizado)} Milão = {len(df_final)} total")
        else:
            df_final = df_padronizado
            print(f"✅ Apenas Milão: {len(df_final)} produtos")
        
        # Fazer match inteligente
        if len(caballos) > 0 and len(df_sf) > 0:
            print(f"\n🎯 Fazendo MATCH inteligente...")
            matches = 0
            
            for caballo in caballos:
                nome_caballo = str(caballo['nome']).lower()
                
                # Procurar correspondência na tabela SF
                for i, row_sf in df_sf.iterrows():
                    nome_sf = str(row_sf.get('name', row_sf.get('produto', ''))).lower()
                    
                    # Verificar similaridade
                    if any(palavra in nome_sf for palavra in ['caballo', 'loco', 'gran', 'cru']):
                        if any(palavra in nome_caballo for palavra in ['caballo', 'loco', 'gran', 'cru']):
                            # Fazer match
                            df_final.loc[df_sf.index[i], 'Match'] = 'both_matched'
                            df_final.loc[len(df_sf) + caballos.index(caballo), 'Match'] = 'both_matched'
                            matches += 1
                            print(f"   ✅ MATCH: {caballo['nome']}")
                            break
            
            print(f"✅ Matches realizados: {matches}")
        
        # Remover duplicatas
        df_final = df_final.drop_duplicates(subset=['name'], keep='first')
        print(f"🧹 Removidas duplicatas: {len(df_final)} produtos únicos")
        
        # Salvar arquivos finais
        print(f"\n💾 Salvando arquivos finais...")
        
        # Arquivo completo
        df_final.to_excel('MILAO_SF_FINAL_COMPLETO.xlsx', index=False)
        print(f"✅ MILAO_SF_FINAL_COMPLETO.xlsx")
        
        # Arquivo para o sistema
        colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 
                         'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
        
        df_sistema = df_final[colunas_sistema].copy()
        df_sistema.to_excel('MILAO_SF_SISTEMA_PRONTO.xlsx', index=False)
        print(f"✅ MILAO_SF_SISTEMA_PRONTO.xlsx")
        
        # Relatório final
        print(f"\n" + "=" * 60)
        print("🎉 PROCESSAMENTO CONCLUÍDO!")
        print("=" * 60)
        print(f"📊 RESUMO FINAL:")
        print(f"   Total de produtos: {len(df_final)}")
        print(f"   Produtos Milão: {len(df_padronizado)}")
        if len(df_sf) > 0:
            print(f"   Produtos SF: {len(df_sf)}")
        print(f"   CABALLO LOCO: {len(caballos)} encontrados")
        
        print(f"\n📁 ARQUIVOS GERADOS:")
        print(f"   ✅ MILAO_SF_FINAL_COMPLETO.xlsx - Dados completos")
        print(f"   ✅ MILAO_SF_SISTEMA_PRONTO.xlsx - Para importar")
        
        print(f"\n🚀 PRÓXIMO PASSO:")
        print(f"   Use MILAO_SF_SISTEMA_PRONTO.xlsx no seu sistema!")
        print(f"   Ele já está formatado e pronto para precificação!")
        
        if len(caballos) > 0:
            print(f"\n🐴 CABALLO LOCO encontrados:")
            for i, caballo in enumerate(caballos):
                print(f"   {i+1}. {caballo['nome']}")
        
    except Exception as e:
        print(f"❌ Erro no processamento: {e}")
        print("💡 Verifique se o arquivo não está corrompido ou em uso")

if __name__ == "__main__":
    main()
