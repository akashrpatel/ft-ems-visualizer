export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExclusionZone {
  id: string;
  name?: string;
  rect?: Rect;
  points?: Point[];
}

export interface LayoutComponent {
  id?: string | number;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  [key: string]: unknown;
}

export interface LayoutFrame extends Rect {
  exclusionZones?: ExclusionZone[];
}

export interface PlacementIssue {
  type: 'invalid-exclusion-zone' | 'outside-frame' | 'excluded-area' | 'component-collision' | 'unplaced';
  componentId?: string | number;
  otherComponentId?: string | number;
  zoneId?: string;
  zoneName?: string;
  reason?: string;
}

export interface PlacementOptions {
  frame?: LayoutFrame;
  fixed?: LayoutComponent[];
  components?: LayoutComponent[];
  margin?: number;
  padding?: number;
  exclusionPadding?: number;
  gridStep?: number;
}

export interface PlacementResult {
  placed: LayoutComponent[];
  unplaced: LayoutComponent[];
  issues: PlacementIssue[];
}

function number(value: unknown, fallback = 0): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function getBounds(component: LayoutComponent): Rect {
  const rotation = ((number(component.rotation) % 4) + 4) % 4;
  const rotated = rotation % 2 === 1;
  return {
    x: number(component.x),
    y: number(component.y),
    w: rotated ? number(component.h) : number(component.w),
    h: rotated ? number(component.w) : number(component.h),
  };
}

export function snapCoordinate(value: number, spacing = 11): number {
  const step = Math.max(Number.EPSILON, number(spacing, 11));
  return Math.round(number(value) / step) * step;
}

export function snapUpCoordinate(value: number, spacing = 11): number {
  const step = Math.max(Number.EPSILON, number(spacing, 11));
  return Math.ceil(number(value) / step) * step;
}

export function isInsideFrame(component: LayoutComponent, frame: Rect, margin = 0): boolean {
  const bounds = getBounds(component);
  const safeMargin = Math.max(0, number(margin));
  return bounds.x >= frame.x + safeMargin && bounds.y >= frame.y + safeMargin &&
    bounds.x + bounds.w <= frame.x + frame.w - safeMargin &&
    bounds.y + bounds.h <= frame.y + frame.h - safeMargin;
}

export function hasCollision(a: LayoutComponent, b: LayoutComponent, padding = 0): boolean {
  const first = getBounds(a);
  const second = getBounds(b);
  const safePadding = Math.max(0, number(padding));
  return first.x - safePadding < second.x + second.w + safePadding &&
    first.x + first.w + safePadding > second.x - safePadding &&
    first.y - safePadding < second.y + second.h + safePadding &&
    first.y + first.h + safePadding > second.y - safePadding;
}

function pointOnSegment(point: Point, a: Point, b: Point): boolean {
  const direction = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
  return Math.abs(direction) <= 1e-9 &&
    point.x >= Math.min(a.x, b.x) && point.x <= Math.max(a.x, b.x) &&
    point.y >= Math.min(a.y, b.y) && point.y <= Math.max(a.y, b.y);
}

function pointInPolygon(point: Point, points: Point[]): boolean {
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

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const direction = (p: Point, q: Point, r: Point) =>
    (r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x);
  const abC = direction(a, b, c);
  const abD = direction(a, b, d);
  const cdA = direction(c, d, a);
  const cdB = direction(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
    ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  return segmentsCross(a, b, c, d) || pointOnSegment(c, a, b) || pointOnSegment(d, a, b) ||
    pointOnSegment(a, c, d) || pointOnSegment(b, c, d);
}

function polygonSelfIntersects(points: Point[]): boolean {
  const vertices = new Set<string>();
  for (const point of points) {
    const key = `${point.x}\u0000${point.y}`;
    if (vertices.has(key)) return true;
    vertices.add(key);
  }
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === points.length - 1);
      if (adjacent) continue;
      if (segmentsIntersect(a, b, points[j], points[(j + 1) % points.length])) return true;
    }
  }
  return false;
}

function polygonArea(points: Point[]): number {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    twiceArea += points[i].x * next.y - next.x * points[i].y;
  }
  return Math.abs(twiceArea) / 2;
}

export function getExclusionPoints(zone: ExclusionZone): Point[] {
  if (Array.isArray(zone.points)) return zone.points;
  if (!zone.rect) return [];
  const { x, y, w, h } = zone.rect;
  return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
}

export function validateExclusionZones(zones: unknown): PlacementIssue[] {
  if (!Array.isArray(zones)) {
    return [{ type: 'invalid-exclusion-zone', reason: 'not-an-array' }];
  }
  const issues: PlacementIssue[] = [];
  const ids = new Set<string>();
  for (const rawZone of zones) {
    const zone = rawZone as Partial<ExclusionZone>;
    const points = getExclusionPoints(zone as ExclusionZone);
    let reason: string | undefined;
    if (typeof zone.id !== 'string' || !zone.id.trim()) reason = 'missing-id';
    else if (ids.has(zone.id)) reason = 'duplicate-id';
    else ids.add(zone.id);
    if (!reason) {
      if (points.length < 3) reason = 'too-few-points';
      else if (points.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))) reason = 'non-numeric-coordinate';
      else if (polygonSelfIntersects(points)) reason = 'self-intersection';
      else if (polygonArea(points) <= 1e-9) reason = 'zero-area';
    }
    if (reason) issues.push({ type: 'invalid-exclusion-zone', zoneId: zone.id, reason });
  }
  return issues;
}

