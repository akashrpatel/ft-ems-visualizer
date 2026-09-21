const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/\.stl$/i, route => route.abort());
});

async function chooseSuggestComponents(page) {
  const modal = page.locator('.wizard-modal');
  await page.getByRole('button', { name: /Suggest Layout/ }).click();
  await modal.locator('.wizard-search').fill('BTT SKR Mini E3');
  await modal.locator('.wizard-item').filter({ hasText: 'BTT SKR Mini E3' }).locator('input[type="checkbox"]').check();
  await modal.locator('.wizard-search').fill('Raspberry Pi 3/4');
  await modal.locator('.wizard-item').filter({ hasText: 'Raspberry Pi 3/4' }).locator('input[type="checkbox"]').check();
  await modal.getByRole('button', { name: /Generate Layout/ }).click();
}

async function openPlanner(page) {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => typeof window.LayoutCore)).toBe('object');
}

async function readLayout(page) {
  return page.evaluate(() => ({
    printer: {
      id: printer.id,
      w: printer.w,
      h: printer.h,
      exclusionZoneIds: (printer.exclusionZones || []).map(zone => zone.id),
    },
    components: placed.map(c => ({ id: c.id, name: c.name, x: c.x, y: c.y, w: c.w, h: c.h, rotation: c.rotation, locked: Boolean(c._locked) })),
    valid: LayoutCore.validateLayout(placed, printer, {
      margin: FRAME_MARGIN,
      padding: COMP_PAD,
      exclusionPadding: COMP_PAD,
    }),
  }));
}

