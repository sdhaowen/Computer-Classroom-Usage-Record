@echo off
setlocal
chcp 65001 >nul
title Computer Classroom Sign-in System
cd /d %~dp0
echo Starting sign-in system...
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js LTS first: https://nodejs.org/
  echo.
  echo 未检测到 Node.js，请先安装后再运行本程序。
  pause
  exit /b 1
)

echo If this window keeps running, the server is active.
echo Student page: http://127.0.0.1:3000
echo Admin page:   http://127.0.0.1:3000/admin
echo Press Ctrl+C to stop the server.
echo.
node server.js
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Server exited with code %EXIT_CODE%.
  echo Common cause: port 3000 is already occupied.
)
pause
exit /b %EXIT_CODE%
