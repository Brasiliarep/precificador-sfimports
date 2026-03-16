$date = Get-Date -Format "MMMdd_HHmm"
$dest = "c:\app precificador\backup_estavel_$date.zip"
$exclude = @("node_modules", ".git", ".netlify", ".vscode", "dist", ".gemini")
$items = Get-ChildItem -Path . | Where-Object { $exclude -notcontains $_.Name -and $_.Name -notlike "*.zip" }

Write-Host "📦 Iniciando Backup em: $dest"
Compress-Archive -Path $items.FullName -DestinationPath $dest -Force
Write-Host "✅ Backup concluído com sucesso!"
