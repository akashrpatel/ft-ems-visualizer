export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface ToolbarSize {
  width: number;
  height: number;
}

export interface ToolbarPlacement {
  left: number;
  top: number;
  placement: 'above' | 'below';
}

export interface LockControlState {
  glyph: '🔓' | '🔒';
  title: 'Lock (L)' | 'Unlock (L)';
  label: 'Lock selected component' | 'Unlock selected component';
  pressed: boolean;
  active: boolean;
}

export function canDragComponent(locked: boolean): boolean {
  return !locked;
}

export function placeContextToolbar({
  bounds,
  viewport,
  toolbar,
}: {
  bounds: Bounds;
  viewport: Viewport;
  toolbar: ToolbarSize;
}): ToolbarPlacement {
  const gap = 8;
  const edgePadding = 6;
  const placeBelow = bounds.top - toolbar.height - gap < edgePadding;
  const centeredLeft = (bounds.left + bounds.right) / 2;

  return {
    left: Math.max(
      toolbar.width / 2 + edgePadding,
      Math.min(viewport.width - toolbar.width / 2 - edgePadding, centeredLeft),
    ),
    top: placeBelow ? bounds.bottom + gap : bounds.top - gap,
    placement: placeBelow ? 'below' : 'above',
  };
}

export function lockControlState(locked: boolean): LockControlState {
  return locked
    ? {
        glyph: '🔒',
        title: 'Unlock (L)',
        label: 'Unlock selected component',
        pressed: true,
        active: true,
      }
    : {
        glyph: '🔓',
        title: 'Lock (L)',
        label: 'Lock selected component',
        pressed: false,
        active: false,
      };
}
