@echo off
echo 🚀 Starting FAST Development Server...
echo.

REM Clear Next.js cache for fresh start
if exist .next rmdir /s /q .next
echo ✅ Cache cleared

REM Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

REM Start development server with optimizations
echo 🚀 Starting Next.js with Turbo...
npm run turbo-dev

pause
