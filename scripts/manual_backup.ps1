$src = "c:\app precificador\precificador-sfimports"
$dest = "c:\app precificador\backup_sf_imports_$(Get-Date -Format 'yyyyMMdd_HHmm').zip"

$exclude = @("node_modules", ".git", ".netlify", ".next", "dist")

$items = Get-ChildItem -Path $src | Where-Object { $exclude -notcontains $_.Name }

Write-Host "Iniciando backup de $($items.Count) itens para $dest..."
Compress-Archive -Path $items.FullName -DestinationPath $dest -Force
Write-Host "Backup concluído com sucesso!"
