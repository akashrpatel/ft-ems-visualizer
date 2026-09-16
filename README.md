# FT EMS Layout Planner

A web-based graphical layout planner for the [FizzysTech Electronics Management System (FT EMS)](https://github.com/fizzystech/FT-EMS) — used to organize electronics bays in Voron 3D printers.

## Features

- 🖥️ **2D Layout Editor** — Drag-and-drop components onto a hex grid
- 🎨 **3D Visualization** — Real STL backplane renders with Three.js
- 🔍 **110+ Components** — MCUs, PSUs, SBCs, fans, cable ducts and more
- 🖨️ **10 Printer Models** — Voron V0, V2.4, Trident, Switchwire, Micron, Doom Cube
- 💾 **Save/Load** — Export layouts as JSON
- 📋 **BOM & Checklist** — Parts list with print/CSV export
- 📸 **PNG Export** — Screenshot your layout in 2D or 3D

## Supported Printers

| Printer | Backplane Size |
|---------|---------------|
| Voron V0 — 120mm | 226 × 124mm |
| Voron V2.4 — 300mm | 420 × 420mm |
| Voron V2.4 — 350mm | 470 × 470mm |
| Voron Trident — 250mm | 370 × 370mm |
| Voron Trident — 300mm | 419 × 419mm |
| Voron Trident — 350mm | 470 × 470mm |
| Voron Switchwire | 280 × 177mm |
| Micron 180 | 280 × 287mm |
| Doom Cube 300 | 450 × 450mm |
| Doom Cube 350 | 500 × 500mm |

## Quick Start

### Option 1: Local
```bash
# First-time setup for a Git clone
git lfs install
git lfs pull

# Linux/Mac
./start.sh

# Windows
start-windows.bat
```

Then use `http://localhost:8080`. Do not open `index.html` directly: browsers block `file://` pages from loading the neighboring STL model files.

### Option 2: Any Web Server
Just serve the folder — it's a single `index.html` + STL files. No build step needed.

### Option 3: GitHub Pages
This repo is configured for GitHub Pages. Enable it in Settings → Pages → Deploy from branch `main`.

### Option 4: Netlify Hosted
Dev: https://stunning-genie-d26053.netlify.app/
"Prod": https://ft-ems-planner.netlify.app/

## Development and Regression Tests

The regression gate uses Playwright against the real browser UI. It covers themes and persistence, the 2D canvas palette, direct-file launch guidance, 3D theme isolation, and the STL assets involved in the Trident/Octopus loading regression.
The regression gate combines fast Node unit tests with Playwright tests against the real browser UI. It covers collapsed and searchable component menus, selected-component actions, toolbar placement, and locking behavior.

```bash
npm install
npx playwright install chromium
npm test
```

Pull requests and pushes to `main` run the same `npm test` gate in GitHub Actions.

## Zone-Based Auto Placement

The planner includes an intelligent zone-based auto-placement system that organizes components by function:

| Zone | Position | Components | Color |
|------|----------|------------|-------|
| **Peripheral** | Top (Front) | Fans, CAN/USB boards, toolhead PCBs | Teal |
| **Control** | Center | MCUs, RPi, SBCs, expansion boards | Blue |
| **Distribution** | Between | Terminal blocks, buck/DC-DC converters | Yellow |
| **Power** | Bottom (Rear) | PSUs, SSRs, AC inlets | Red |

### How to Use

1. **Suggest Layout** (✨) — Select components from the wizard, then auto-place them into zones
2. **Auto Place** (🧩) — Re-arrange already-placed components using zone-based bin packing
3. **Zones** (🗺) — Toggle zone overlay to visualize zone boundaries
4. **Zone Settings** (⚙) — Adjust zone proportions with sliders or presets

### Features

- **MaxRects bin packing** — Efficient space utilization within each zone
- **Thermal padding** — PSUs/SSRs get 10mm spacing, standard components get 5mm
- **Hex grid snap** — All placements snap to the FT EMS hex standoff pattern
- **Lock components** — Press **L** to lock/unlock; locked components are skipped during auto-place
- **Overflow handling** — Components that don't fit their zone spill into available space
- **Per-printer presets** — Zone proportions auto-adjust for small/large printers
- **Optional themes** — Choose Classic, Readable Dark, or Light from the top bar; your preference is saved in the browser

## Controls

| Key | Action |
|-----|--------|
| Click component | Select |
| Drag | Move component |
| Context toolbar ↻ / R | Rotate selected 90° |
| Context toolbar ⧉ / D | Duplicate selected |
| Context toolbar 🔓/🔒 / L | Lock/unlock selected (prevents dragging and auto-placement) |
| Context toolbar × / Delete/Backspace | Remove selected |
| Scroll | Zoom |
| Middle-click drag | Pan |

## Credits

- **FT EMS** by [FizzysTech](https://github.com/fizzystech/FT-EMS)
- **STL files** from the FT EMS mount repository
- Built with [Three.js](https://threejs.org/)

## License

STL files are from the FT EMS project. Planner code is provided as-is for the Voron community.
