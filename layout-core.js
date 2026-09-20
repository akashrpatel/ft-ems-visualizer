(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LayoutCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function number(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function getBounds(component) {
    const rotation = ((number(component.rotation) % 4) + 4) % 4;
    const rotated = rotation % 2 === 1;
    return {
      x: number(component.x),
      y: number(component.y),
      w: rotated ? number(component.h) : number(component.w),
      h: rotated ? number(component.w) : number(component.h),
    };
  }

  function frameBounds(frame) {
    return {
      x: number(frame.x),
      y: number(frame.y),
      w: number(frame.w),
      h: number(frame.h),
    };
  }

  // Components retain the existing rectangular top-left anchor convention.
  // This deliberately does not claim that anchors lie on the rendered,
  // staggered FT-EMS hex-center lattice.
  function snapCoordinate(value, spacing = 11) {
    const step = Math.max(Number.EPSILON, number(spacing, 11));
    return Math.round(number(value) / step) * step;
  }

  function snapUpCoordinate(value, spacing = 11) {
    const step = Math.max(Number.EPSILON, number(spacing, 11));
    return Math.ceil(number(value) / step) * step;
  }

  function isInsideFrame(component, frame, margin = 0) {
    const b = getBounds(component);
    const f = frameBounds(frame);
    const m = Math.max(0, number(margin));
    return b.x >= f.x + m && b.y >= f.y + m &&
      b.x + b.w <= f.x + f.w - m && b.y + b.h <= f.y + f.h - m;
  }

  function hasCollision(a, b, padding = 0) {
    const aa = getBounds(a);
    const bb = getBounds(b);
    const p = Math.max(0, number(padding));
    return aa.x - p < bb.x + bb.w + p && aa.x + aa.w + p > bb.x - p &&
      aa.y - p < bb.y + bb.h + p && aa.y + aa.h + p > bb.y - p;
  }

  function validatePlacement(component, existing = [], frame, options = {}) {
    const margin = number(options.margin, 0);
    const padding = number(options.padding, 0);
    if (!frame || !isInsideFrame(component, frame, margin)) return false;
    return !existing.some(other => other && other !== component && hasCollision(component, other, padding));
  }

  function validateLayout(components = [], frame, options = {}) {
    if (!frame || !components.every(component => validatePlacement(component, [], frame, options))) return false;
    const padding = number(options.padding, 0);
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        if (hasCollision(components[i], components[j], padding)) return false;
      }
    }
    return true;
  }

  function stableKey(component, index) {
    return String(component.id ?? component.name ?? '') + '\u0000' + String(index).padStart(6, '0');
  }

  function candidateValues(min, max, step) {
    if (max < min) return [];
    const values = [];
    const first = Math.ceil(min / step) * step;
    for (let value = first; value <= max + 1e-9; value += step) values.push(Number(value.toFixed(6)));
    return values;
  }

  function placeComponents(options = {}) {
    const frame = options.frame;
    const margin = Math.max(0, number(options.margin, 0));
    const padding = Math.max(0, number(options.padding, 0));
    const step = Math.max(0.1, number(options.gridStep, 5));
    const fixed = [...(options.fixed || [])].map(component => ({ ...component }));
    const source = [...(options.components || [])];
    const ordered = source.map((component, index) => ({ component, index }))
      .sort((a, b) => {
        const area = number(b.component.w) * number(b.component.h) - number(a.component.w) * number(a.component.h);
        return area || stableKey(a.component, a.index).localeCompare(stableKey(b.component, b.index));
      });
    const placed = [];
    const unplaced = [];
    const occupied = [...fixed];
    const f = frameBounds(frame || {});

    for (const { component } of ordered) {
      let selected = null;
      for (let rotation = 0; rotation < 4 && !selected; rotation++) {
        const rotated = { ...component, rotation };
        const rb = getBounds(rotated);
        const minX = f.x + margin;
        const minY = f.y + margin;
        const maxX = f.x + f.w - margin - rb.w;
        const maxY = f.y + f.h - margin - rb.h;
        if (maxX < minX || maxY < minY) continue;
        const xs = candidateValues(minX, maxX, step);
        const ys = candidateValues(minY, maxY, step);
        for (const y of ys) {
          for (const x of xs) {
            const candidate = { ...rotated, x, y };
            if (validatePlacement(candidate, occupied, frame, { margin, padding })) {
              selected = candidate;
              break;
            }
          }
          if (selected) break;
        }
      }
      if (selected) {
        placed.push(selected);
        occupied.push(selected);
      } else {
        unplaced.push({ ...component });
      }
    }
    return { placed, unplaced };
  }

  return {
    getBounds,
    snapCoordinate,
    snapUpCoordinate,
    isInsideFrame,
    hasCollision,
    validatePlacement,
    validateLayout,
    placeComponents,
  };
});
