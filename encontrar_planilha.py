import os

print("🔍 PROCURANDO PLANILHA COMPLETA...")
print("=" * 50)

# Procurar todos os arquivos Excel
arquivos_excel = []
for arquivo in os.listdir('.'):
    if arquivo.endswith(('.xlsx', '.xls')):
        tamanho = os.path.getsize(arquivo) / (1024*1024)
        arquivos_excel.append((arquivo, tamanho))

print(f"📁 Arquivos Excel encontrados: {len(arquivos_excel)}")

# Procurar por "planilha" e "completa"
for arquivo, tamanho in arquivos_excel:
    nome_lower = arquivo.lower()
    if 'planilha' in nome_lower or 'completa' in nome_lower:
        print(f"\n🎯 ARQUIVO POTENCIAL: {arquivo}")
        print(f"📊 Tamanho: {tamanho:.1f} MB")
        
        # Tentar ler para verificar
        try:
            import pandas as pd
            df = pd.read_excel(arquivo, nrows=10)
            print(f"📋 Colunas: {list(df.columns)}")
            print(f"📋 Amostra:")
            for i, row in df.head(5).iterrows():
                linha = []
                for val in row:
                    if pd.notna(val) and str(val).strip():
                        linha.append(str(val)[:60])
                if linha:
                    print(f"   {i+1}. {' | '.join(linha[:3])}")
        except Exception as e:
            print(f"❌ Erro ao ler: {e}")

# Mostrar todos os arquivos por tamanho
print(f"\n📊 Todos os arquivos Excel por tamanho:")
arquivos_excel.sort(key=lambda x: x[1], reverse=True)
for arquivo, tamanho in arquivos_excel:
    print(f"   {arquivo} ({tamanho:.1f} MB)")

print(f"\n💡 Se não encontrou, verifique:")
print(f"   1. O arquivo está na pasta correta?")
print(f"   2. O nome está exatamente 'planilha completa do milao.xlsx'?")
print(f"   3. O arquivo não está corrompido?")
