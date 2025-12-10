# PowerShell Database initialization script for Social Capital CRM (Windows)

Write-Host "🚀 Initializing Social Capital CRM Database..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  No .env file found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please update .env with your configuration before running this script again." -ForegroundColor Yellow
    exit 1
}

# Load environment variables from .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

# Default values if not set
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "socialcapital" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_PASSWORD = $env:DB_PASSWORD

Write-Host "📊 Database Configuration:" -ForegroundColor Cyan
Write-Host "  Host: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $DB_PASSWORD

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c '\q' 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Ignore error and continue
    }
    Write-Host "PostgreSQL is unavailable - sleeping"
    Start-Sleep -Seconds 2
    $attempt++
}

if ($attempt -eq $maxAttempts) {
    Write-Host "❌ Failed to connect to PostgreSQL after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

# Create database if it doesn't exist
Write-Host "📦 Creating database if not exists..." -ForegroundColor Cyan
$checkDb = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>&1
if ($checkDb -notmatch "1") {
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME"
    Write-Host "✅ Database created!" -ForegroundColor Green
} else {
    Write-Host "✅ Database already exists!" -ForegroundColor Green
}

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
$migrations = Get-ChildItem -Path "backend\src\db\migrations\*.sql" | Sort-Object Name
foreach ($migration in $migrations) {
    Write-Host "  Running: $($migration.Name)" -ForegroundColor Gray
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migration.FullName
}
Write-Host "✅ Database migrations completed!" -ForegroundColor Green

# Ask if user wants to load demo data
$loadDemo = Read-Host "📋 Load demo data? (y/n)"
if ($loadDemo -eq "y" -or $loadDemo -eq "Y") {
    Write-Host "📊 Loading demo data..." -ForegroundColor Cyan
    Push-Location backend
    node src/db/seeders/demo-data.js
    Pop-Location
    Write-Host "✅ Demo data loaded!" -ForegroundColor Green
}

Write-Host "`n🎉 Database initialization complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Start the backend: cd backend && npm start"
Write-Host "  2. Start the frontend: cd frontend && npm start"
Write-Host "  3. Or use Docker: docker-compose up"
