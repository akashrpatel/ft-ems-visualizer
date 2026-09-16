(function exposeLayoutUI(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LayoutUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLayoutUI() {
  function canDragComponent(locked) {
    return !locked;
  }

  function placeContextToolbar({ bounds, viewport, toolbar }) {
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

  function lockControlState(locked) {
    return locked
      ? { glyph: '🔒', title: 'Unlock (L)', label: 'Unlock selected component', pressed: true, active: true }
      : { glyph: '🔓', title: 'Lock (L)', label: 'Lock selected component', pressed: false, active: false };
  }

  return { canDragComponent, placeContextToolbar, lockControlState };
});
