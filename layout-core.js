(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LayoutCore = api;
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

  function pointInRect(point, rect) {
    return point.x > rect.x && point.x < rect.x + rect.w &&
      point.y > rect.y && point.y < rect.y + rect.h;
  }

  function pointInPolygon(point, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i];
      const b = points[j];
      if (pointOnSegment(point, a, b)) return false;
      const crosses = (a.y > point.y) !== (b.y > point.y) &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function direction(a, b, c) {
    return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
  }

  function pointOnSegment(point, a, b) {
    return Math.abs(direction(a, b, point)) <= 1e-9 &&
      point.x >= Math.min(a.x, b.x) && point.x <= Math.max(a.x, b.x) &&
      point.y >= Math.min(a.y, b.y) && point.y <= Math.max(a.y, b.y);
  }

  function segmentsCross(a, b, c, d) {
    const abC = direction(a, b, c);
    const abD = direction(a, b, d);
    const cdA = direction(c, d, a);
    const cdB = direction(c, d, b);
    return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
      ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
  }

  function segmentsIntersect(a, b, c, d) {
    return segmentsCross(a, b, c, d) ||
      pointOnSegment(c, a, b) || pointOnSegment(d, a, b) ||
      pointOnSegment(a, c, d) || pointOnSegment(b, c, d);
  }

  function getRectCorners(rect) {
    return [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h },
      { x: rect.x, y: rect.y + rect.h },
    ];
  }

  function rectOverlapsPolygon(rect, points) {
    const corners = getRectCorners(rect);
    if (corners.some(point => pointInPolygon(point, points))) return true;
    if (points.some(point => pointInRect(point, rect))) return true;
    if (pointInPolygon({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }, points)) return true;
    for (let i = 0; i < corners.length; i++) {
      const rectA = corners[i];
      const rectB = corners[(i + 1) % corners.length];
      for (let j = 0; j < points.length; j++) {
        if (segmentsCross(rectA, rectB, points[j], points[(j + 1) % points.length])) return true;
      }
    }
    return false;
  }

  function pointToSegmentDistance(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
    const projection = Math.max(0, Math.min(1,
      ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    return Math.hypot(point.x - (a.x + projection * dx), point.y - (a.y + projection * dy));
  }

  function segmentDistance(a, b, c, d) {
    if (segmentsCross(a, b, c, d)) return 0;
    return Math.min(
      pointToSegmentDistance(a, c, d),
      pointToSegmentDistance(b, c, d),
      pointToSegmentDistance(c, a, b),
      pointToSegmentDistance(d, a, b),
    );
  }

  function rectToPolygonDistance(rect, points) {
    const corners = getRectCorners(rect);
    let distance = Infinity;
    for (let i = 0; i < corners.length; i++) {
      for (let j = 0; j < points.length; j++) {
        distance = Math.min(distance, segmentDistance(
          corners[i], corners[(i + 1) % corners.length],
          points[j], points[(j + 1) % points.length],
        ));
      }
    }
    return distance;
  }

  function polygonSelfIntersects(points) {
    const vertices = new Set();
    for (const point of points) {
      const key = `${point.x}\u0000${point.y}`;
      if (vertices.has(key)) return true;
      vertices.add(key);
    }
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      for (let j = i + 1; j < points.length; j++) {
        const adjacent = j === i || j === i + 1 || (i === 0 && j === points.length - 1);
        if (adjacent) continue;
        const c = points[j];
        const d = points[(j + 1) % points.length];
        if (segmentsIntersect(a, b, c, d)) return true;
      }
    }
    return false;
  }

  function polygonArea(points) {
    let twiceArea = 0;
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      twiceArea += points[i].x * next.y - next.x * points[i].y;
    }
    return Math.abs(twiceArea) / 2;
  }

  function getExclusionPoints(zone) {
    if (Array.isArray(zone?.points)) return zone.points;
    if (!zone?.rect) return [];
    const { x, y, w, h } = zone.rect;
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }

  function validateExclusionZones(zones = []) {
    if (!Array.isArray(zones)) {
      return [{ type: 'invalid-exclusion-zone', zoneId: undefined, reason: 'not-an-array' }];
    }
    const issues = [];
    const zoneIds = new Set();
    for (const zone of zones) {
      const points = getExclusionPoints(zone);
      let reason = null;
      if (typeof zone?.id !== 'string' || !zone.id.trim()) reason = 'missing-id';
      else if (zoneIds.has(zone.id)) reason = 'duplicate-id';
      else zoneIds.add(zone.id);
      if (!reason) {
        if (points.length < 3) reason = 'too-few-points';
        else if (points.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))) {
          reason = 'non-numeric-coordinate';
        } else if (polygonSelfIntersects(points)) reason = 'self-intersection';
        else if (polygonArea(points) <= 1e-9) reason = 'zero-area';
      }
      if (reason) {
        issues.push({
          type: 'invalid-exclusion-zone',
          zoneId: zone?.id,
          reason,
        });
      }
    }
    return issues;
  }

  function getPlacementIssues(component, existing = [], frame, options = {}) {
    const metadataIssues = validateExclusionZones(frame?.exclusionZones || []);
    if (metadataIssues.length) return metadataIssues;
    const issues = [];
    if (!frame || !isInsideFrame(component, frame, number(options.margin, 0))) {
      issues.push({ type: 'outside-frame', componentId: component.id });
    }
    for (const zone of frame?.exclusionZones || []) {
      const bounds = getBounds(component);
      const exclusionPadding = Math.max(0, number(options.exclusionPadding, 0));
      const points = getExclusionPoints(zone);
      const overlaps = rectOverlapsPolygon(bounds, points);
      const withinClearance = exclusionPadding > 0 &&
        rectToPolygonDistance(bounds, points) < exclusionPadding - 1e-9;
      if (overlaps || withinClearance) {
        issues.push({
          type: 'excluded-area',
          componentId: component.id,
          zoneId: zone.id,
          zoneName: zone.name,
        });
      }
    }
    for (const other of existing) {
      if (other && other !== component && hasCollision(component, other, number(options.padding, 0))) {
        issues.push({ type: 'component-collision', componentId: component.id, otherComponentId: other.id });
      }
    }
    return issues;
  }

  function validatePlacement(component, existing = [], frame, options = {}) {
    return getPlacementIssues(component, existing, frame, options).length === 0;
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
    const exclusionPadding = Math.max(0, number(options.exclusionPadding, 0));
    const step = Math.max(0.1, number(options.gridStep, 5));
    const fixed = [...(options.fixed || [])].map(component => ({ ...component }));
    const source = [...(options.components || [])];
    const issues = validateExclusionZones(frame?.exclusionZones || []);
    if (issues.length) {
      return { placed: [], unplaced: source.map(component => ({ ...component })), issues };
    }
    for (let i = 0; i < fixed.length; i++) {
      issues.push(...getPlacementIssues(fixed[i], fixed.slice(0, i), frame, {
        margin,
        padding,
        exclusionPadding,
      }));
    }
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
            if (validatePlacement(candidate, occupied, frame, { margin, padding, exclusionPadding })) {
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
        issues.push({
          type: 'unplaced',
          componentId: component.id,
          reason: 'no-valid-placement',
        });
      }
    }
    return { placed, unplaced, issues };
  }

  return {
    getBounds,
    snapCoordinate,
    snapUpCoordinate,
    isInsideFrame,
    hasCollision,
    getExclusionPoints,
    validateExclusionZones,
    getPlacementIssues,
    validatePlacement,
    validateLayout,
    placeComponents,
  };
});
