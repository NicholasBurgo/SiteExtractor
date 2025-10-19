@echo off
echo ========================================
echo Fixing Site Generator Build Issues
echo ========================================
echo.

echo [1/4] Installing dependencies...
cd packages\site-app
call pnpm install
echo.

echo [2/4] Installing Electron dependencies...
call pnpm exec electron-builder install-app-deps
echo.

echo [3/4] Building the application...
call pnpm build
echo.

echo [4/4] Testing the application...
echo.
echo The application should now work properly!
echo Run 'pnpm start' to launch the app.
echo.
pause
