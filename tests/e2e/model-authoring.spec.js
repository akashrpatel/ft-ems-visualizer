const { test, expect } = require('@playwright/test');

test('model authoring uses the planner canvas and shows existing Switchwire zones', async ({ page }) => {
  await page.goto('/model-authoring.html');
  await expect(page).toHaveTitle('FT EMS Layout Planner');
  await expect(page.locator('#topbar')).toBeVisible();
  await expect(page.locator('#canvas')).toBeVisible();
  await expect(page.locator('#authoring-controls')).toBeVisible();

  await page.selectOption('#printer', 'sw');
  await expect(page.locator('#authoring-zone-list')).toContainText('Raised electronics rail');
});

test('model authoring exposes the planner top-down 3D view', async ({ page }) => {
  await page.goto('/model-authoring.html');
  await expect(page.locator('#btn-topdown')).toBeVisible();

  await page.getByRole('button', { name: 'Top-down 3D' }).click();
  const viewState = await page.evaluate(() => ({ view: currentView, topDown: topDown3D }));
  expect(viewState).toEqual({ view: '3d', topDown: true });
});

test('2D authoring selects an existing exclusion from the zone row', async ({ page }) => {
  await page.goto('/model-authoring.html');
  await page.selectOption('#printer', 'sw');
  await expect(page.getByRole('button', { name: 'Rename selected' })).toBeDisabled();
  const canvas = page.locator('#canvas');
  const box = await canvas.boundingBox();
  const point = await page.evaluate(() => ({ x: panX + scale * 150, y: panY + scale * 28 }));
  await page.mouse.click(box.x + point.x, box.y + point.y);
  const selected = await page.evaluate(() => topDownSelectedZoneId);
  expect(selected).toBe('switchwire-raised-rail');
  await expect(page.getByRole('button', { name: 'Rename selected' })).toBeEnabled();
  await page.getByLabel('Zone name').fill('Electronics rail');
  await page.getByRole('button', { name: 'Rename selected' }).click();
  await expect(page.locator('#authoring-zone-list')).toContainText('Electronics rail');
});

test('top-down authoring is fixed and draws exclusions in printer coordinates', async ({ page }) => {
  await page.goto('/model-authoring.html');
  await page.selectOption('#printer', 'sw');
  await page.getByRole('button', { name: 'Top-down 3D' }).click();
  await page.getByLabel('Zone name').fill('Top-down rail');
  await page.getByRole('button', { name: 'Draw exclusion' }).click();

  const surface = page.locator('#topdown-draw-layer');
  await expect(surface).toBeVisible();
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
  await page.mouse.up();

  await expect(page.locator('#authoring-zone-list')).toContainText('Top-down rail');
  const state = await page.evaluate(() => ({ view: currentView, topDown: topDown3D, controlsEnabled: controls3d ? controls3d.enabled : false }));
  expect(state).toEqual({ view: '3d', topDown: true, controlsEnabled: false });
  await page.getByRole('button', { name: 'Delete Top-down rail' }).click();
  await expect(page.locator('#authoring-zone-list')).not.toContainText('Top-down rail');
});

test('model authoring draws and exports a new exclusion using the planner canvas', async ({ page }) => {
  await page.goto('/model-authoring.html');
  await page.selectOption('#printer', 'sw');
  await page.getByLabel('Zone name').fill('Service clearance');
  await page.getByRole('button', { name: 'Draw exclusion' }).click();

  const canvas = page.locator('#canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 180, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 300, box.y + 220);
  await page.mouse.up();

  await expect(page.locator('#authoring-zone-list')).toContainText('Service clearance');
  await page.locator('#authoring-export').locator('summary').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save model definition' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ft-ems-model-sw.json');
});
