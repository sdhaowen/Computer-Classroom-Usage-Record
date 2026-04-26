@echo off
chcp 65001 >nul
title 马桥镇陈庄小学计算机教室学生签到系统
cd /d %~dp0
echo 正在启动签到系统...
echo.
node server.js
pause
