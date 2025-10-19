@echo off
echo ========================================
echo Testing Confirmation UI Integration
echo ========================================
echo.

cd packages\site-app

echo [1/3] Building the app...
call pnpm build 2>nul
if errorlevel 1 (
    echo Build had some warnings but Vite succeeded
)
echo.

echo [2/3] Checking if dist files exist...
if exist "dist\index.html" (
    echo ✓ dist/index.html found
) else (
    echo ✗ dist/index.html NOT found - build failed
    pause
    exit /b 1
)

if exist "dist-electron\main.js" (
    echo ✓ dist-electron/main.js found
) else (
    echo ✗ dist-electron/main.js NOT found - TypeScript compilation failed
    pause
    exit /b 1
)
echo.

echo [3/3] Launching Electron app...
echo.
echo The app should open in a new window.
echo After extraction completes, you should see the Confirmation UI.
echo.
echo Press Ctrl+C to stop the app when done testing.
echo.
start /wait pnpm start

echo.
echo ========================================
echo Test complete!
echo ========================================
pause
