const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/\.stl$/i, route => route.abort());
});

test('custom frames expose dimensions and exclusions in the planner', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Printer Model').selectOption('custom');
  await expect(page.locator('#custom-frame-controls')).toBeVisible();
  await page.getByLabel('Custom frame width (mm)').fill('320');
  await page.getByLabel('Custom frame height (mm)').fill('240');
  await page.getByRole('button', { name: 'Apply custom frame' }).click();
  await expect(page.getByLabel('Frame dimensions')).toContainText('320 × 240 mm');

  await page.getByLabel('Custom exclusion name').fill('Rear rail');
  await page.getByRole('button', { name: 'Add custom exclusion' }).click();
  await expect(page.locator('#custom-exclusion-list')).toContainText('Rear rail');
});

test('authoring mode exposes built-in model exclusions', async ({ page }) => {
  await page.goto('/?mode=authoring');
  await expect(page.locator('#model-controls')).toBeVisible();
  await page.getByLabel('Printer Model').selectOption('sw');
  await expect(page.locator('#authoring-zone-list')).toContainText('Raised electronics rail');
});
