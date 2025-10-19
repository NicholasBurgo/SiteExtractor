@echo off
echo ========================================
echo Site Generator - Confirmation UI
echo ========================================
echo.

cd packages\site-app

echo [1/2] Building the app...
call pnpm build
echo.

echo [2/2] Starting the app...
echo.
echo The Electron window should open now.
echo After extraction, you'll see the Confirmation UI!
echo.
echo Press Ctrl+C to stop when done.
echo.
call pnpm start
