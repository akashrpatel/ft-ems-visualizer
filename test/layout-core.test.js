const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getBounds,
  snapCoordinate,
  snapUpCoordinate,
  isInsideFrame,
  hasCollision,
  validateExclusionZones,
  getPlacementIssues,
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

test('placement diagnostics identify an overlapping exclusion zone', () => {
  const frame = {
    w: 100,
    h: 100,
    exclusionZones: [{
      id: 'rear-rail',
      name: 'Rear rail',
      points: [
        { x: 0, y: 70 },
        { x: 100, y: 70 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    }],
  };
  const issues = getPlacementIssues(component('controller', 20, 20, { x: 40, y: 60 }), [], frame);

  assert.deepEqual(issues, [{
    type: 'excluded-area',
    componentId: 'controller',
    zoneId: 'rear-rail',
    zoneName: 'Rear rail',
  }]);
});

test('rectangle shorthand uses the same canonical exclusion geometry', () => {
  const frame = {
    w: 100,
    h: 100,
    exclusionZones: [{
      id: 'rear-rail',
      name: 'Rear rail',
      rect: { x: 0, y: 70, w: 100, h: 30 },
    }],
  };

  assert.deepEqual(getPlacementIssues(
    component('controller', 20, 20, { x: 40, y: 60 }),
    [],
    frame,
  ), [{
    type: 'excluded-area',
    componentId: 'controller',
    zoneId: 'rear-rail',
    zoneName: 'Rear rail',
  }]);
});

test('boolean validators reject exclusion-zone overlap', () => {
  const frame = {
    w: 100,
    h: 100,
    exclusionZones: [{
      id: 'rear-rail',
      points: [
        { x: 0, y: 70 },
        { x: 100, y: 70 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    }],
  };
  const excluded = component('excluded', 20, 20, { x: 40, y: 60 });

  assert.equal(validatePlacement(excluded, [], frame), false);
  assert.equal(validateLayout([excluded], frame), false);
});

test('concave zones may extend outside the frame without excluding their notch', () => {
  const frame = {
    w: 100,
    h: 100,
    exclusionZones: [{
      id: 'u-shaped-rail',
      points: [
        { x: -10, y: -10 },
        { x: 110, y: -10 },
        { x: 110, y: 110 },
        { x: 70, y: 110 },
        { x: 70, y: 30 },
        { x: 30, y: 30 },
        { x: 30, y: 110 },
        { x: -10, y: 110 },
      ],
    }],
  };

  assert.equal(validatePlacement(component('in-notch', 20, 20, { x: 40, y: 50 }), [], frame), true);
  assert.equal(validatePlacement(component('on-arm', 10, 20, { x: 10, y: 50 }), [], frame), false);
});

test('exclusion metadata rejects self-intersecting polygons', () => {
  assert.deepEqual(validateExclusionZones([{
    id: 'bow-tie',
    points: [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
      { x: 10, y: 30 },
      { x: 30, y: 10 },
    ],
  }]), [{
    type: 'invalid-exclusion-zone',
    zoneId: 'bow-tie',
    reason: 'self-intersection',
  }]);
});

test('exclusion metadata rejects a polygon that touches itself at a repeated vertex', () => {
  assert.deepEqual(validateExclusionZones([{
    id: 'self-touching',
    points: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
      { x: 20, y: 0 },
    ],
  }]), [{
    type: 'invalid-exclusion-zone',
    zoneId: 'self-touching',
    reason: 'self-intersection',
  }]);
});

test('exclusion metadata rejects a vertex touching a non-adjacent edge', () => {
  assert.deepEqual(validateExclusionZones([{
    id: 'edge-touch',
    points: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 10, y: 0 },
      { x: 0, y: 20 },
    ],
  }]), [{
    type: 'invalid-exclusion-zone',
    zoneId: 'edge-touch',
    reason: 'self-intersection',
  }]);
});

test('exclusion metadata rejects incomplete and non-numeric polygons', () => {
  assert.deepEqual(validateExclusionZones([
    { id: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    { id: 'bad-coordinate', points: [{ x: 0, y: 0 }, { x: 'ten', y: 0 }, { x: 0, y: 10 }] },
  ]), [
    { type: 'invalid-exclusion-zone', zoneId: 'line', reason: 'too-few-points' },
    { type: 'invalid-exclusion-zone', zoneId: 'bad-coordinate', reason: 'non-numeric-coordinate' },
  ]);
});

test('exclusion metadata rejects a non-array zone collection without throwing', () => {
  assert.deepEqual(validateExclusionZones({ id: 'not-a-list' }), [{
    type: 'invalid-exclusion-zone',
    zoneId: undefined,
    reason: 'not-an-array',
  }]);
});

test('exclusion metadata rejects zero-area polygons', () => {
  assert.deepEqual(validateExclusionZones([{
    id: 'flat',
    points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
  }]), [{
    type: 'invalid-exclusion-zone',
    zoneId: 'flat',
    reason: 'zero-area',
  }]);
});

test('exclusion metadata requires stable unique zone ids', () => {
  const triangle = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
  assert.deepEqual(validateExclusionZones([
    { points: triangle },
    { id: 'duplicate', points: triangle },
    { id: 'duplicate', points: triangle },
  ]), [
    { type: 'invalid-exclusion-zone', zoneId: undefined, reason: 'missing-id' },
    { type: 'invalid-exclusion-zone', zoneId: 'duplicate', reason: 'duplicate-id' },
  ]);
});

test('exclusion padding is one-sided while zero-clearance boundary contact is valid', () => {
  const frame = {
    w: 100,
    h: 100,
    exclusionZones: [{
      id: 'rear-rail',
      points: [
        { x: 0, y: 70 },
        { x: 100, y: 70 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    }],
  };
  const touching = component('touching', 20, 20, { x: 40, y: 50 });

  assert.equal(validatePlacement(touching, [], frame, { exclusionPadding: 0 }), true);
  assert.equal(validatePlacement(touching, [], frame, { exclusionPadding: 1 }), false);
});

test('exclusion padding uses minimum Euclidean distance at diagonal corners', () => {
  const frame = {
    w: 100,
    h: 100,
    exclusionZones: [{
      id: 'corner-block',
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 30 },
        { x: 40, y: 40 },
        { x: 30, y: 40 },
      ],
    }],
  };
  const nearCorner = component('near-corner', 20, 20, { x: 5, y: 5 });

  assert.equal(validatePlacement(nearCorner, [], frame, { exclusionPadding: 6 }), true);
  assert.equal(validatePlacement(nearCorner, [], frame, { exclusionPadding: 8 }), false);
});

test('automatic placement fails closed for malformed exclusion metadata', () => {
  const result = placeComponents({
    frame: {
      w: 100,
      h: 100,
      exclusionZones: [{ id: 'bad-zone', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }],
    },
    components: [component('controller', 20, 20)],
  });

  assert.deepEqual(result.placed, []);
  assert.deepEqual(result.unplaced.map(item => item.id), ['controller']);
  assert.deepEqual(result.issues, [{
    type: 'invalid-exclusion-zone',
    zoneId: 'bad-zone',
    reason: 'too-few-points',
  }]);
});

test('automatic placement reports components with no valid candidate', () => {
  const result = placeComponents({
    frame: {
      w: 50,
      h: 50,
      exclusionZones: [{ id: 'all', rect: { x: 0, y: 0, w: 50, h: 50 } }],
    },
    components: [component('controller', 20, 20)],
  });

  assert.deepEqual(result.unplaced.map(item => item.id), ['controller']);
  assert.deepEqual(result.issues, [{
    type: 'unplaced',
    componentId: 'controller',
    reason: 'no-valid-placement',
  }]);
});

test('automatic placement reports collisions between fixed obstacles', () => {
  const result = placeComponents({
    frame: { w: 100, h: 100 },
    fixed: [
      component('fixed-a', 30, 30, { x: 10, y: 10, _locked: true }),
      component('fixed-b', 30, 30, { x: 20, y: 20, _locked: true }),
    ],
    components: [],
  });

  assert.deepEqual(result.issues, [{
    type: 'component-collision',
    componentId: 'fixed-b',
    otherComponentId: 'fixed-a',
  }]);
});

test('direct validation reports malformed exclusion metadata and fails closed', () => {
  const frame = {
    w: 100,
    h: 100,
    exclusionZones: [{ id: 'bad-zone', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }],
  };
  const controller = component('controller', 20, 20, { x: 40, y: 40 });

  assert.deepEqual(getPlacementIssues(controller, [], frame), [{
    type: 'invalid-exclusion-zone',
    zoneId: 'bad-zone',
    reason: 'too-few-points',
  }]);
  assert.equal(validatePlacement(controller, [], frame), false);
});

test('automatic placement deterministically skips exclusion zones and their clearance', () => {
  const options = {
    frame: {
      w: 100,
      h: 50,
      exclusionZones: [{
        id: 'left-rail',
        points: [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 30, y: 50 },
          { x: 0, y: 50 },
        ],
      }],
    },
    exclusionPadding: 5,
    gridStep: 10,
    components: [component('controller', 20, 20)],
  };

  const first = placeComponents(options);
  const second = placeComponents(options);
  assert.deepEqual(first, second);
  assert.deepEqual(first.placed.map(item => ({ x: item.x, y: item.y })), [{ x: 40, y: 0 }]);
  assert.deepEqual(first.unplaced, []);
});

test('automatic placement preserves a locked exclusion violation and reports it', () => {
  const locked = component('locked-controller', 20, 20, { x: 5, y: 5, _locked: true });
  const result = placeComponents({
    frame: {
      w: 100,
      h: 50,
      exclusionZones: [{
        id: 'left-rail',
        name: 'Left rail',
        points: [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 30, y: 50 },
          { x: 0, y: 50 },
        ],
      }],
    },
    fixed: [locked],
    gridStep: 10,
    components: [component('movable', 20, 20)],
  });

  assert.deepEqual({ x: locked.x, y: locked.y }, { x: 5, y: 5 });
  assert.deepEqual(result.placed.map(item => ({ id: item.id, x: item.x })), [{ id: 'movable', x: 30 }]);
  assert.deepEqual(result.issues, [{
    type: 'excluded-area',
    componentId: 'locked-controller',
    zoneId: 'left-rail',
    zoneName: 'Left rail',
  }]);
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
