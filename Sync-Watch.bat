@echo off
REM ============================================================
REM   CREA GRAPHIX - Portfolio content sync (WATCH mode, Windows)
REM   Double-click to start auto-sync, then LEAVE THIS WINDOW OPEN.
REM   Every time you add or rename a certificate, project image,
REM   or profile photo, the site data (content.js) updates itself.
REM   Press Ctrl+C or close the window to stop.
REM ============================================================
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found on this computer.
  echo   Install it from https://nodejs.org  then run this again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Watching your asset folders... leave this window open.
echo   Add files and they appear automatically. Press Ctrl+C to stop.
echo.
node sync.js --watch
pause
