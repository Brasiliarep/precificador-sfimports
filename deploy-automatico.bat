@echo off
echo 🚀 INICIANDO DEPLOY AUTOMÁTICO PARA HOSTINGER...
echo.

:: CONFIGURAÇÕES (PREENCHA COM SEUS DADOS)
set HOST=sfimportsdf.com.br
set USER=u855614676
set PASSWORD=@16052620Df@@
set REMOTE_PATH=/public_html/gestaosf

:: 1. BUILD DO PROJETO
echo 📦 Fazendo build do projeto...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro no build!
    pause
    exit /b 1
)

:: 2. ENVIAR ARQUIVOS VIA FTP
echo 📤 Enviando arquivos para o servidor...

:: Criar arquivo de comandos FTP temporário
echo open %HOST% > ftp_commands.txt
echo %USER% >> ftp_commands.txt
echo %PASSWORD% >> ftp_commands.txt
echo cd %REMOTE_PATH% >> ftp_commands.txt
echo lcd dist >> ftp_commands.txt
echo mput *.* >> ftp_commands.txt
echo mkdir assets >> ftp_commands.txt
echo cd assets >> ftp_commands.txt
echo lcd dist\assets >> ftp_commands.txt
echo mput *.* >> ftp_commands.txt
echo cd .. >> ftp_commands.txt
echo lcd .. >> ftp_commands.txt
echo put server-simple.cjs >> ftp_commands.txt
echo put package.json >> ftp_commands.txt
echo put .env >> ftp_commands.txt
echo bye >> ftp_commands.txt

:: Executar FTP
ftp -s:ftp_commands.txt
del ftp_commands.txt

:: 3. LIMPEZA
echo 🧹 Limpando arquivos temporários...
if exist ftp_commands.txt del ftp_commands.txt

echo.
echo ✅ DEPLOY CONCLUÍDO!
echo 🌐 Acesse: https://gestaosf.sfimportsdf.com.br
echo.
pause
