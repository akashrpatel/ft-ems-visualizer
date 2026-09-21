#!/bin/bash
APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)" || exit 1
cd "$APP_DIR" || exit 1

if grep -q '^version https://git-lfs.github.com/spec/v1$' ems-files/ft-btt-octopus-mount.stl; then
  echo "ERROR: STL models are still Git LFS pointers."
  echo "Install Git LFS, then run: git lfs install && git lfs pull"
  exit 1
fi

echo "============================================"
echo "  FT EMS Layout Planner - Local Server"
echo "============================================"
echo ""
echo "Starting Vite dev server on http://localhost:8080"
echo "Press Ctrl+C to stop"
echo ""
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install || exit 1
fi
if [ "${FT_EMS_NO_BROWSER:-0}" != "1" ]; then
  if command -v xdg-open &>/dev/null; then xdg-open http://localhost:8080
  elif command -v open &>/dev/null; then open http://localhost:8080
  fi
fi
npm run dev
