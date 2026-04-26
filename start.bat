@echo off
setlocal enableextensions
chcp 65001 >nul
title Computer Classroom Sign-in System

pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to switch to script directory:
    echo         %~dp0
    echo.
    echo Common causes:
    echo - Current path contains invalid characters
    echo - Permission denied
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js from:
    echo https://nodejs.org/
    echo.
    echo After installation, reopen this file.
    echo.
    pause
    exit /b 1
)

if not exist "server.js" (
    echo [ERROR] server.js not found in:
    echo         %CD%
    echo.
    echo Please ensure start.bat and server.js are in the same folder.
    echo.
    pause
    exit /b 1
)

echo Starting sign-in system...
echo.
node "server.js"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo [ERROR] Server exited with code %EXIT_CODE%.
    echo.
    echo Common causes:
    echo - Port 3000 is already in use
    echo - server.js has syntax/runtime errors
    echo - data folder has no write permission
    echo.
)

pause
popd >nul
exit /b %EXIT_CODE%
