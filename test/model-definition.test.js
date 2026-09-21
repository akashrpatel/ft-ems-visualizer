const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createModelDefinition,
  applyModelDefinitions,
  serializeModelDefinition,
  validateModelDefinition,
} = require('../model-definition.js');

test('model definitions preserve printer geometry and rectangular exclusions when serialized', () => {
  const definition = createModelDefinition({
    id: 'switchwire',
    name: 'Voron Switchwire',
    version: 2,
    frame: { x: 0, y: 0, w: 280, h: 177 },
    exclusionZones: [{
      id: 'rear-rail',
      name: 'Rear raised rail',
      type: 'rail',
      rect: { x: 0, y: 0, w: 280, h: 18 },
    }],
  });

  assert.deepEqual(JSON.parse(serializeModelDefinition(definition)), {
    schemaVersion: 1,
    id: 'switchwire',
    name: 'Voron Switchwire',
    version: 2,
    frame: { x: 0, y: 0, w: 280, h: 177 },
    exclusionZones: [{
      id: 'rear-rail',
      name: 'Rear raised rail',
      type: 'rail',
      rect: { x: 0, y: 0, w: 280, h: 18 },
    }],
  });
});

test('authored model definitions merge exclusions without dropping planner metadata', () => {
  const models = applyModelDefinitions([
    { id: 'v24-250', name: 'Voron V2.4 — 250mm', w: 330, h: 330, frameStls: [{ stl: 'frame.stl' }] },
  ], [{
    schemaVersion: 1,
    id: 'v24-250',
    name: 'Voron V2.4 — 250mm',
    version: 3,
    frame: { x: 0, y: 0, w: 330, h: 330 },
    exclusionZones: [{ id: 'rear-rail', name: 'Rear rail', type: 'rail', rect: { x: 0, y: 0, w: 330, h: 18 } }],
  }]);

  assert.deepEqual(models, [{
    id: 'v24-250',
    name: 'Voron V2.4 — 250mm',
    w: 330,
    h: 330,
    frameStls: [{ stl: 'frame.stl' }],
    definitionVersion: 3,
    exclusionZones: [{ id: 'rear-rail', name: 'Rear rail', type: 'rail', rect: { x: 0, y: 0, w: 330, h: 18 } }],
  }]);
});

test('model definition validation rejects duplicate exclusion ids', () => {
  const issues = validateModelDefinition({
    id: 'custom',
    name: 'Custom plate',
    version: 1,
    frame: { x: 0, y: 0, w: 100, h: 100 },
    exclusionZones: [
      { id: 'rail', name: 'Rail', type: 'rail', rect: { x: 0, y: 0, w: 10, h: 10 } },
      { id: 'rail', name: 'Second rail', type: 'rail', rect: { x: 20, y: 0, w: 10, h: 10 } },
    ],
  });

  assert.deepEqual(issues, [{
    type: 'invalid-model-definition',
    reason: 'duplicate-exclusion-id',
    zoneId: 'rail',
  }]);
});
