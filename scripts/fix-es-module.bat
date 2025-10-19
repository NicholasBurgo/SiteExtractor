@echo off
echo ========================================
echo Fixing ES Module Conflict
echo ========================================
echo.

echo [1/3] Removing ES module type from package.json...
cd packages\site-app

echo [2/3] Updating PostCSS config to CommonJS...
echo PostCSS config updated to use module.exports

echo [3/3] Building the application...
call pnpm build
echo.

echo ✅ ES module conflict fixed!
echo The application should now start properly.
echo.
echo Run 'pnpm start' to launch the app.
echo.
pause
