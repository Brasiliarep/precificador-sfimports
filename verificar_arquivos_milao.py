import os

print("🔍 VERIFICANDO ARQUIVOS MILÃO...")
print("=" * 50)

arquivos_milao = []
for arquivo in os.listdir('.'):
    if 'milao' in arquivo.lower():
        tamanho = os.path.getsize(arquivo) / (1024*1024)
        arquivos_milao.append((arquivo, tamanho))
        print(f"📁 {arquivo} ({tamanho:.1f} MB)")

print(f"\n📋 Total de arquivos Milão: {len(arquivos_milao)}")

# Procurar especificamente "planilha completa"
for arquivo, tamanho in arquivos_milao:
    if 'planilha' in arquivo.lower() and 'completa' in arquivo.lower():
        print(f"\n✅ ARQUIVO ENCONTRADO: {arquivo}")
        print(f"📊 Tamanho: {tamanho:.1f} MB")
        
        # Tentar ler as primeiras linhas
        try:
            import pandas as pd
            df = pd.read_excel(arquivo, nrows=5)
            print(f"📋 Colunas: {list(df.columns)}")
            print(f"📋 Amostra:")
            for i, row in df.iterrows():
                linha = []
                for val in row:
                    if pd.notna(val) and str(val).strip():
                        linha.append(str(val)[:50])
                if linha:
                    print(f"   {i+1}. {' | '.join(linha[:3])}")
        except Exception as e:
            print(f"❌ Erro ao ler: {e}")
