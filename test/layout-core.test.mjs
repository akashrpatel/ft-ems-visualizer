import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBounds,
  hasCollision,
  getPlacementIssues,
  validateExclusionZones,
  validateLayout,
  placeComponents,
} from '../src/layout/layout-core.ts';

const component = (id, w, h, extra = {}) => ({ id, name: id, w, h, x: 0, y: 0, rotation: 0, ...extra });

test('rotated bounds are the single footprint definition', () => {
  assert.deepEqual(getBounds(component('pi', 54, 91, { x: 12, y: 20, rotation: 1 })), {
    x: 12, y: 20, w: 91, h: 54,
  });
});

test('placement respects frame bounds, padding, and collisions', () => {
  const frame = { x: 0, y: 0, w: 100, h: 100 };
  const a = component('a', 20, 20, { x: 10, y: 10 });
  const b = component('b', 20, 20, { x: 25, y: 10 });
  assert.equal(hasCollision(a, b, 5), true);
  assert.equal(validateLayout([a], frame), true);
  assert.equal(getPlacementIssues({ ...a, x: -1 }, [], frame).at(0).type, 'outside-frame');
});

test('malformed exclusion zones fail closed', () => {
  assert.deepEqual(validateExclusionZones([{
    id: 'broken',
    points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
  }]), [{ type: 'invalid-exclusion-zone', zoneId: 'broken', reason: 'too-few-points' }]);
});

test('automatic placement is deterministic and preserves locked obstacles', () => {
  const locked = component('locked', 30, 30, { x: 0, y: 0, _locked: true });
  const options = {
    frame: { x: 0, y: 0, w: 100, h: 50 },
    fixed: [locked],
    gridStep: 10,
    components: [component('movable', 20, 20)],
  };
  const first = placeComponents(options);
  const second = placeComponents(options);
  assert.deepEqual(first, second);
  assert.equal(first.placed.length, 1);
  assert.deepEqual({ x: locked.x, y: locked.y }, { x: 0, y: 0 });
});

test('automatic placement reports impossible exclusion-zone placements', () => {
  const result = placeComponents({
    frame: {
      x: 0, y: 0, w: 50, h: 50,
      exclusionZones: [{ id: 'all', rect: { x: 0, y: 0, w: 50, h: 50 } }],
    },
    components: [component('controller', 20, 20)],
  });
  assert.deepEqual(result.unplaced.map(item => item.id), ['controller']);
  assert.deepEqual(result.issues, [{ type: 'unplaced', componentId: 'controller', reason: 'no-valid-placement' }]);
});
