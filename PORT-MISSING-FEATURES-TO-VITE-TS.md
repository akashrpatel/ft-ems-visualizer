# Port Missing Features to the Vite + TypeScript Foundation

## Objective

Restore the feature set from `origin/codex/exclusion-zones-clean` on top of the current Vite + TypeScript foundation (`codex/vite-typescript-foundation`) without reverting the new build system or returning the application runtime to a monolithic `index.html`.

The target is feature parity with commit `0a61563` while preserving:

- Vite development, production builds, and asset handling
- TypeScript entrypoint and module boundaries
- Existing theme, preference, library, 2D/3D, save/load, BOM, and export behavior
- A maintainable seam for future layout and printer-model changes

## What was lost

The Vite foundation commit replaced the feature-bearing runtime with an older extracted runtime. The missing work is present on `origin/codex/exclusion-zones-clean` and its ancestors:

| Source commit | Capability to recover |
|---|---|
| `2f96bdd` | Shared deterministic layout engine for Suggest Layout and Auto Place; fixed-component handling; explicit unplaced results |
| `23cc6b1` | Exclusion-zone geometry and placement constraints |
| `fea90fe` | Switchwire frame/logical-axis alignment |
| `d7b8555` | Switchwire raised-rail exclusion |
| `0a61563` | Local model exclusion authoring, model definitions, authoring mode, and associated UI/tests |

The feature-complete reference also contains `layout-core.js`, `model-definition.js`, `model-definitions.js`, `model-authoring.html`, and regression tests that do not exist on the current branch.

## Migration strategy

Port behavior by domain, not by copying the old `index.html` wholesale. Keep the Vite entrypoint as the composition root and move reusable logic into typed modules. Each phase should leave the application runnable and should add or migrate tests before the next phase.

### Phase 1: Establish the TypeScript seams

1. Inventory the current `src/main.ts` state and identify existing runtime globals, DOM queries, printer data, component data, placement state, and rendering state.
2. Introduce typed domain models for:
   - `PrinterModel`
   - `ComponentDefinition`
   - `PlacedComponent`
   - `ExclusionZone`
   - `LayoutState`
   - `PlacementResult`
3. Move the large printer and component catalogs out of the entrypoint into typed data modules.
4. Replace `@ts-nocheck` incrementally at module boundaries. It is acceptable to retain a temporary compatibility boundary inside the legacy renderer, but new modules should be checked.
5. Preserve the existing DOM IDs and accessible labels while moving HTML behavior into modules. This keeps the current Playwright tests stable during the migration.

Suggested module layout:

```text
src/
  main.ts
  domain/
    types.ts
    printers.ts
    components.ts
    model-definitions.ts
  layout/
    geometry.ts
    exclusion-zones.ts
    placement-engine.ts
    layout-core.ts
  ui/
    layout-ui.ts
    authoring-ui.ts
    controls.ts
  persistence/
    preferences.ts
    layouts.ts
```

### Phase 2: Port the shared layout engine first

Port `layout-core.js` from the reference branch into a typed `src/layout/layout-core.ts`. This is the central seam and must be completed before porting the higher-level authoring UI.

Required behavior:

- One deterministic geometry engine used by both Suggest Layout and Auto Place
- Component bounds that account for rotation
- Frame bounds and margins
- Locked components treated as fixed obstacles
- Existing components preserved when an auto-placement operation cannot place everything
- Explicit `placed` and `unplaced` results instead of silently overlapping or dropping components
- Stable placement output for a fixed input and printer configuration

Port the reference unit tests from `test/layout-core.test.js` to the repository's chosen test style. Keep geometry tests independent from the DOM and Three.js.

### Phase 3: Port exclusion-zone constraints

Implement exclusion zones as first-class geometry inputs to the placement engine rather than as UI-only annotations.

Required behavior:

- Rectangular zones with printer-relative coordinates
- Rotation-aware intersection checks
- Components cannot be placed inside or across excluded areas
- Locked components remain fixed even when they intersect a newly changed zone; the UI must report the conflict rather than silently moving them
- Placement failure returns an actionable unplaced list
- Zone definitions are scoped to the active printer/model and are persisted with authored model definitions where appropriate

Port and adapt the placement regression cases covering Switchwire, EnderWire, frame edges, and impossible placements. Add direct unit cases for boundary-touching, rotated, and oversized components.

### Phase 4: Restore printer-specific geometry

Recover the geometry changes in commit order:

