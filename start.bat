@echo off
chcp 65001 >nul
title Computer Classroom Sign-in System
cd /d %~dp0
set "PORT=3000"

echo ======================================
echo Starting sign-in system...
echo Student page : http://127.0.0.1:%PORT%
echo Admin page   : http://127.0.0.1:%PORT%/admin
echo Press Ctrl+C to stop the server.
echo ======================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js first, then run this file again.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:%PORT%"
node server.js
if errorlevel 1 (
  echo.
  echo [ERROR] Server stopped unexpectedly. See details above.
)
pause
