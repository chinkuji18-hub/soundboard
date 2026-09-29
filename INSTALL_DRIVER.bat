@echo off
title Install VB-Audio Cable Driver - Ultra Soundboard
color 0B
cls

cd /d "%~dp0"

echo.
echo  ======================================================
echo     VB-AUDIO CABLE DRIVER - AUTO INSTALLER (UG)
echo  ======================================================
echo.
echo  [*] Checking Windows Architecture...

if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set SETUP_EXE=%~dp0drivers\vb\VBCABLE_Setup_x64.exe
) else (
    set SETUP_EXE=%~dp0drivers\vb\VBCABLE_Setup.exe
)

if not exist "%SETUP_EXE%" (
    echo  [!] Setup file not found at: %SETUP_EXE%
    pause
    exit /b 1
)

echo  [*] Running installer with Administrator privileges...
echo  [*] Silent Mode (-i -h)...
echo.

powershell -Command "Start-Process '%SETUP_EXE%' -ArgumentList '-i -h' -Verb RunAs -Wait"

echo.
echo  ======================================================
echo   SUCCESS: VB-Audio Cable Driver Installed!
echo  ======================================================
echo.
echo   1. In your Game / Discord Settings:
echo      - Set Microphone (Input) to: CABLE Output (VB-Audio)
echo.
echo   2. In Ultra Soundboard Website:
echo      - Select Audio Output: CABLE Input (VB-Audio)
echo      - Click "Dual Voice" button to speak + play sounds together!
echo  ======================================================
echo.
pause
