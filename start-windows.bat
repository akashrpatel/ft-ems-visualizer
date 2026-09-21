@echo off
cd /d "%~dp0"
findstr /b /c:"version https://git-lfs.github.com/spec/v1" "ems-files\ft-btt-octopus-mount.stl" >nul
if not errorlevel 1 (
    echo ERROR: STL models are still Git LFS pointers.
    echo Install Git LFS, then run: git lfs install ^&^& git lfs pull
    pause
    exit /b 1
)
echo ============================================
echo   FT EMS Layout Planner - Local Server
echo ============================================
echo.
echo Starting Vite dev server on http://localhost:8080
echo Press Ctrl+C to stop
echo.
echo Opening browser...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 exit /b 1
)
start http://localhost:8080
call npm run dev
if errorlevel 1 (
    echo.
    echo ERROR: Node.js and npm are required to run the local server.
    echo Install Node.js from https://nodejs.org/
    pause
)
