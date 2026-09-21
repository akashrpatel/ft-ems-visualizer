(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModelDefinition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 1;

  function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
  }

  function cloneRect(rect) {
    return {
      x: Number(rect.x),
      y: Number(rect.y),
      w: Number(rect.w),
      h: Number(rect.h),
    };
  }

  function cloneZone(zone) {
    return {
      id: zone.id,
      name: zone.name,
      type: zone.type,
      rect: cloneRect(zone.rect),
    };
  }

  function createModelDefinition(input) {
    return {
      schemaVersion: SCHEMA_VERSION,
      id: input.id,
      name: input.name,
      version: input.version,
      frame: cloneRect(input.frame),
      exclusionZones: (input.exclusionZones || []).map(cloneZone),
    };
  }

  function validateModelDefinition(definition) {
    const issues = [];
    if (!definition || typeof definition !== 'object') {
      return [{ type: 'invalid-model-definition', reason: 'not-an-object' }];
    }
    if (typeof definition.id !== 'string' || !definition.id.trim()) {
      issues.push({ type: 'invalid-model-definition', reason: 'missing-id' });
    }
    if (typeof definition.name !== 'string' || !definition.name.trim()) {
      issues.push({ type: 'invalid-model-definition', reason: 'missing-name' });
    }
    if (!Number.isInteger(definition.version) || definition.version < 1) {
      issues.push({ type: 'invalid-model-definition', reason: 'invalid-version' });
    }
    const frame = definition.frame;
    if (!frame || !['x', 'y', 'w', 'h'].every(key => isFiniteNumber(frame[key])) ||
      Number(frame.w) <= 0 || Number(frame.h) <= 0) {
      issues.push({ type: 'invalid-model-definition', reason: 'invalid-frame' });
    }
    if (!Array.isArray(definition.exclusionZones)) {
      issues.push({ type: 'invalid-model-definition', reason: 'invalid-exclusion-zones' });
      return issues;
    }
    const ids = new Set();
    for (const zone of definition.exclusionZones) {
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
      if (!rect || !['x', 'y', 'w', 'h'].every(key => isFiniteNumber(rect[key])) ||
        Number(rect.w) <= 0 || Number(rect.h) <= 0) {
        issues.push({ type: 'invalid-model-definition', reason: 'invalid-exclusion-rect', zoneId: zone.id });
      }
    }
    return issues;
  }

  function serializeModelDefinition(definition) {
    const normalized = createModelDefinition(definition);
    const issues = validateModelDefinition(normalized);
    if (issues.length) {
      throw new TypeError(`Invalid model definition: ${issues[0].reason}`);
    }
    return JSON.stringify(normalized, null, 2);
  }

  function applyModelDefinitions(models, definitions = []) {
    const authoredById = new Map();
    for (const definition of definitions) {
      if (!validateModelDefinition(definition).length) authoredById.set(definition.id, definition);
    }
    return models.map(model => {
      const definition = authoredById.get(model.id);
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

  return {
    SCHEMA_VERSION,
    applyModelDefinitions,
    createModelDefinition,
    serializeModelDefinition,
    validateModelDefinition,
  };
});
