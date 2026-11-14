@echo off
setlocal
cd /d "%~dp0"
set "PYTHONDONTWRITEBYTECODE=1"
set "XMLV11_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%XMLV11_PYTHON%" (
  "%XMLV11_PYTHON%" -B server.py --open-browser
) else (
  python -B server.py --open-browser
)
if errorlevel 1 (
  echo Python 3.10 or later is required. See README.md.
  pause
)
