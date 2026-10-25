@echo off
chcp 65001 > nul
title Sardorning Sotuv Boti
echo ====================================================
echo 🚀 Telegram Sotuv Manager Boti ishga tushirilmoqda...
echo ====================================================
cd /d "%~dp0"

:loop
node index.js
echo.
echo [!] Bot to'xtadi yoki aloqa uzildi. 5 soniyadan so'ng qayta ishga tushiriladi...
timeout /t 5 > nul
goto loop
