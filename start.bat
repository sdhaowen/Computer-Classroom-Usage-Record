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
echo.
node server.js

echo.
echo 服务已退出（可能是手动关闭，或出现异常后退出）。
pause
