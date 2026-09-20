const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getBounds,
  snapCoordinate,
  snapUpCoordinate,
  isInsideFrame,
  hasCollision,
  validatePlacement,
  validateLayout,
  placeComponents,
} = require('../layout-core.js');

const switchwire = { id: 'sw', w: 280, h: 177 };
const enderwire = { id: 'enderwire', w: 248, h: 266 };

function component(id, w, h, extra = {}) {
  return { id, name: id, w, h, x: 0, y: 0, rotation: 0, ...extra };
}

test('getBounds is the single rotated-footprint definition', () => {
  assert.deepEqual(getBounds(component('pi', 54, 91, { x: 12, y: 20, rotation: 1 })), {
    x: 12, y: 20, w: 91, h: 54,
  });
  assert.deepEqual(getBounds(component('pi', 54, 91, { x: 12, y: 20, rotation: 2 })), {
    x: 12, y: 20, w: 54, h: 91,
  });
});

test('component anchors retain independent 11 mm rectangular snapping', () => {
  assert.equal(snapCoordinate(16.4), 11);
  assert.equal(snapCoordinate(16.5), 22);
  assert.equal(snapUpCoordinate(11.1), 22);
  // The rendered grid's staggered ~19.05 mm rows are visual geometry; generic
  // component anchors intentionally remain independent X/Y multiples of 11.
  assert.deepEqual({ x: snapCoordinate(27), y: snapCoordinate(37) }, { x: 22, y: 33 });
});

test('validation applies frame margin and required component padding', () => {
  const a = component('a', 50, 50, { x: 15, y: 15 });
  const b = component('b', 20, 20, { x: 80, y: 15 });
  const far = component('far', 20, 20, { x: 100, y: 15 });
  assert.equal(isInsideFrame(a, switchwire, 15), true);
  assert.equal(hasCollision(a, b, 15), true);
  assert.equal(validatePlacement(a, [far], switchwire, { margin: 15, padding: 15 }), true);
  assert.equal(validatePlacement({ ...a, x: 0 }, [], switchwire, { margin: 15 }), false);
});

test('Switchwire placement is deterministic, valid, and rotates through shared bounds', () => {
  const components = [
    component('skr-mini-e3', 105, 71),
    component('raspberry-pi-3-4', 54, 91),
  ];
  const options = { frame: switchwire, margin: 15, padding: 15, gridStep: 11 };
  const first = placeComponents({ ...options, components });
  const second = placeComponents({ ...options, components });

  assert.deepEqual(first, second);
  assert.equal(first.unplaced.length, 0);
  assert.equal(first.placed.length, 2);
  assert.equal(validateLayout(first.placed, switchwire, options), true);
  assert.equal(first.placed.every(c => c.x % 11 === 0 && c.y % 11 === 0), true);
});

test('EnderWire placement is covered by the same contract', () => {
  const result = placeComponents({
    frame: enderwire,
    margin: 15,
    padding: 15,
    components: [component('skr-mini-e3', 105, 71), component('raspberry-pi-3-4', 54, 91)],
  });
  assert.equal(result.unplaced.length, 0);
  assert.equal(validateLayout(result.placed, enderwire, { margin: 15, padding: 15 }), true);
});

test('locked obstacles stay fixed and impossible placements are unplaced', () => {
  const locked = component('locked', 220, 140, { x: 30, y: 20, _locked: true });
  const result = placeComponents({
    frame: switchwire,
    margin: 15,
    padding: 15,
    fixed: [locked],
    components: [component('impossible', 100, 100)],
  });
  assert.equal(result.placed.length, 0);
  assert.deepEqual(result.unplaced.map(c => c.id), ['impossible']);
  assert.deepEqual({ x: locked.x, y: locked.y, rotation: locked.rotation }, { x: 30, y: 20, rotation: 0 });
});
