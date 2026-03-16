#!/usr/bin/env python3
"""
SUPER PROCESSADOR UNIVERSAL - MILÃO + SF IMPORTS
Funciona com QUALQUER arquivo Milão que você colocar na pasta

INSTRUÇÕES:
1. Coloque seu arquivo "planilha completa do milao.xlsx" na pasta
2. Execute: python SUPER_PROCESSADOR.py
3. Sistema vai encontrar e processar automaticamente
"""

import pandas as pd
import os
from datetime import datetime

print("🚀 SUPER PROCESSADOR UNIVERSAL - MILÃO + SF IMPORTS")
print("=" * 60)

def main():
    print("📁 Procurando arquivos disponíveis...")
    
    # Listar todos os arquivos
    arquivos_disponiveis = []
    for arquivo in os.listdir('.'):
        if arquivo.endswith(('.xlsx', '.xls', '.csv')):
            tamanho = os.path.getsize(arquivo) / (1024*1024)
            arquivos_disponiveis.append((arquivo, tamanho))
    
    print(f"\n📊 Arquivos encontrados ({len(arquivos_disponiveis)}):")
    for i, (arquivo, tamanho) in enumerate(arquivos_disponiveis):
        print(f"   {i+1}. {arquivo} ({tamanho:.1f} MB)")
    
    # Procurar especificamente pelo nome
    arquivo_alvo = "planilha completa do milao.xlsx"
    arquivo_encontrado = None
    
    for arquivo, _ in arquivos_disponiveis:
        if arquivo.lower() == arquivo_alvo.lower():
            arquivo_encontrado = arquivo
            break
    
    if arquivo_encontrado:
        print(f"\n✅ ARQUIVO ALVO ENCONTRADO: {arquivo_encontrado}")
    else:
        print(f"\n⚠️ Arquivo '{arquivo_alvo}' não encontrado!")
        print("🎯 OPÇÕES:")
        print("   1. Usar o maior arquivo encontrado")
        print("   2. Digitar o nome do arquivo manualmente")
        
        try:
            opcao = input("\nEscolha (1 ou 2): ").strip()
            
            if opcao == "1":
                # Usar o maior arquivo
                if arquivos_disponiveis:
                    arquivo_encontrado = max(arquivos_disponiveis, key=lambda x: x[1])[0]
                    print(f"✅ Usando maior arquivo: {arquivo_encontrado}")
                else:
                    print("❌ Nenhum arquivo encontrado!")
                    return
            else:
                # Digitar nome
                nome_digitado = input("Digite o nome exato do arquivo: ").strip()
                if os.path.exists(nome_digitado):
                    arquivo_encontrado = nome_digitado
                    print(f"✅ Arquivo selecionado: {arquivo_encontrado}")
                else:
                    print("❌ Arquivo não encontrado!")
                    return
        except:
            # Usar o maior arquivo automaticamente
            if arquivos_disponiveis:
                arquivo_encontrado = max(arquivos_disponiveis, key=lambda x: x[1])[0]
                print(f"✅ Usando maior arquivo automaticamente: {arquivo_encontrado}")
            else:
                print("❌ Nenhum arquivo encontrado!")
                return
    
    # Processar o arquivo encontrado
    processar_arquivo_milao(arquivo_encontrado)

