const { test, expect } = require('@playwright/test');

async function chooseSuggestComponents(page) {
  const modal = page.locator('.wizard-modal');
  await page.getByRole('button', { name: /Suggest Layout/ }).click();
  await modal.locator('.wizard-search').fill('BTT SKR Mini E3');
  await modal.locator('.wizard-item').filter({ hasText: 'BTT SKR Mini E3' }).locator('input[type="checkbox"]').check();
  await modal.locator('.wizard-search').fill('Raspberry Pi 3/4');
  await modal.locator('.wizard-item').filter({ hasText: 'Raspberry Pi 3/4' }).locator('input[type="checkbox"]').check();
  await modal.getByRole('button', { name: /Generate Layout/ }).click();
}

async function readLayout(page) {
  return page.evaluate(() => ({
    printer: { id: printer.id, w: printer.w, h: printer.h },
    components: placed.map(c => ({ id: c.id, name: c.name, x: c.x, y: c.y, w: c.w, h: c.h, rotation: c.rotation, locked: Boolean(c._locked) })),
    valid: LayoutCore.validateLayout(placed, printer, { margin: FRAME_MARGIN, padding: COMP_PAD }),
  }));
}

test('Switchwire Suggest Layout and Auto Place share a valid deterministic placement', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#printer', 'sw');
  await chooseSuggestComponents(page);

  const suggested = await readLayout(page);
  expect(suggested.components).toHaveLength(2);
  expect(suggested.valid).toBe(true);
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

test('EnderWire uses the same valid deterministic placement path', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#printer', 'enderwire');
  await chooseSuggestComponents(page);

  const suggested = await readLayout(page);
  expect(suggested.components).toHaveLength(2);
  expect(suggested.valid).toBe(true);

  await page.getByRole('button', { name: /Auto Place/ }).click();
  const firstRun = await readLayout(page);
  await page.getByRole('button', { name: /Auto Place/ }).click();
  const secondRun = await readLayout(page);
  expect(firstRun.valid).toBe(true);
  expect(secondRun.components).toEqual(firstRun.components);
});

test('Auto Place preserves the existing layout when a component is impossible to place', async ({ page }) => {
  await page.goto('/');
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
