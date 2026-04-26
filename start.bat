@echo off
setlocal EnableExtensions
title Computer Classroom Sign-in System
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js from https://nodejs.org/ and reopen Command Prompt.
  echo.
  pause
  exit /b 1
)

echo Starting sign-in system...
echo.
node server.js
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] server.js exited with code %EXIT_CODE%.
)

echo.
pause
exit /b %EXIT_CODE%
