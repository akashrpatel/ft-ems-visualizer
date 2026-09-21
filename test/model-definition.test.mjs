import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createModelDefinition,
  serializeModelDefinition,
  validateModelDefinition,
} from '../src/domain/model-definition.ts';

test('model definitions validate frame and exclusion rectangles', () => {
  const definition = createModelDefinition({
    id: 'custom', name: 'Custom', version: 1,
    frame: { x: 0, y: 0, w: 400, h: 300 },
    exclusionZones: [{ id: 'rail', name: 'Rail', rect: { x: 0, y: 0, w: 400, h: 20 } }],
  });
  assert.deepEqual(validateModelDefinition(definition), []);
  assert.match(serializeModelDefinition(definition), /"schemaVersion": 1/);
});

test('invalid model definitions fail validation and serialization', () => {
  const definition = { id: '', name: '', version: 0, frame: { x: 0, y: 0, w: 0, h: 0 }, exclusionZones: [] };
  assert.ok(validateModelDefinition(definition).length > 0);
  assert.throws(() => serializeModelDefinition(definition), /Invalid model definition/);
});