async function downloadExportPixel(page, x, y) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export/ }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const pngBase64 = Buffer.concat(chunks).toString('base64');
  return page.evaluate(async ({ encoded, sampleX, sampleY }) => {
    const response = await fetch(`data:image/png;base64,${encoded}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const exportContext = canvas.getContext('2d');
    exportContext.drawImage(bitmap, 0, 0);
    return Array.from(exportContext.getImageData(sampleX, sampleY, 1, 1).data);
  }, { encoded: pngBase64, sampleX: x, sampleY: y });
}

test('Switchwire Suggest Layout and Auto Place share a valid deterministic placement', async ({ page }) => {
  await openPlanner(page);
  await page.selectOption('#printer', 'sw');
  await chooseSuggestComponents(page);

  const suggested = await readLayout(page);
  expect(suggested.components).toHaveLength(2);
  expect(suggested.valid).toBe(true);
  expect(suggested.printer.exclusionZoneIds).toEqual(['switchwire-raised-rail']);
  expect(suggested.components.every(component => component.y >= 55)).toBe(true);
  expect(suggested.components.every(c => c.x % 11 === 0 && c.y % 11 === 0)).toBe(true);

  await page.evaluate(() => {
    selected = placed[0];
    toggleSelectedLock();
  });
  const lockedBefore = await page.evaluate(() => ({ x: placed[0].x, y: placed[0].y, rotation: placed[0].rotation }));
  await page.getByRole('button', { name: /Auto Place/ }).click();
  const autoPlaced = await readLayout(page);
  expect(autoPlaced.valid).toBe(true);
  expect(autoPlaced.components.filter(c => c.locked)).toHaveLength(1);
  expect(autoPlaced.components.find(c => c.locked)).toMatchObject(lockedBefore);

  const firstRun = autoPlaced.components;
  await page.getByRole('button', { name: /Auto Place/ }).click();
  const secondRun = await readLayout(page);
  expect(secondRun.valid).toBe(true);
  expect(secondRun.components).toEqual(firstRun);
});

test('Switchwire frame STL uses the same 280 by 177 orientation as the 2D frame', async ({ page }) => {
  await openPlanner(page);
  await page.selectOption('#printer', 'sw');
  const hasThree = await page.evaluate(() => typeof window.THREE === 'object');
  test.skip(!hasThree, 'Three.js CDN is unavailable in this test environment');
  await page.getByRole('button', { name: /3D View/ }).click();

  const footprint = await page.evaluate(() => {
    stlCache['ems-files/FT EMS SW Frame V2.stl'] = new THREE.BoxGeometry(176.5, 280, 24);
    build3DScene();
    const frame = scene3d.children.find(child => child.userData.frameId === 'sw');
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(frame).getSize(size);
    return { width: size.x, depth: size.z };
  });

  expect(footprint.width).toBeCloseTo(280, 0);
  expect(footprint.depth).toBeCloseTo(177, 0);
});

test('EnderWire uses the same valid deterministic placement path', async ({ page }) => {
  await openPlanner(page);
  await page.selectOption('#printer', 'enderwire');
  await chooseSuggestComponents(page);

  const suggested = await readLayout(page);
  expect(suggested.components).toHaveLength(1);
  expect(suggested.components[0].name).toBe('Raspberry Pi 3/4');
  expect(suggested.valid).toBe(true);

  await page.getByRole('button', { name: /Auto Place/ }).click();
  const firstRun = await readLayout(page);
  await page.getByRole('button', { name: /Auto Place/ }).click();
  const secondRun = await readLayout(page);
  expect(firstRun.valid).toBe(true);
  expect(secondRun.components).toEqual(firstRun.components);
});

test('Suggest Layout and Auto Place avoid an injected exclusion zone', async ({ page }) => {
  await openPlanner(page);
  await page.selectOption('#printer', 'sw');
  await page.evaluate(() => {
    printer.exclusionZones = [{
      id: 'test-top-rail',
      name: 'Test top rail',
      points: [
        { x: 0, y: 0 },
        { x: 280, y: 0 },
        { x: 280, y: 30 },
        { x: 0, y: 30 },
      ],
    }];
    draw();
  });
  await chooseSuggestComponents(page);

  const suggested = await page.evaluate(() => ({
    components: placed.map(c => ({ name: c.name, x: c.x, y: c.y, rotation: c.rotation })),
    issues: placed.flatMap(c => LayoutCore.getPlacementIssues(c, placed, printer, {
      margin: FRAME_MARGIN,
      padding: COMP_PAD,
      exclusionPadding: COMP_PAD,
    }).filter(issue => issue.type === 'excluded-area')),
  }));
  expect(suggested.components).toHaveLength(2);
  expect(suggested.issues).toEqual([]);
  expect(suggested.components.every(component => component.y >= 45)).toBe(true);

  await page.getByRole('button', { name: /Auto Place/ }).click();
  const autoPlaced = await page.evaluate(() => placed.map(c => ({ name: c.name, x: c.x, y: c.y, rotation: c.rotation })));
  expect(autoPlaced).toEqual(suggested.components);
});

test('the 2D canvas visibly renders injected exclusion metadata', async ({ page }) => {
  await openPlanner(page);
  const colors = await page.evaluate(() => {
    const sample = () => Array.from(ctx.getImageData(
      Math.round(panX + 5 * scale),
      Math.round(panY + 5 * scale),
      1,
      1,
    ).data);
    const before = sample();
    printer.exclusionZones = [{
      id: 'test-corner',
      name: 'Test corner',
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
        { x: 0, y: 30 },
      ],
    }];
    draw();
    return { before, after: sample() };
  });

  expect(colors.after).not.toEqual(colors.before);
});

test('an out-of-frame exclusion is clipped to the nominal frame', async ({ page }) => {
  await openPlanner(page);
  const colors = await page.evaluate(() => {
    printer.exclusionZones = [{
      id: 'overhanging-zone',
      rect: { x: -20, y: -20, w: 40, h: 40 },
    }];
    draw();
    const sample = (x, y) => Array.from(ctx.getImageData(
      Math.round(panX + x * scale),
      Math.round(panY + y * scale),
      1,
      1,
    ).data);
    return { beyondFrame: sample(-10, -10), insideFrame: sample(10, 10) };
  });

  expect(colors.beyondFrame[3]).toBe(0);
  expect(colors.insideFrame[3]).toBe(255);
});

test('the exported PNG contains the same exclusion overlay', async ({ page }) => {
  await openPlanner(page);
  const before = await downloadExportPixel(page, 165, 195);
  await page.evaluate(() => {
    printer.exclusionZones = [{
      id: 'test-corner',
      name: 'Test corner',
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
        { x: 0, y: 30 },
      ],
    }];
    draw();
  });
  const after = await downloadExportPixel(page, 165, 195);

  expect(after).not.toEqual(before);
});

test('manual exclusion violations remain in place and display their reason', async ({ page }) => {
  await openPlanner(page);
  const clickPoint = await page.evaluate(() => {
    printer.exclusionZones = [{
      id: 'test-corner',
      name: 'Test corner',
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 80 },
        { x: 0, y: 80 },
      ],
    }];
    placed = [{
      id: 999,
      name: 'Manual fixture',
      x: 20, y: 20, w: 20, h: 20, rotation: 0,
      catColor: '#4e79a7', stl: '', orient: 'flat', _locked: false, _col: false,
    }];
    updateBOM();
    draw();
    return { x: panX + 30 * scale, y: panY + 30 * scale };
  });

  await page.locator('#canvas').click({ position: clickPoint });
  await expect(page.locator('#canvas-info')).toHaveText('Inside exclusion: Test corner');
  expect(await page.evaluate(() => ({ x: placed[0].x, y: placed[0].y, invalid: placed[0]._col })))
    .toEqual({ x: 20, y: 20, invalid: true });
});

test('legacy saves load unchanged and report new exclusion violations', async ({ page }) => {
  await openPlanner(page);
  await page.evaluate(() => {
    printer.exclusionZones = [{
      id: 'test-corner',
      name: 'Test corner',
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 80 },
        { x: 0, y: 80 },
      ],
    }];
  });
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Load/ }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'legacy-layout.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: 4,
      printer: 'trident-350',
      components: [{
        name: 'Legacy fixture',
        x: 20, y: 20, w: 20, h: 20, rotation: 0,
        catColor: '#4e79a7', stl: '', orient: 'flat', locked: false,
      }],
    })),
  });

  await expect.poll(() => page.evaluate(() => placed.length)).toBe(1);
  expect(await page.evaluate(() => ({ x: placed[0].x, y: placed[0].y, invalid: placed[0]._col })))
    .toEqual({ x: 20, y: 20, invalid: true });
  await expect(page.locator('#canvas-info')).toContainText('Legacy fixture');
  await expect(page.locator('#canvas-info')).toContainText('Test corner');
});

test('malformed exclusion metadata is reported without breaking the editor', async ({ page }) => {
  await openPlanner(page);
  await page.evaluate(() => {
    printer.exclusionZones = [{
      id: 'broken-zone',
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    }];
    draw();
  });

  await expect(page.locator('#canvas-info')).toHaveText(
    'Invalid exclusion metadata: broken-zone (too-few-points)',
  );
  await expect(page.locator('#canvas')).toBeVisible();
});

test('specialized cable-duct placement rejects excluded candidates', async ({ page }) => {
  await openPlanner(page);
  await page.evaluate(() => {
    printer.exclusionZones = [{
      id: 'test-top-band',
      name: 'Test top band',
      rect: { x: 0, y: 0, w: 470, h: 100 },
    }];
    draw();
  });
  const modal = page.locator('.wizard-modal');
  await page.getByRole('button', { name: /Suggest Layout/ }).click();
  await modal.locator('.wizard-search').fill('Cable Duct 120mm');
  await modal.locator('.wizard-item').filter({ hasText: 'Cable Duct 120mm' }).locator('input[type="checkbox"]').check();
  await modal.getByRole('button', { name: /Generate Layout/ }).click();

  const duct = await page.evaluate(() => ({
    name: placed[0]?.name,
    y: placed[0]?.y,
    issues: placed[0] ? LayoutCore.getPlacementIssues(placed[0], [], printer, {
      exclusionPadding: COMP_PAD,
    }) : [],
  }));
  expect(duct.name).toBe('Cable Duct 120mm');
  expect(duct.y).toBeGreaterThan(100);
  expect(duct.issues.filter(issue => issue.type === 'excluded-area')).toEqual([]);
});

test('Auto Place preserves the existing layout when a component is impossible to place', async ({ page }) => {
  await openPlanner(page);
  await page.selectOption('#printer', 'sw');
  await page.evaluate(() => {
    placed = [{
      id: 999,
      name: 'Impossible fixture',
      x: 15, y: 15, w: 300, h: 300, rotation: 0,
      catColor: '#4e79a7', stl: '', orient: 'flat', _locked: false, _col: false,
    }];
    updateBOM();
    draw();
  });
  const before = (await readLayout(page)).components;
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /Auto Place/ }).click();
  expect((await readLayout(page)).components).toEqual(before);
});

function binaryStlSize(body) {
  const triangleCount = body.readUInt32LE(80);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let triangle = 0, offset = 84; triangle < triangleCount; triangle++, offset += 50) {
    for (let vertex = 0; vertex < 3; vertex++) {
      for (let axis = 0; axis < 3; axis++) {
        const value = body.readFloatLE(offset + 12 + vertex * 12 + axis * 4);
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      }
    }
  }
  return max.map((value, axis) => value - min[axis]);
}

test('real frame STL bounds document the Switchwire axis discrepancy', async ({ request }) => {
  const cases = [
    { path: 'ems-files/FT EMS SW Frame V2.stl', nominal: [280, 177], nativePlanar: [177, 280] },
    { path: 'ems-files/FT_ems_swc_v2_frame.stl', nominal: [248, 266], nativePlanar: [248, 266] },
  ];
  for (const frame of cases) {
    const response = await request.get(`/${frame.path}`);
    expect(response.ok(), frame.path).toBe(true);
    const body = await response.body();
    expect(body.length, frame.path).toBeGreaterThan(1024);
    expect(body.subarray(0, 80).toString(), frame.path).not.toContain('git-lfs.github.com/spec');
    const size = binaryStlSize(body);
    expect(Math.abs(size[0] - frame.nativePlanar[0])).toBeLessThan(1);
    expect(Math.abs(size[1] - frame.nativePlanar[1])).toBeLessThan(1);
    expect([...frame.nativePlanar].sort((a, b) => a - b)).toEqual([...frame.nominal].sort((a, b) => a - b));
  }
});

test('real component STL footprints agree with their logical bounds', async ({ request }) => {
  const cases = [
    { path: 'ems-files/ft-btt-skr-mini-e3-mount.stl', logical: [105, 71] },
    { path: 'ems-files/ft-raspberry-pi-3-4-mount.stl', logical: [54, 91] },
  ];
  for (const component of cases) {
    const response = await request.get(`/${component.path}`);
    expect(response.ok(), component.path).toBe(true);
    const body = await response.body();
    expect(body.length, component.path).toBeGreaterThan(1024);
    const size = binaryStlSize(body);
    expect(Math.abs(size[0] - component.logical[0])).toBeLessThan(0.5);
    expect(Math.abs(size[1] - component.logical[1])).toBeLessThan(0.5);
  }
});
