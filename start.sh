#!/bin/bash
echo "============================================"
echo "  FT EMS Layout Planner - Local Server"
echo "============================================"
echo ""
echo "Starting web server on http://localhost:8080"
echo "Press Ctrl+C to stop"
echo ""
python3 -m http.server 8080 &
sleep 1
if command -v xdg-open &>/dev/null; then xdg-open http://localhost:8080
elif command -v open &>/dev/null; then open http://localhost:8080
fi
wait
