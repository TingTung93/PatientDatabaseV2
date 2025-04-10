# PowerShell script to run the migrations
Write-Host "Running database migrations..."

# Change to the backend directory if needed
if (-not (Test-Path "src/database")) {
    Write-Host "Changing to backend directory..."
    Set-Location -Path "backend"
}

# Check if node is installed
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed or not in PATH. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Run the migration script
Write-Host "Running migrations using ESM style..."
try {
    node runMigrations.js
}
catch {
    Write-Host "Error running ESM migrations. Trying CommonJS version..." -ForegroundColor Yellow
    node runMigrationsCJS.js
}

# Restart the server
Write-Host "Migrations completed. Restarting the server..." -ForegroundColor Green
Write-Host "You may need to restart the server manually." 