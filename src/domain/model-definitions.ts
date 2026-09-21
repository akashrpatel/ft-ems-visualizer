import type { ModelDefinition } from './model-definition';

export const BUILT_IN_MODEL_DEFINITIONS: ModelDefinition[] = [{
  schemaVersion: 1,
  id: 'v24-250',
  name: 'Voron V2.4 — 250mm',
  version: 1,
  frame: { x: 0, y: 0, w: 330, h: 330 },
  exclusionZones: [{ id: 'v24-250-rear-rail', name: 'Rear rail', rect: { x: 0, y: 0, w: 330, h: 18 } }],
}, {
  schemaVersion: 1,
  id: 'sw',
  name: 'Voron Switchwire',
  version: 1,
  frame: { x: 0, y: 0, w: 280, h: 177 },
  exclusionZones: [{ id: 'switchwire-raised-rail', name: 'Raised electronics rail', rect: { x: 0, y: 0, w: 280, h: 38.2 } }],
}, {
  schemaVersion: 1,
  id: 'doom-300',
  name: 'Doom Cube 300',
  version: 1,
  frame: { x: 0, y: 0, w: 450, h: 450 },
  exclusionZones: [
    { id: 'doom-300-corner-nw', name: 'Corner', rect: { x: 0, y: 0, w: 89.5, h: 77.3 } },
    { id: 'doom-300-corner-ne', name: 'Corner', rect: { x: 360, y: 0, w: 90.2, h: 76.6 } },
    { id: 'doom-300-corner-sw', name: 'Corner', rect: { x: 0, y: 373, w: 89.5, h: 78.4 } },
    { id: 'doom-300-corner-se', name: 'Corner', rect: { x: 359, y: 373, w: 90.9, h: 76.9 } },
  ],
}, {
  schemaVersion: 1,
  id: 'doom-350',
  name: 'Doom Cube 350',
  version: 1,
  frame: { x: 0, y: 0, w: 500, h: 500 },
  exclusionZones: [
    { id: 'doom-350-corner-nw', name: 'Corner', rect: { x: 0, y: 0, w: 88.8, h: 72.9 } },
    { id: 'doom-350-corner-ne', name: 'Corner', rect: { x: 410.8, y: 0, w: 89.2, h: 74.5 } },
    { id: 'doom-350-corner-sw', name: 'Corner', rect: { x: 0, y: 424.3, w: 84.7, h: 75.7 } },
    { id: 'doom-350-corner-se', name: 'Corner', rect: { x: 412.4, y: 424.3, w: 87.6, h: 75.7 } },
  ],
}, {
  schemaVersion: 1,
  id: 'micron-180',
  name: 'Micron 180',
  version: 1,
  frame: { x: 0, y: 0, w: 280, h: 287 },
  exclusionZones: [
    { id: 'micron-180-corner-nw', name: 'Corner', rect: { x: 0, y: 0, w: 27.2, h: 34 } },
    { id: 'micron-180-corner-ne', name: 'Corner', rect: { x: 253.9, y: 0, w: 26.1, h: 37.4 } },
    { id: 'micron-180-corner-sw', name: 'Corner', rect: { x: 0, y: 253.2, w: 26.8, h: 33.8 } },
    { id: 'micron-180-corner-se', name: 'Corner', rect: { x: 253.4, y: 254.4, w: 26.6, h: 32.6 } },
  ],
}, {
  schemaVersion: 1,
  id: 'enderwire',
  name: 'EnderWire',
  version: 1,
  frame: { x: 0, y: 0, w: 248, h: 266 },
  exclusionZones: [{ id: 'enderwire-center-rail', name: 'Center Rail', rect: { x: 97.1, y: 0, w: 53.8, h: 266 } }],
}];
