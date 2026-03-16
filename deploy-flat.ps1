# Script Simples - Sem blocos complexos para evitar erros de parser
$FtpHost = "ftp.sfimportsdf.com.br"
$User = "u855614676"
$Password = "16052620Df@@"
$RemoteBase = "/public_html/gestaosf"
$LocalPath = ".\dist"

Write-Host "🚀 Iniciando Upload Simples..."

$distFull = (Resolve-Path $LocalPath).Path

# Listar pastas para criar
$directories = Get-ChildItem -Path $LocalPath -Recurse | Where-Object { $_.PSIsContainer }
foreach ($dir in $directories) {
    $rel = $dir.FullName.Substring($distFull.Length).Replace("\", "/").TrimStart("/")
    if ($rel -ne "") {
        $target = "ftp://$FtpHost$RemoteBase/$rel"
        Write-Host "📁 Criando pasta: $rel"
        $mk = [System.Net.FtpWebRequest]::Create($target)
        $mk.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
        $mk.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        try { $mk.GetResponse().Close() } catch { } # Ignora erro se ja existir
    }
}

# Listar arquivos para subir
$files = Get-ChildItem -Path $LocalPath -Recurse | Where-Object { -not $_.PSIsContainer }
foreach ($file in $files) {
    $rel = $file.FullName.Substring($distFull.Length).Replace("\", "/").TrimStart("/")
    $target = "ftp://$FtpHost$RemoteBase/$rel"
    Write-Host "📤 Enviando: $rel"
    $up = [System.Net.FtpWebRequest]::Create($target)
    $up.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
    $up.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $up.UseBinary = $true
    $bin = [System.IO.File]::ReadAllBytes($file.FullName)
    $up.ContentLength = $bin.Length
    $st = $up.GetRequestStream()
    $st.Write($bin, 0, $bin.Length)
    $st.Close()
    $up.GetResponse().Close()
}

Write-Host "✅ SUCESSO!"
