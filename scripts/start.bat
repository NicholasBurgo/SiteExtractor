@echo off
echo 🚀 Starting Site Generator...
echo.

echo 📦 Installing dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🎯 Choose what to do:
echo 1. Extract from URL
echo 2. Launch Confirmation App
echo 3. Extract + Launch App
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto extract_url
if "%choice%"=="2" goto launch_app
if "%choice%"=="3" goto extract_and_launch
if "%choice%"=="4" goto exit
goto invalid_choice

:extract_url
echo.
set /p url="Enter URL to extract: "
echo 📄 Extracting from %url%...
cd packages\extractor
npx tsx src/index.ts --url %url% --out ..\..\build\extract
echo ✅ Extraction complete!
echo 📁 Check build\extract\ folder for results
pause
goto end

:launch_app
echo.
echo 🌐 Launching Confirmation App...
echo 📱 App will open in your browser at http://localhost:3000
cd packages\confirm-app
npm run dev
goto end

:extract_and_launch
echo.
set /p url="Enter URL to extract: "
echo 📄 Extracting from %url%...
cd packages\extractor
npx tsx src/index.ts --url %url% --out ..\..\build\extract
echo ✅ Extraction complete!
echo.
echo 🌐 Launching Confirmation App...
echo 📱 App will open in your browser at http://localhost:3000
cd ..\confirm-app
npm run dev
goto end

:invalid_choice
echo ❌ Invalid choice. Please enter 1, 2, 3, or 4.
pause
goto end

:exit
echo 👋 Goodbye!
goto end

:end
echo.
echo 🎉 Done!

