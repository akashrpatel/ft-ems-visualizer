import type { ExclusionZone, Rect } from '../layout/layout-core';

export const MODEL_SCHEMA_VERSION = 1;

export interface ModelDefinition {
  schemaVersion: number;
  id: string;
  name: string;
  version: number;
  frame: Rect;
  exclusionZones: ExclusionZone[];
}

function finite(value: unknown): boolean {
  return Number.isFinite(Number(value));
}

function cloneRect(rect: Rect): Rect {
  return { x: Number(rect.x), y: Number(rect.y), w: Number(rect.w), h: Number(rect.h) };
}

function cloneZone(zone: ExclusionZone): ExclusionZone {
  return {
    id: zone.id,
    name: zone.name,
    rect: zone.rect ? cloneRect(zone.rect) : undefined,
    points: zone.points?.map(point => ({ x: Number(point.x), y: Number(point.y) })),
  };
}

export function createModelDefinition(input: Omit<ModelDefinition, 'schemaVersion'> & Partial<Pick<ModelDefinition, 'schemaVersion'>>): ModelDefinition {
  return {
    schemaVersion: MODEL_SCHEMA_VERSION,
    id: input.id,
    name: input.name,
    version: input.version,
    frame: cloneRect(input.frame),
    exclusionZones: (input.exclusionZones || []).map(cloneZone),
  };
}

export function validateModelDefinition(definition: unknown): Array<Record<string, unknown>> {
  const issues: Array<Record<string, unknown>> = [];
  if (!definition || typeof definition !== 'object') return [{ type: 'invalid-model-definition', reason: 'not-an-object' }];
  const model = definition as Partial<ModelDefinition>;
  if (typeof model.id !== 'string' || !model.id.trim()) issues.push({ type: 'invalid-model-definition', reason: 'missing-id' });
  if (typeof model.name !== 'string' || !model.name.trim()) issues.push({ type: 'invalid-model-definition', reason: 'missing-name' });
  if (!Number.isInteger(model.version) || (model.version || 0) < 1) issues.push({ type: 'invalid-model-definition', reason: 'invalid-version' });
  const frame = model.frame;
  if (!frame || !['x', 'y', 'w', 'h'].every(key => finite(frame[key as keyof Rect])) || Number(frame.w) <= 0 || Number(frame.h) <= 0) {
    issues.push({ type: 'invalid-model-definition', reason: 'invalid-frame' });
  }
  if (!Array.isArray(model.exclusionZones)) return [...issues, { type: 'invalid-model-definition', reason: 'invalid-exclusion-zones' }];
  const ids = new Set<string>();
  for (const zone of model.exclusionZones) {
    if (typeof zone?.id !== 'string' || !zone.id.trim()) {
      issues.push({ type: 'invalid-model-definition', reason: 'missing-exclusion-id', zoneId: zone?.id });
      continue;
    }
    if (ids.has(zone.id)) {
      issues.push({ type: 'invalid-model-definition', reason: 'duplicate-exclusion-id', zoneId: zone.id });
      continue;
    }
    ids.add(zone.id);
    const rect = zone.rect;
    if (!rect || !['x', 'y', 'w', 'h'].every(key => finite(rect[key as keyof Rect])) || Number(rect.w) <= 0 || Number(rect.h) <= 0) {
      issues.push({ type: 'invalid-model-definition', reason: 'invalid-exclusion-rect', zoneId: zone.id });
    }
  }
  return issues;
}

export function serializeModelDefinition(definition: ModelDefinition): string {
  const normalized = createModelDefinition(definition);
  const issues = validateModelDefinition(normalized);
  if (issues.length) throw new TypeError(`Invalid model definition: ${String(issues[0].reason)}`);
  return JSON.stringify(normalized, null, 2);
}

export function applyModelDefinitions<T extends { id: string; name: string; w: number; h: number }>(models: T[], definitions: ModelDefinition[] = []): Array<T & { exclusionZones?: ExclusionZone[]; definitionVersion?: number }> {
  const valid = new Map(definitions.filter(definition => validateModelDefinition(definition).length === 0).map(definition => [definition.id, definition]));
  return models.map(model => {
    const definition = valid.get(model.id);
    if (!definition) return model;
    return {
      ...model,
      name: definition.name,
      w: Number(definition.frame.w),
      h: Number(definition.frame.h),
      definitionVersion: definition.version,
      exclusionZones: definition.exclusionZones.map(cloneZone),
    };
  });
}