1. Switchwire logical-axis alignment (`fea90fe`)
2. Raised-rail exclusion (`d7b8555`)
3. Any model-specific exclusion definitions used by the reference branch

Do not hard-code these exceptions inside the generic engine. Express them as printer/model definitions that produce exclusion zones or frame constraints.

### Phase 5: Restore custom frame support

Port the custom rectangular frame controls and validation from the reference UI.

Requirements:

- User can enter width and height in millimeters
- Values are validated as positive finite dimensions
- Applying a frame updates the active layout bounds and redraws both views
- Custom-frame state survives save/load where the layout format supports it
- Existing built-in printer selections remain unchanged
- Custom frames cannot use stale built-in model exclusions unless explicitly selected or authored

Add the reference custom-frame and exclusion E2E coverage, updated to use the Vite app's route and module-loaded runtime.

### Phase 6: Restore model definitions and authoring mode

Port `model-definition.js`, `model-definitions.js`, and `model-authoring.html` into typed modules and a Vite-compatible view/component path.

Required authoring capabilities:

- Create or edit a local printer/model definition
- Set frame dimensions and model metadata
- Add, edit, select, and remove exclusion zones
- Preview authored zones in the 2D view
- Persist authored definitions locally with versioned storage
- Validate definitions before activation
- Avoid corrupting the active planner state when an authored definition is invalid
- Keep generated/stored definitions separate from built-in definitions

Port the model-definition unit tests and authoring/integration E2E tests before calling this phase complete.

### Phase 7: Integrate persistence and UI behavior

Reconcile the feature branch's persistence behavior with the current Vite runtime:

- Existing theme, printer, and search preferences remain compatible
- Layout save files include the active printer/custom frame and exclusions when present
- Older layout files load with safe defaults
- Authoring data uses a separate versioned storage key
- Clear/reset operations do not unexpectedly delete authored model definitions
- UI controls expose placement failures and invalid authoring data clearly

Use migration functions for stored data rather than changing consumers to guess at multiple shapes.

### Phase 8: Build the regression gate

The final test suite should include:

- TypeScript typecheck
- Existing unit tests for toolbar, lock state, persistence helpers, and geometry
- Layout-core unit tests
- Model-definition validation tests
- Existing library, theme, save/load, and asset E2E tests
- Placement regression tests for Switchwire, EnderWire, exclusions, locked components, and impossible layouts
- Custom-frame and authoring-mode E2E tests
- Production Vite build

Run the browser tests against the assigned worktree port. For concurrent worktrees, follow `AGENTS.md` and use a dedicated port rather than sharing port 8080.

## Acceptance criteria

The port is complete when:

1. `npm run typecheck` passes without introducing new unchecked modules.
2. `npm run build` succeeds and the generated site loads the same assets through Vite.
3. Suggest Layout and Auto Place share the same deterministic engine.
4. Locked components are preserved and exclusion zones are enforced for all supported printer models.
5. Switchwire raised-rail and axis behavior has regression coverage.
6. Custom frames and local model exclusion authoring work in the browser.
7. Existing layouts and preferences remain backward-compatible.
8. The full unit and Playwright suite passes against the Vite dev server.
9. No feature implementation remains embedded in `index.html` except static markup and styles that are intentionally kept there.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Porting old globals directly recreates the monolith | Define typed domain interfaces and pure geometry seams first |
| Rotation or frame-axis mistakes reappear | Keep geometry tests independent and use model-specific fixtures |
| Authored exclusions corrupt stored data | Version and validate definitions before persistence/activation |
| UI tests pass while placement is wrong | Assert exact coordinates, intersections, and `unplaced` results in unit tests |
| Vite asset URLs differ from the old runtime | Centralize asset URL construction and test representative STL loads |
| Existing user layouts become unreadable | Add explicit load migrations and fixture tests for old JSON formats |

## Recommended execution order

Work in small commits that can be reviewed or reverted independently:

1. Typed domain types and catalog extraction
2. Typed layout-core port plus unit tests
3. Exclusion geometry plus placement regressions
4. Switchwire/EnderWire model constraints
5. Custom frame UI and persistence
6. Model definitions and authoring mode
7. Persistence migration and UI error states
8. Full regression suite and cleanup

The reference branch should remain available for differential checks throughout the port, but it should not be merged wholesale because that would reintroduce the pre-Vite monolithic runtime and discard the new TypeScript foundation.
