@echo off
setlocal
cd /d "%~dp0"
set "PYTHONDONTWRITEBYTECODE=1"
set "XMLV2_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%XMLV2_PYTHON%" (
  "%XMLV2_PYTHON%" -B server.py --open-browser
) else (
  python -B server.py --open-browser
)
if errorlevel 1 (
  echo Python 3 is required. See README.md for launch instructions.
  pause
)
