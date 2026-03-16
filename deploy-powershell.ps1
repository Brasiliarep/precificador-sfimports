# Script PowerShell para Deploy Automático - Versão Corrigida
$ErrorActionPreference = "Stop"

Write-Host "🚀 INICIANDO DEPLOY AUTOMÁTICO..." -ForegroundColor Green

# Configurações
$FtpHost = "ftp.sfimportsdf.com.br"
$User = "u855614676"
$Password = "16052620Df@@"
$RemotePath = "/public_html/gestaosf"
$LocalPath = ".\dist"

# 1. Build
Write-Host "📦 Fazendo build..." -ForegroundColor Yellow
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

# 2. Upload via FTP
Write-Host "📤 Enviando arquivos..." -ForegroundColor Yellow

try {
    # Criar objeto FTP para testar conexão
    $ftp = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost$RemotePath")
    $ftp.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
    $ftp.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    
    # Testar conexão (limpa resposta anterior)
    $response = $ftp.GetResponse()
    $response.Close()
    Write-Host "✅ Conexão FTP estabelecida!" -ForegroundColor Green

    # Verificar se a pasta dist existe
    if (-not (Test-Path $LocalPath)) {
        throw "A pasta '$LocalPath' não foi encontrada. O build falhou?"
    }

    # Obter caminho completo da pasta dist
    $distFull = (Resolve-Path $LocalPath).Path

    # 2.1 Criar diretórios
    $directories = Get-ChildItem -Path $LocalPath -Recurse | Where-Object { $_.PSIsContainer }
    foreach ($dir in $directories) {
        $relativePath = $dir.FullName.Substring($distFull.Length).Replace("\", "/").TrimStart("/")
        if ($relativePath -ne "") {
            $remoteDir = "$RemotePath/$relativePath"
            try {
                $mkDir = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost$remoteDir")
                $mkDir.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
                $mkDir.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
                $mkDir.GetResponse().Close()
            }
            catch {
                # Ignora se diretório já existe
            }
        }
    }
    
    # 2.2 Upload dos arquivos
    $files = Get-ChildItem -Path $LocalPath -Recurse | Where-Object { -not $_.PSIsContainer }
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($distFull.Length).Replace("\", "/").TrimStart("/")
        $remoteFile = "$RemotePath/$relativePath"
        
        Write-Host "📤 Enviando: $relativePath" -ForegroundColor Cyan
        
        $upload = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost$remoteFile")
        $upload.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
        $upload.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $upload.UseBinary = $true
        
        $content = [System.IO.File]::ReadAllBytes($file.FullName)
        $upload.ContentLength = $content.Length
        
        $stream = $upload.GetRequestStream()
        $stream.Write($content, 0, $content.Length)
        $stream.Close()
        $upload.GetResponse().Close()
    }
    
    Write-Host "✅ Upload concluído com sucesso!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Erro no FTP: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 Verifique suas credenciais no script." -ForegroundColor Yellow
}

Write-Host "🌐 Acesse: https://gestaosf.sfimportsdf.com.br" -ForegroundColor Cyan
Read-Host "Pressione Enter para sair"
