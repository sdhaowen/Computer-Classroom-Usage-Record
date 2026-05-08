@echo off
setlocal EnableExtensions
chcp 65001 >nul
title 计算机教室签到系统
cd /d "%~dp0"

cls
echo ==================================================
echo   计算机教室签到与后台管理系统
echo ==================================================
echo.
echo [1/2] 检查 Node.js 环境...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [错误] 未检测到 Node.js。
  echo        请先安装 Node.js 并将其加入 PATH 后重试。
  echo        下载地址: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo [2/2] 启动服务中...
echo    学生端: http://127.0.0.1:3000
echo    后台端: http://127.0.0.1:3000/admin
echo.
node server.js
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [错误] 服务异常退出，退出码: %EXIT_CODE%
  pause
  exit /b %EXIT_CODE%
)

echo 服务已停止。
pause
exit /b %EXIT_CODE%
