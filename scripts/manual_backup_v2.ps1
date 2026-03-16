$dest = "c:\app precificador\backup_geral_mar05_v2.zip"
$exclude = @("node_modules", ".git", ".netlify", ".vscode", "dist")
$items = Get-ChildItem -Path . | Where-Object { $exclude -notcontains $_.Name -and $_.Name -notlike "*.zip" }

Write-Host "Iniciando archive..."
Compress-Archive -Path $items.FullName -DestinationPath $dest -Force
Write-Host "Done."
