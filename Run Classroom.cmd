@echo off
setlocal
cd /d "%~dp0"
echo.
echo  CLASSROOM - Results workspace
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python is required. Install Python 3.11 or newer and include it in PATH.
  goto failed
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.12 or newer is required. Install it, then run this file again.
  goto failed
)
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  if errorlevel 1 goto failed
)
echo Preparing the Python backend...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 goto failed
if not exist "node_modules\.package-lock.json" (
  echo Installing the interface...
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 goto failed
)
echo Building your dashboard...
call npm.cmd run build
if errorlevel 1 goto failed
".venv\Scripts\python.exe" launch.py
exit /b
:failed
echo.
echo Setup could not finish. See the message above.
pause
exit /b 1
