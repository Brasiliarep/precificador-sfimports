#!/usr/bin/env python3
"""
PROCESSADOR ESPECÍFICO: planilha completa do milao.xlsx
Arquivo exato que você mencionou
"""

import pandas as pd
import os
from datetime import datetime

print("🔧 PROCESSANDO: planilha completa do milao.xlsx")
print("=" * 60)

def processar_planilha_milao():
    arquivo = "planilha completa do milao.xlsx"
    
    if not os.path.exists(arquivo):
        print(f"❌ Arquivo não encontrado: {arquivo}")
        return None
    
    tamanho = os.path.getsize(arquivo) / (1024*1024)
    print(f"📊 Arquivo: {arquivo} ({tamanho:.1f} MB)")
    
    try:
        # Ler arquivo
        print("⏳ Carregando planilha (pode demorar)...")
        df = pd.read_excel(arquivo)
        print(f"✅ Carregado: {len(df)} produtos")
        
        # Mostrar estrutura
        print(f"\n📋 Estrutura da planilha:")
        print(f"   Colunas: {len(df.columns)}")
        print(f"   Nomes: {list(df.columns)}")
        
        # Mostrar primeiras linhas
        print(f"\n📋 Primeiras 15 linhas:")
        for i, row in df.head(15).iterrows():
            linha = []
            for val in row:
                if pd.notna(val) and str(val).strip():
                    linha.append(str(val)[:60])
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
            
            # Coluna de nome
            if not coluna_nome and any(p in col_lower for p in ['nome', 'name', 'produto', 'descrição', 'item']):
                coluna_nome = col
                print(f"   ✅ Nome: {col}")
            
            # Coluna preço DE
            elif not coluna_preco_de and any(p in col_lower for p in ['preço de', 'preco_de', 'valor de', 'original']):
                coluna_preco_de = col
                print(f"   ✅ Preço DE: {col}")
            
            # Coluna preço POR
            elif not coluna_preco_por and any(p in col_lower for p in ['preço por', 'preco_por', 'preco', 'valor']):
                coluna_preco_por = col
                print(f"   ✅ Preço POR: {col}")
        
        if not coluna_nome:
            print("❌ Coluna de nomes não encontrada!")
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
        
        # Carregar SF Imports se existir
        df_sf = pd.DataFrame()
        if os.path.exists('SF-IMPORTS-DASHBOARD-CORRETO.xlsx'):
            df_sf = pd.read_excel('SF-IMPORTS-DASHBOARD-CORRETO.xlsx')
            print(f"✅ SF Imports carregado: {len(df_sf)} produtos")
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
                    
                    # Verificar similaridade
                    if any(palavra in nome_sf for palavra in ['caballo', 'loco', 'gran', 'cru']):
                        if any(palavra in nome_caballo for palavra in ['caballo', 'loco', 'gran', 'cru']):
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
        
        # Salvar arquivos
        print(f"\n💾 Salvando arquivos finais...")
        
        # Arquivo completo
        df_final.to_excel('MILAO_PLANILHA_FINAL.xlsx', index=False)
        print(f"✅ MILAO_PLANILHA_FINAL.xlsx")
        
        # Arquivo para o sistema
        colunas_sistema = ['name', 'preco_de', 'preco_por', 'price', 'sf_por', 'frete', 'taxa', 
                         'lucro_minimo', 'sf_sugestao', 'sf_final', 'fornecedor', 'Match']
        
        df_sistema = df_final[colunas_sistema].copy()
        df_sistema.to_excel('MILAO_PLANILHA_SISTEMA.xlsx', index=False)
        print(f"✅ MILAO_PLANILHA_SISTEMA.xlsx")
        
        return df_final, caballos
        
    except Exception as e:
        print(f"❌ Erro ao processar: {e}")
        return None, []

# Executar
if __name__ == "__main__":
    resultado, caballos = processar_planilha_milao()
    
    if resultado is not None:
        print("\n" + "=" * 60)
        print("🎉 PROCESSAMENTO CONCLUÍDO!")
        print("=" * 60)
        print(f"📊 RESUMO FINAL:")
        print(f"   Total de produtos: {len(resultado)}")
        print(f"   CABALLO LOCO: {len(caballos)} encontrados")
        
        print(f"\n📁 ARQUIVOS GERADOS:")
        print(f"   ✅ MILAO_PLANILHA_FINAL.xlsx - Dados completos")
        print(f"   ✅ MILAO_PLANILHA_SISTEMA.xlsx - Para importar")
        
        if len(caballos) > 0:
            print(f"\n🐴 CABALLO LOCO encontrados:")
            for i, caballo in enumerate(caballos):
                print(f"   {i+1}. {caballo['nome']}")
        
        print(f"\n🚀 PRÓXIMO PASSO:")
        print(f"   Use MILAO_PLANILHA_SISTEMA.xlsx no seu sistema SF Imports!")
        print(f"   Ele já está formatado e pronto para precificação!")
    else:
        print("❌ Falha no processamento")
