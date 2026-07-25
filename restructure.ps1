$ErrorActionPreference = "Stop"

# Create root directories
New-Item -ItemType Directory -Path "src\client" -Force | Out-Null
New-Item -ItemType Directory -Path "src\server" -Force | Out-Null
New-Item -ItemType Directory -Path "src\shared" -Force | Out-Null

# Move backend source to src/server
Move-Item -Path "backend\src\*" -Destination "src\server\" -Force

# Move backend prisma to root
Move-Item -Path "backend\prisma" -Destination ".\" -Force

# Move other backend roots
Move-Item -Path "backend\nest-cli.json" -Destination ".\" -Force
# Move backend .env
if (Test-Path "backend\.env") { Move-Item -Path "backend\.env" -Destination ".\.env.server" -Force }

# Move frontend source to src/client
Move-Item -Path "frontend\src\*" -Destination "src\client\" -Force
Move-Item -Path "frontend\public" -Destination ".\" -Force
Move-Item -Path "frontend\next.config.ts" -Destination ".\" -Force
Move-Item -Path "frontend\postcss.config.mjs" -Destination ".\" -Force
Move-Item -Path "frontend\eslint.config.mjs" -Destination ".\" -Force
Move-Item -Path "frontend\components.json" -Destination ".\" -Force
if (Test-Path "frontend\.env") { Move-Item -Path "frontend\.env" -Destination ".\.env.client" -Force }

# Clean up
Remove-Item -Path "backend" -Recurse -Force
Remove-Item -Path "frontend" -Recurse -Force

Write-Output "Restructuring complete."
