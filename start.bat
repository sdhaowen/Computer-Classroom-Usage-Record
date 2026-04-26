@echo off
chcp 65001 >nul
title Computer Classroom Sign-in System
cd /d %~dp0
echo Starting sign-in system...
echo.
node server.js
pause
