# Lifeline Medical Aid System - Setup Script
# Run this script to set up the project quickly

Write-Host "🏥 Lifeline Medical Aid System - Setup Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# Check Node.js
Write-Host "📦 Checking prerequisites..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check MongoDB
Write-Host ""
Write-Host "📊 Checking MongoDB..." -ForegroundColor Yellow
if (Test-Command "mongod") {
    Write-Host "✅ MongoDB installed" -ForegroundColor Green
} else {
    Write-Host "⚠️ MongoDB not found locally. You can use MongoDB Atlas instead." -ForegroundColor Yellow
    Write-Host "   Visit: https://www.mongodb.com/cloud/atlas" -ForegroundColor Yellow
}

# Install dependencies
Write-Host ""
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Installing root dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm install
Set-Location ..

Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
Set-Location ..

# Create .env files if they don't exist
Write-Host ""
Write-Host "📝 Setting up environment files..." -ForegroundColor Yellow

# Backend .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "Creating backend\.env file..." -ForegroundColor Cyan
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ Created backend\.env (please configure it with your settings)" -ForegroundColor Green
} else {
    Write-Host "✅ backend\.env already exists" -ForegroundColor Green
}

# Frontend .env
if (-not (Test-Path "frontend\.env")) {
    Write-Host "Creating frontend\.env file..." -ForegroundColor Cyan
    @"
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
"@ | Out-File -FilePath "frontend\.env" -Encoding UTF8
    Write-Host "✅ Created frontend\.env (please configure it with your settings)" -ForegroundColor Green
} else {
    Write-Host "✅ frontend\.env already exists" -ForegroundColor Green
}

# Final instructions
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure environment variables:" -ForegroundColor White
Write-Host "   - Edit backend\.env with your MongoDB URI and Google OAuth credentials" -ForegroundColor Gray
Write-Host "   - Edit frontend\.env with your Google Client ID" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Set up Google OAuth:" -ForegroundColor White
Write-Host "   - Visit: https://console.cloud.google.com/" -ForegroundColor Gray
Write-Host "   - Create OAuth 2.0 Client ID" -ForegroundColor Gray
Write-Host "   - Add to authorized origins: http://localhost:3000" -ForegroundColor Gray
Write-Host "   - Add to redirect URIs: http://localhost:5000/api/auth/google/callback" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start MongoDB (if using local):" -ForegroundColor White
Write-Host "   mongod" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Run the application:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Access the application:" -ForegroundColor White
Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "   - Backend: http://localhost:5000" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "   - README.md (full documentation)" -ForegroundColor Gray
Write-Host "   - QUICKSTART.md (step-by-step guide)" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Happy coding!" -ForegroundColor Cyan
