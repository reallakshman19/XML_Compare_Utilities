@echo off
cd /d "%~dp0..\.."
where py >nul 2>nul
if errorlevel 1 (
  python prototypes\ciifr-map\server.py
) else (
  py -3 prototypes\ciifr-map\server.py
)
if errorlevel 1 pause
