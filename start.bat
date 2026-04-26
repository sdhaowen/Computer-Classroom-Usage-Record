@echo off
setlocal
chcp 65001 >nul
title Computer Classroom Sign-in System
cd /d "%~dp0"

echo ======================================
echo 启动计算机教室签到系统...
echo ======================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [错误] 未检测到 Node.js 命令。
  echo 请先安装 Node.js（建议 LTS 版本），然后重新运行本脚本。
  echo 下载地址: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%i in ('node -v 2^>nul') do set "NODE_VERSION=%%i"
if not defined NODE_VERSION (
  echo [错误] 无法获取 Node.js 版本，请检查 Node.js 安装是否正常。
  echo.
  pause
  exit /b 1
)

echo 已检测到 Node.js 版本: %NODE_VERSION%
echo.
echo 正在启动服务，请勿关闭此窗口...
echo.

node server.js
set "EXIT_CODE=%ERRORLEVEL%"
echo.

if not "%EXIT_CODE%"=="0" (
  echo [错误] 服务启动失败（退出码: %EXIT_CODE%）。
  echo 常见原因：
  echo   1. 3000 端口已被占用
  echo   2. 当前目录权限不足或数据文件损坏
  echo.
) else (
  echo 服务已正常退出。
  echo.
)

pause
exit /b %EXIT_CODE%