function rectCorners(rect: Rect): Point[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ];
}

function rectOverlapsPolygon(rect: Rect, points: Point[]): boolean {
  const corners = rectCorners(rect);
  if (corners.some(point => pointInPolygon(point, points))) return true;
  if (points.some(point => point.x > rect.x && point.x < rect.x + rect.w && point.y > rect.y && point.y < rect.y + rect.h)) return true;
  for (let i = 0; i < corners.length; i++) {
    for (let j = 0; j < points.length; j++) {
      if (segmentsCross(corners[i], corners[(i + 1) % corners.length], points[j], points[(j + 1) % points.length])) return true;
    }
  }
  return false;
}

function pointToSegmentDistance(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const projection = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + projection * dx), point.y - (a.y + projection * dy));
}

function rectToPolygonDistance(rect: Rect, points: Point[]): number {
  const corners = rectCorners(rect);
  let distance = Infinity;
  for (let i = 0; i < corners.length; i++) {
    for (let j = 0; j < points.length; j++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      const c = points[j];
      const d = points[(j + 1) % points.length];
      if (segmentsCross(a, b, c, d)) return 0;
      distance = Math.min(distance, pointToSegmentDistance(a, c, d), pointToSegmentDistance(b, c, d), pointToSegmentDistance(c, a, b), pointToSegmentDistance(d, a, b));
    }
  }
  return distance;
}

export function getPlacementIssues(component: LayoutComponent, existing: LayoutComponent[] = [], frame?: LayoutFrame, options: PlacementOptions = {}): PlacementIssue[] {
  const metadataIssues = validateExclusionZones(frame?.exclusionZones || []);
  if (metadataIssues.length) return metadataIssues;
  const issues: PlacementIssue[] = [];
  if (!frame || !isInsideFrame(component, frame, number(options.margin))) issues.push({ type: 'outside-frame', componentId: component.id });
  for (const zone of frame?.exclusionZones || []) {
    const bounds = getBounds(component);
    const points = getExclusionPoints(zone);
    if (rectOverlapsPolygon(bounds, points) || (number(options.exclusionPadding) > 0 && rectToPolygonDistance(bounds, points) < number(options.exclusionPadding) - 1e-9)) {
      issues.push({ type: 'excluded-area', componentId: component.id, zoneId: zone.id, zoneName: zone.name });
    }
  }
  for (const other of existing) {
    if (other && other !== component && hasCollision(component, other, number(options.padding))) {
      issues.push({ type: 'component-collision', componentId: component.id, otherComponentId: other.id });
    }
  }
  return issues;
}

export function validatePlacement(component: LayoutComponent, existing: LayoutComponent[] = [], frame?: LayoutFrame, options: PlacementOptions = {}): boolean {
  return getPlacementIssues(component, existing, frame, options).length === 0;
}

export function validateLayout(components: LayoutComponent[] = [], frame?: LayoutFrame, options: PlacementOptions = {}): boolean {
  if (!frame || !components.every(component => validatePlacement(component, [], frame, options))) return false;
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (hasCollision(components[i], components[j], number(options.padding))) return false;
    }
  }
  return true;
}

function candidateValues(min: number, max: number, step: number): number[] {
  if (max < min) return [];
  const values: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + 1e-9; value += step) values.push(Number(value.toFixed(6)));
  return values;
}

export function placeComponents(options: PlacementOptions = {}): PlacementResult {
  const frame = options.frame;
  const margin = Math.max(0, number(options.margin));
  const padding = Math.max(0, number(options.padding));
  const exclusionPadding = Math.max(0, number(options.exclusionPadding));
  const step = Math.max(0.1, number(options.gridStep, 5));
  const fixed = (options.fixed || []).map(component => ({ ...component }));
  const source = [...(options.components || [])];
  const issues = validateExclusionZones(frame?.exclusionZones || []);
  if (issues.length) return { placed: [], unplaced: source.map(component => ({ ...component })), issues };
  for (let i = 0; i < fixed.length; i++) issues.push(...getPlacementIssues(fixed[i], fixed.slice(0, i), frame, { margin, padding, exclusionPadding }));
  const ordered = source.map((component, index) => ({ component, index })).sort((a, b) => {
    const area = number(b.component.w) * number(b.component.h) - number(a.component.w) * number(a.component.h);
    return area || `${a.component.id ?? a.component.name ?? ''}\u0000${a.index}`.localeCompare(`${b.component.id ?? b.component.name ?? ''}\u0000${b.index}`);
  });
  const placed: LayoutComponent[] = [];
  const unplaced: LayoutComponent[] = [];
  const occupied = [...fixed];
  const f = frame || { x: 0, y: 0, w: 0, h: 0 };
  for (const { component } of ordered) {
    let selected: LayoutComponent | undefined;
    for (let rotation = 0; rotation < 4 && !selected; rotation++) {
      const rotated = { ...component, rotation };
      const bounds = getBounds(rotated);
      const xs = candidateValues(f.x + margin, f.x + f.w - margin - bounds.w, step);
      const ys = candidateValues(f.y + margin, f.y + f.h - margin - bounds.h, step);
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
      issues.push({ type: 'unplaced', componentId: component.id, reason: 'no-valid-placement' });
    }
  }
  return { placed, unplaced, issues };
}
