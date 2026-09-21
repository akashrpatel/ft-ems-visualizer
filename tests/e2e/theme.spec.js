const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/\.stl$/i, route => route.abort());
});

test('Classic remains the default theme', async ({ page }) => {
  await page.goto('/');

  const theme = page.getByLabel('Color theme');
  await expect(theme).toHaveValue('classic');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(26, 26, 46)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(224, 224, 224)');
});

test('theme choices change the UI and 2D canvas, then survive a reload', async ({ page }) => {
  await page.goto('/');
  const theme = page.getByLabel('Color theme');
  const classicCanvas = await page.locator('#canvas').screenshot();

  await theme.selectOption('readable-dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'readable-dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 18, 32)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(248, 250, 252)');
  const darkCanvas = await page.locator('#canvas').screenshot();
  expect(darkCanvas.equals(classicCanvas)).toBe(false);

  await page.reload();
  await expect(theme).toHaveValue('readable-dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 18, 32)');

  await theme.selectOption('light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(238, 242, 247)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(23, 32, 51)');
  const lightCanvas = await page.locator('#canvas').screenshot();
  expect(lightCanvas.equals(darkCanvas)).toBe(false);
});

test('changing the UI theme does not alter the 3D viewport', async ({ page }) => {
  await page.goto('/');
  const hasThree = await page.evaluate(() => typeof window.THREE === 'object');
  test.skip(!hasThree, 'Three.js CDN is unavailable in this test environment');
  await page.getByLabel('Printer Model').selectOption('v24-250');
  await page.getByRole('button', { name: '3D View' }).click();

  const viewport = page.locator('#view-3d canvas:not(#topdown-draw-layer)');
  await expect(viewport).toBeVisible();
  const bounds = await viewport.boundingBox();
  const backgroundSample = {
    x: Math.floor(bounds.x + 4),
    y: Math.floor(bounds.y + 4),
    width: 8,
    height: 8,
  };
  const classic3d = await page.screenshot({ clip: backgroundSample });

  await page.getByLabel('Color theme').selectOption('light');
  const light3d = await page.screenshot({ clip: backgroundSample });
  expect(light3d.equals(classic3d)).toBe(true);
});
