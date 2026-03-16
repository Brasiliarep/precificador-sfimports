@echo off
echo 🚀 DEPLOY AUTOMÁTICO VIA WINSCP
echo.

:: CONFIGURAÇÕES
set WINSCP_PATH="C:\Program Files (x86)\WinSCP\WinSCP.com"
set HOST=ftp.u855614676.hostinger.com
set USER=u855614676
set PASSWORD=@16052620Df@@
set REMOTE_PATH=/public_html/gestaosf
set LOCAL_PATH=dist

:: VERIFICAR SE WINSCP EXISTE
if not exist %WINSCP_PATH% (
    echo ❌ WinSCP não encontrado em: %WINSCP_PATH%
    echo 📥 Baixe WinSCP: https://winscp.net/eng/download.php
    pause
    exit /b 1
)

:: 1. BUILD
echo 📦 Fazendo build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro no build!
    pause
    exit /b 1
)

:: 2. CRIAR SCRIPT WINSCP
echo 📝 Criando script de transferência...
echo open ftp://%USER%:%PASSWORD%@%HOST% > winscp_script.txt
echo cd %REMOTE_PATH% >> winscp_script.txt
echo lcd %LOCAL_PATH% >> winscp_script.txt
echo put -r *.* >> winscp_script.txt
echo cd .. >> winscp_script.txt
echo lcd .. >> winscp_script.txt
echo put server-simple.cjs >> winscp_script.txt
echo put package.json >> winscp_script.txt
echo put .env >> winscp_script.txt
echo exit >> winscp_script.txt

:: 3. EXECUTAR TRANSFERÊNCIA
echo 📤 Enviando arquivos para o servidor...
%WINSCP_PATH% /script=winscp_script.txt

:: 4. LIMPAR
del winscp_script.txt

echo.
echo ✅ DEPLOY CONCLUÍDO!
echo 🌐 Acesse: https://gestaosf.sfimportsdf.com.br
echo.
pause
