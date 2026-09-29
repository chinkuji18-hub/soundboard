@echo off
title UG Ultra Soundboard - Local Server
color 0A
cls

:: IMPORTANT: Change to the folder where this bat file lives
cd /d "%~dp0"

echo.
echo  ============================================
echo   UG ULTRA SOUNDBOARD - SERVER LAUNCHER
echo  ============================================
echo.
echo  [*] Folder: %cd%
echo.

:: Kill any old process using port 8080
echo  [*] Freeing port 8080...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Get local IP address
set IP=Unknown
for /f "skip=1 tokens=3" %%a in ('wmic nicconfig where "IPEnabled=True" get IPAddress') do (
    if not "%%a"=="IPAddress" (
        set RAWIP=%%a
        goto :found
    )
)
:found
:: clean the IP (remove quotes, braces)
set IP=%RAWIP:{=%
set IP=%IP:}=%
set IP=%IP:"=%

echo  [*] PC Local IP  : %IP%
echo  [*] Server Port  : 8080
echo.
echo  ============================================
echo   OPEN IN BROWSER:
echo  ============================================
echo.
echo   PC     --^>  http://localhost:8080
echo   Mobile --^>  http://%IP%:8080
echo.
echo   (PC and Mobile must be on SAME WiFi)
echo  ============================================
echo.
echo  [*] Server is starting... Browser opens in 2 sec.
echo  [*] Press CTRL+C anytime to stop.
echo.

:: Open browser after 2 seconds (non-blocking)
start cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

:: Start Python HTTP server from current directory (no --directory flag needed)
python -m http.server 8080 --bind 0.0.0.0

if %errorlevel% neq 0 (
    echo  [!] Trying py command...
    start cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"
    py -m http.server 8080 --bind 0.0.0.0
)

if %errorlevel% neq 0 (
    echo.
    echo  ============================================
    echo   ERROR: Python not found!
    echo   Install: https://python.org/downloads
    echo  ============================================
    echo.
)
pause
