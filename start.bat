@echo off
chcp 65001 >nul
title 管理员: School Sign-in Server
cd /d %~dp0

if "%PORT%"=="" (
  set "PORT=3000"
)

echo ======================================
echo Maqiao Chenzhuang Primary School
echo Computer Lab Sign-in System
echo ======================================
echo.
echo Starting server, please wait...
echo Do NOT close this window while running.
echo.
echo 访问地址:
echo   本机: http://localhost:%PORT%
echo   本机: http://127.0.0.1:%PORT%
echo.
echo 学生签到: /
echo 管理后台: /admin
echo.
echo 按 Ctrl+C 停止服务器
echo ======================================
echo.

node server.js
pause
