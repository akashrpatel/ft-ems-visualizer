const { test, expect } = require('@playwright/test');

test('authoring mode reuses the planner layout and Switchwire exclusions', async ({ page }) => {
  await page.goto('/model-authoring.html');
  await expect(page).toHaveTitle('FT EMS Layout Planner');
  await expect(page.locator('#topbar')).toBeVisible();
  await expect(page.locator('#canvas')).toBeVisible();
  await expect(page.locator('#authoring-controls')).toBeVisible();
  await page.selectOption('#printer', 'sw');
  await expect(page.locator('#authoring-zone-list')).toContainText('Raised electronics rail');
});

test('authoring query remains local-only while custom frame stays available', async ({ page }) => {
  await page.goto('/index.html?mode=authoring');

  await expect(page.locator('#authoring-controls')).toBeVisible();
  await page.selectOption('#printer', 'custom');
  await expect(page.locator('#custom-frame-controls')).toBeVisible();
});
