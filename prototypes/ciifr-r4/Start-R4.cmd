@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" goto usage
if "%~2"=="" goto usage
where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  py -3 -m ciifr_r4 --input "%~1" --out "%~2"
) else (
  python -m ciifr_r4 --input "%~1" --out "%~2"
)
exit /b %ERRORLEVEL%
:usage
echo Usage: Start-R4.cmd "C:\private\original.CII" "C:\private\new-r4-result"
echo Output destination MUST NOT exist; results stay on this computer.
exit /b 2
