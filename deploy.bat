@echo off
REM ============================================================
REM  Sarab store - deploy commands
REM    deploy.bat          build dist + publish the site to https://sarab-3tor.web.app
REM    deploy.bat build    build dist only (no publish)
REM    deploy.bat rules    publish Firestore security rules
REM    deploy.bat api      publish the email server (OTP + promo emails)
REM    deploy.bat key      save the Brevo API key on the email server (you paste it here)
REM    deploy.bat all      site + rules + api
REM ============================================================
setlocal
cd /d "%~dp0"
set PROJECT=sarab-3tor
set MODE=%~1

if /i "%MODE%"=="rules" goto :rules
if /i "%MODE%"=="api" goto :api
if /i "%MODE%"=="key" goto :key

:build
echo [build] Preparing dist ...
REM /MIR makes dist an exact copy of the site files (old files inside dist are removed).
robocopy . dist /MIR /NFL /NDL /NJH /NJS /NP ^
  /XD .git .firebase .wrangler .claude dist node_modules worker ^
  /XF *.md *.bat *.ps1 firestore.rules firestore.rules.suggested firebase.json .firebaserc .gitignore
if %ERRORLEVEL% GEQ 8 ( echo Build failed: robocopy error %ERRORLEVEL% & exit /b 1 )
if /i "%MODE%"=="build" ( echo Done. dist is ready - publish skipped. & exit /b 0 )

echo [site] Publishing to https://%PROJECT%.web.app ...
call npx --yes firebase-tools@latest deploy --only hosting --project %PROJECT%
if errorlevel 1 ( echo Publish failed. If you are not logged in run:  npx firebase-tools@latest login & exit /b 1 )
if /i not "%MODE%"=="all" goto :done

:rules
echo [rules] Publishing Firestore rules ...
call npx --yes firebase-tools@latest deploy --only firestore:rules --project %PROJECT%
if errorlevel 1 ( echo Rules publish failed. & exit /b 1 )
if /i not "%MODE%"=="all" goto :done

:api
echo [api] Publishing the email server ...
pushd worker
call npx --yes wrangler@latest deploy
set ERR=%ERRORLEVEL%
popd
if not "%ERR%"=="0" ( echo API publish failed. If you are not logged in run:  npx wrangler login & exit /b 1 )
goto :done

:key
echo Paste your Brevo API key when asked (it is stored encrypted on Cloudflare, never in the site files).
pushd worker
call npx --yes wrangler@latest secret put BREVO_API_KEY
popd

:done
echo Done.
endlocal
