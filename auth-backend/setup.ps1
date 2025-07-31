# DevQuery Backend Setup Script for Windows
# Run this script in PowerShell from the auth-backend directory

Write-Host "🚀 DevQuery Backend Setup" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

# Check if Node.js is installed
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
Write-Host "`n📋 Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version
    Write-Host "✅ PostgreSQL found: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PostgreSQL not found. Please install PostgreSQL from https://www.postgresql.org/download/" -ForegroundColor Yellow
    Write-Host "   You can continue setup and install PostgreSQL later." -ForegroundColor Yellow
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "`n🔧 Creating environment configuration..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file from template" -ForegroundColor Green
    Write-Host "📝 Please edit .env file with your database credentials" -ForegroundColor Yellow
} else {
    Write-Host "`n✅ Environment file already exists" -ForegroundColor Green
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
    Write-Host "✅ Created logs directory" -ForegroundColor Green
}

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "1. Edit .env file with your PostgreSQL credentials:" -ForegroundColor White
Write-Host "   - DB_HOST=localhost" -ForegroundColor Gray
Write-Host "   - DB_PORT=5432" -ForegroundColor Gray
Write-Host "   - DB_USER=postgres" -ForegroundColor Gray
Write-Host "   - DB_PASSWORD=your_password" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start PostgreSQL service:" -ForegroundColor White
Write-Host "   net start postgresql-x64-14" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Setup database:" -ForegroundColor White
Write-Host "   npm run setup" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 API will be available at: http://localhost:5000" -ForegroundColor Green
Write-Host "📖 API docs will be at: http://localhost:5000/api" -ForegroundColor Green

Write-Host "`n🎉 Setup complete! Follow the next steps above to start the server." -ForegroundColor Green