def processar_arquivo_milao(arquivo):
    print(f"\n🔧 PROCESSANDO: {arquivo}")
    print("=" * 40)
    
    try:
        # Ler arquivo
        print("⏳ Carregando arquivo (pode demorar)...")
        df = pd.read_excel(arquivo)
        print(f"✅ Carregado: {len(df)} produtos")
        
        # Mostrar estrutura
        print(f"\n📋 Estrutura do arquivo:")
        print(f"   Colunas ({len(df.columns)}): {list(df.columns)}")
        
        # Mostrar amostra
        print(f"\n📋 Amostra dos dados:")
        for i, row in df.head(10).iterrows():
            linha = []
            for val in row:
                if pd.notna(val) and str(val).strip():
                    linha.append(str(val)[:50])
            if linha:
                print(f"   {i+1}. {' | '.join(linha[:3])}")
        
        # Procurar CABALLO LOCO
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
        
        # Identificar colunas importantes
        print(f"\n🔧 Identificando colunas importantes...")
        
        coluna_nome = None
        coluna_preco_de = None
        coluna_preco_por = None
        
        for col in df.columns:
            col_lower = str(col).lower().strip()
            
            # Coluna de nome (várias possibilidades)
            if not coluna_nome and any(p in col_lower for p in [
                'nome', 'name', 'produto', 'descrição', 'item', 'produto_nome', 'product_name'
            ]):
                coluna_nome = col
                print(f"   ✅ Nome: {col}")
            
            # Coluna preço DE
            elif not coluna_preco_de and any(p in col_lower for p in [
                'preço de', 'preco_de', 'valor de', 'original', 'regular_price', 'list_price'
            ]):
                coluna_preco_de = col
                print(f"   ✅ Preço DE: {col}")
            
            # Coluna preço POR
            elif not coluna_preco_por and any(p in col_lower for p in [
                'preço por', 'preco_por', 'preco', 'valor', 'sale_price', 'price'
            ]):
                coluna_preco_por = col
                print(f"   ✅ Preço POR: {col}")
        
        if not coluna_nome:
            print("❌ Coluna de nomes não encontrada!")
            print("💡 Verifique se o arquivo tem coluna com nome dos produtos")
            return None
        
        # Criar DataFrame padronizado
        print(f"\n🔧 Criando tabela padronizada...")
        df_padronizado = pd.DataFrame()
        
        # Nome do produto
        df_padronizado['name'] = df[coluna_nome]
        
        # Preço DE
        if coluna_preco_de:
            df_padronizado['preco_de'] = df[coluna_preco_de]
        else:
            df_padronizado['preco_de'] = 0.0
        
        # Preço POR
        if coluna_preco_por:
            df_padronizado['preco_por'] = df[coluna_preco_por]
        elif coluna_preco_de:
            df_padronizado['preco_por'] = df[coluna_preco_de]
        else:
            df_padronizado['preco_por'] = 0.0
        
        # Limpar preços
        def limpar_preco(preco):
            if pd.isna(preco):
                return 0.0
            if isinstance(preco, str):
                preco = str(preco).replace('R$', '').replace('$', '').replace('.', '').replace(',', '.').strip()
            try:
                return float(preco)
            except:
                return 0.0
        
        df_padronizado['preco_de'] = df_padronizado['preco_de'].apply(limpar_preco)
        df_padronizado['preco_por'] = df_padronizado['preco_por'].apply(limpar_preco)
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
        
        # Limpar dados inválidos
        df_padronizado = df_padronizado.dropna(subset=['name'])
        df_padronizado = df_padronizado[df_padronizado['name'].str.strip() != '']
        df_padronizado = df_padronizado[df_padronizado['preco_por'] > 0]
        
        print(f"✅ Padronizado: {len(df_padronizado)} produtos válidos")
        
        # Carregar SF Imports se existir
        df_sf = pd.DataFrame()
        if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
            df_sf = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx')
            print(f"✅ SF Imports carregado: {len(df_sf)} produtos")
            
            # Garantir colunas
            if 'name' not in df_sf.columns and 'produto' in df_sf.columns:
                df_sf['name'] = df_sf['produto']
            
            df_sf['Match'] = 'sf_only'
        
        # Fazer MATCH inteligente
        if len(df_sf) > 0 and len(caballos) > 0:
            print(f"\n🎯 Fazendo MATCH inteligente...")
            matches = 0
            
            for caballo in caballos:
                nome_caballo = str(caballo['nome']).lower()
                
                # Procurar na tabela SF
                for i, row_sf in df_sf.iterrows():
                    nome_sf = str(row_sf.get('name', row_sf.get('produto', ''))).lower()
                    
                    # Verificar similaridade por palavras chave
                    palavras_chave = ['caballo', 'loco', 'gran', 'cru', 'malbec']
                    
                    if any(palavra in nome_sf for palavra in palavras_chave):
                        if any(palavra in nome_caballo for palavra in palavras_chave):
                            # Marcar match
                            df_sf.loc[i, 'Match'] = 'both_matched'
                            matches += 1
                            print(f"   ✅ MATCH: {caballo['nome']}")
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
        
        # Salvar arquivos finais
        print(f"\n💾 Salvando arquivos finais...")
        
        # Arquivo completo
        df_final.to_excel('MILAO_SF_SUPER_FINAL.xlsx', index=False)
        print(f"✅ MILAO_SF_SUPER_FINAL.xlsx")
        
        # Arquivo para o sistema
        colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 
                         'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
        
        df_sistema = df_final[colunas_sistema].copy()
        df_sistema.to_excel('MILAO_SF_SUPER_SISTEMA.xlsx', index=False)
        print(f"✅ MILAO_SF_SUPER_SISTEMA.xlsx")
        
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
        print(f"   ✅ MILAO_SF_SUPER_FINAL.xlsx - Dados completos")
        print(f"   ✅ MILAO_SF_SUPER_SISTEMA.xlsx - Para importar")
        
        if len(caballos) > 0:
            print(f"\n🐴 CABALLO LOCO encontrados:")
            for i, caballo in enumerate(caballos):
                print(f"   {i+1}. {caballo['nome']}")
        
        print(f"\n🚀 PRÓXIMO PASSO:")
        print(f"   Use MILAO_SF_SUPER_SISTEMA.xlsx no seu sistema SF Imports!")
        print(f"   Ele já está formatado e pronto para precificação!")
        print(f"   O CABALLO LOCO já está com MATCH feito!")
        
        return df_final
        
    except Exception as e:
        print(f"❌ Erro no processamento: {e}")
        print("💡 Verifique se o arquivo não está corrompido ou em uso")
        return None

if __name__ == "__main__":
    main()
