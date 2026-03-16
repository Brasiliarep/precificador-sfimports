#!/bin/bash

# Script de Deploy para Hostinger
# Substitua as variáveis abaixo com suas credenciais

# Configurações (PREENCHA COM SEUS DADOS)
HOST="seu_servidor_ftp.hostinger.com"
USER="seu_usuario_ftp"
PASSWORD="sua_senha_ftp"
REMOTE_PATH="/public_html"  # ou o caminho do seu site

echo "🚀 Iniciando deploy para Hostinger..."

# 1. Build do projeto
echo "📦 Fazendo build..."
npm run build

# 2. Subir arquivos principais
echo "📤 Enviando arquivos para o servidor..."

# Subir pasta dist
lftp -c "
set ftp:ssl-allow no
open ftp://$USER:$PASSWORD@$HOST
cd $REMOTE_PATH
mirror -R dist/ ./ --delete
put server-simple.cjs
put package.json
put .env
bye
"

echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://gestaosf.sfimportsdf.com.br"
