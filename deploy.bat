@echo off
REM ============================================================
REM  Sarab store - one-command deploy to Cloudflare Pages
REM  Usage:  deploy.bat            (build dist + deploy)
REM          deploy.bat build      (build dist only, no deploy)
REM ============================================================
setlocal
cd /d "%~dp0"

echo [1/2] Building dist ...
REM /MIR makes dist an exact copy of the site files (old files in dist are removed).
robocopy . dist /MIR /NFL /NDL /NJH /NJS /NP ^
  /XD .git .firebase .wrangler .claude dist node_modules ^
  /XF DEPLOY.md README.md firestore.rules firestore.rules.suggested firebase.json .firebaserc .gitignore deploy.bat create-admin.bat create-admin.ps1
if %ERRORLEVEL% GEQ 8 (
  echo Build failed: robocopy error %ERRORLEVEL%
  exit /b 1
)

if /i "%~1"=="build" (
  echo Done. dist is ready - deploy skipped.
  exit /b 0
)

echo [2/2] Deploying to Cloudflare Pages (project: sarab) ...
call npx --yes wrangler@latest pages deploy dist --project-name sarab --branch main --commit-dirty=true
if errorlevel 1 (
  echo Deploy failed. If you are not logged in, run:  npx wrangler login
  exit /b 1
)
echo Deploy finished.
endlocal
