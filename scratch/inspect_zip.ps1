Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "hostinger-deploy.zip"))
Write-Host "Total entries:" $zip.Entries.Count

Write-Host "`n--- Entrypoints ---"
$zip.Entries | Where-Object { $_.FullName -like "*main.js" } | ForEach-Object { "$($_.FullName) ($($_.Length) bytes)" }

Write-Host "`n--- Client Files (sample) ---"
$zip.Entries | Where-Object { $_.FullName -like "*index.html" -or $_.FullName -like "*favicon.ico" } | ForEach-Object { "$($_.FullName) ($($_.Length) bytes)" }

Write-Host "`n--- Prisma Schema ---"
$zip.Entries | Where-Object { $_.FullName -like "*schema.prisma" } | ForEach-Object { "$($_.FullName) ($($_.Length) bytes)" }

$zip.Dispose()
