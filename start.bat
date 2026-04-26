@echo off
setlocal
chcp 65001 >nul
title 计算机教室签到系统
cd /d %~dp0

echo ============================================================
echo  马桥镇陈庄小学
echo  计算机教室签到与后台管理系统
echo ============================================================
echo.
echo  正在启动服务器，请稍候...
echo  启动后请勿关闭本窗口。
echo.
echo  访问地址（默认端口 3000）：
echo    学生签到： http://127.0.0.1:3000/
echo    后台管理： http://127.0.0.1:3000/admin.html
echo    局域网访问： http://本机IP:3000/
echo.
echo  停止服务：按 Ctrl + C
echo ============================================================
echo.
node server.js
echo.
echo 服务已停止，按任意键关闭窗口...
pause >nul
endlocal