@echo off
REM One-click deploy for TestSphere: commit + push + deploy backend and frontend.
REM Usage: double-click, or run  deploy.bat "your change description"
setlocal
cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=Update TestSphere"

echo.
echo === Committing changes ===
git add frontend/src backend/src backend/prisma
git diff --cached --quiet && (echo No code changes to commit.) || git commit -m "%MSG%"

echo.
echo === Pushing to GitHub ===
git push || goto :error

echo.
echo === Deploying backend ===
pushd backend
call vercel --prod --yes || (popd & goto :error)
popd

echo.
echo === Deploying frontend ===
pushd frontend
call vercel --prod --yes || (popd & goto :error)
popd

echo.
echo Done. Open https://frontend-taupe-psi-95.vercel.app and press Ctrl+F5.
pause
exit /b 0

:error
echo.
echo Something failed above. Copy the messages and send them to Claude.
pause
exit /b 1
