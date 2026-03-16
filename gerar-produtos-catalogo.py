#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GERADOR DE PRODUTOS PARA CATÁLOGO SIMPLES
Lê CSV do WooCommerce e gera JavaScript com produtos atualizados
"""

import pandas as pd
import json
import os
from datetime import datetime

def gerar_produtos_js():
    print("🚀 GERADOR DE PRODUTOS PARA CATÁLOGO")
    print("=" * 50)
    
    # Arquivos CSV possíveis (em ordem de preferência)
    arquivos_csv = [
        'WooCommerce_PLANILHA_MAE_CORRIGIDA.csv',
        'SF_WooCommerce_*.csv',
        'wc-product-export-*.csv',
        'produtos-woo.csv'
    ]
    
    csv_encontrado = None
    
    # Procurar arquivo CSV
    for arquivo in arquivos_csv:
        if '*' in arquivo:
            import glob
            matches = glob.glob(arquivo)
            if matches:
                csv_encontrado = matches[0]
                break
        else:
            if os.path.exists(arquivo):
                csv_encontrado = arquivo
                break
    
    if not csv_encontrado:
        print("❌ NENHUM ARQUIVO CSV ENCONTRADO!")
        print("\n📋 ARQUIVOS PROCURADOS:")
        for arquivo in arquivos_csv:
            print(f"   - {arquivo}")
        
        print("\n🔧 SOLUÇÃO:")
        print("1. Use o botão '🛒 WooCommerce' no precificador")
        print("2. Faça download do CSV gerado")
        print("3. Coloque o CSV na mesma pasta deste script")
        print("4. Execute este script novamente")
        return
    
    print(f"✅ CSV ENCONTRADO: {csv_encontrado}")
    
    try:
        # Carregar CSV
        print("📊 Carregando CSV...")
        df = pd.read_csv(csv_encontrado)
        print(f"✅ {len(df)} produtos encontrados no CSV")
        
        # Verificar colunas necessárias
        colunas_necessarias = ['Nome', 'Preço', 'Preço promocional', 'Imagens']
        colunas_faltantes = [col for col in colunas_necessarias if col not in df.columns]
        
        if colunas_faltantes:
            print(f"⚠️ COLUNAS FALTANTES: {colunas_faltantes}")
            print(f"📋 COLUNAS DISPONÍVEIS: {list(df.columns)}")
            return
        
        # Limpar dados
        print("🧹 Limpando e processando dados...")
        df = df.dropna(subset=['Nome', 'Preço'])
        
        # Converter preços
        df['Preço'] = pd.to_numeric(df['Preço'].astype(str).str.replace(',', '.'), errors='coerce')
        df['Preço promocional'] = pd.to_numeric(df['Preço promocional'].astype(str).str.replace(',', '.'), errors='coerce')
        
        # Remover produtos sem preço
        df = df[df['Preço'] > 0]
        print(f"✅ {len(df)} produtos válidos após limpeza")
        
        # Gerar JavaScript
        produtos_js = []
        
        for idx, row in df.iterrows():
            # Dados básicos
            nome = str(row['Nome']).strip().replace('"', '\\"')
            preco_normal = float(row['Preço'])
            preco_promo = float(row['Preço promocional']) if pd.notna(row['Preço promocional']) and row['Preço promocional'] > 0 else preco_normal
            
            # Usar o maior como "de" e o menor como "por"
            preco_de = max(preco_normal, preco_promo)
            preco_por = min(preco_normal, preco_promo)
            
            # Imagem
            imagens = str(row.get('Imagens', ''))
            if pd.notna(row.get('Imagens')) and imagens:
                imagem = imagens.split(',')[0].strip()
            else:
                imagem = f"https://via.placeholder.com/280x220/8B0000/FFFFFF?text={nome.replace(' ', '+')}"
            
            # Link do produto
            nome_slug = nome.lower().replace(' ', '-').replace('/', '-').replace('(', '').replace(')', '').replace(',', '').replace('.', '')
            link = f"https://sfimportsdf.com.br/produto/{nome_slug}/"
            
            # Adicionar à lista
            produtos_js.append({
                'nome': nome,
                'preco_de': preco_de,
                'preco_por': preco_por,
                'imagem': imagem,
                'link': link
            })
            
            # Progresso
            if (idx + 1) % 100 == 0:
                print(f"📦 Processados: {idx + 1}/{len(df)} produtos")
        
        # Salvar arquivo JavaScript
        print("💾 Salvando arquivo JavaScript...")
        
        js_content = f"""// CATÁLOGO SF IMPORTS - GERADO EM {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
// Total de produtos: {len(produtos_js)}

const produtos = {json.dumps(produtos_js, ensure_ascii=False, indent=2)};

console.log(`✅ Catálogo carregado com ${{produtos.length}} produtos`);
console.log('📅 Última atualização:', new Date().toLocaleString('pt-BR'));
"""
        
        with open('produtos.js', 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        print(f"✅ ARQUIVO GERADO: produtos.js")
        print(f"✅ TOTAL DE PRODUTOS: {len(produtos_js)}")
        print(f"✅ TAMANHO DO ARQUIVO: {os.path.getsize('produtos.js')} bytes")
        
        # Estatísticas
        precos = [p['preco_por'] for p in produtos_js]
        if precos:
            print(f"\n📊 ESTATÍSTICAS:")
            print(f"   Preço médio: R$ {sum(precos)/len(precos):.2f}")
            print(f"   Preço mínimo: R$ {min(precos):.2f}")
            print(f"   Preço máximo: R$ {max(precos):.2f}")
        
        print(f"\n🎯 PRÓXIMOS PASSOS:")
        print(f"1. Faça upload dos arquivos:")
        print(f"   - catalogo-simples.html")
        print(f"   - produtos.js")
        print(f"2. Para o servidor: public_html/")
        print(f"3. Acesse: https://sfimportsdf.com.br/catalogo-simples.html")
        print(f"4. Pronto! Catálogo atualizado ✅")
        
    except Exception as e:
        print(f"❌ ERRO AO PROCESSAR CSV: {e}")
        print("\n🔧 SOLUÇÕES POSSÍVEIS:")
        print("1. Verifique se o CSV não está aberto em outro programa")
        print("2. Verifique se o CSV tem permissão de leitura")
        print("3. Tente gerar o CSV novamente no precificador")

if __name__ == "__main__":
    gerar_produtos_js()
