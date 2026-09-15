const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canDragComponent,
  placeContextToolbar,
  measurementFontPx,
  lockControlState,
} = require('../layout-ui.js');

test('locked components cannot begin a drag', () => {
  assert.equal(canDragComponent(true), false);
  assert.equal(canDragComponent(false), true);
});

test('context toolbar is centered above a selected component', () => {
  assert.deepEqual(placeContextToolbar({
    bounds: { left: 300, top: 200, right: 500, bottom: 300 },
    viewport: { width: 800, height: 600 },
    toolbar: { width: 150, height: 36 },
  }), { left: 400, top: 192, placement: 'above' });
});

test('context toolbar moves below a selection near the top edge', () => {
  assert.deepEqual(placeContextToolbar({
    bounds: { left: 300, top: 30, right: 500, bottom: 130 },
    viewport: { width: 800, height: 600 },
    toolbar: { width: 150, height: 36 },
  }), { left: 400, top: 138, placement: 'below' });
});

test('context toolbar stays inside the left edge of the canvas', () => {
  assert.deepEqual(placeContextToolbar({
    bounds: { left: -30, top: 200, right: 70, bottom: 300 },
    viewport: { width: 800, height: 600 },
    toolbar: { width: 150, height: 36 },
  }), { left: 81, top: 192, placement: 'above' });
});

test('context toolbar stays inside the right edge of the canvas', () => {
  assert.deepEqual(placeContextToolbar({
    bounds: { left: 730, top: 200, right: 830, bottom: 300 },
    viewport: { width: 800, height: 600 },
    toolbar: { width: 150, height: 36 },
  }), { left: 719, top: 192, placement: 'above' });
});

test('Readable Dark uses a larger canvas measurement font', () => {
  assert.equal(measurementFontPx('readable-dark'), 13);
});

test('other themes retain the compact canvas measurement font', () => {
  assert.deepEqual([
    measurementFontPx('classic'),
    measurementFontPx('light'),
  ], [10, 10]);
});

test('lock control clearly distinguishes unlocked and locked states', () => {
  assert.deepEqual([
    lockControlState(false),
    lockControlState(true),
  ], [
    { glyph: '🔓', title: 'Lock (L)', label: 'Lock selected component', pressed: false, active: false },
    { glyph: '🔒', title: 'Unlock (L)', label: 'Unlock selected component', pressed: true, active: true },
  ]);
});
