@echo off
REM Creates the admin login for the Sarab dashboard. You type the password here, in this window only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-admin.ps1"
pause
