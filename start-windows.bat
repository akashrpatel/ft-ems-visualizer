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
echo Starting web server on http://localhost:8080
echo Press Ctrl+C to stop
echo.
echo Opening browser...
start http://localhost:8080
python -m http.server 8080 --bind 127.0.0.1
if errorlevel 1 (
    echo.
    echo Python not found! Trying python3...
    python3 -m http.server 8080 --bind 127.0.0.1
)
if errorlevel 1 (
    echo.
    echo ERROR: Python is required to run the local server.
    echo Install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during install.
    pause
)
