const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/\.stl$/i, route => route.abort());
  await page.goto('/');
});

async function applyCustomFrame(page) {
  await page.getByLabel('Printer Model').selectOption('custom');
  await page.getByLabel('Custom frame width (mm)').fill('360');
  await page.getByLabel('Custom frame height (mm)').fill('240');
  await page.getByRole('button', { name: 'Apply custom frame' }).click();
}

test('custom layouts accept a rectangular exclusion', async ({ page }) => {
  await applyCustomFrame(page);
  await page.getByLabel('Custom exclusion ID').fill('left-rail');
  await page.getByLabel('Custom exclusion name').fill('Left rail');
  await page.getByLabel('Custom exclusion X').fill('0');
  await page.getByLabel('Custom exclusion Y').fill('0');
  await page.getByLabel('Custom exclusion width').fill('18');
  await page.getByLabel('Custom exclusion height').fill('240');
  await page.getByRole('button', { name: 'Add custom exclusion' }).click();

  await expect(page.locator('[data-testid="custom-exclusion-row"]')).toContainText('Left rail');
});

test('custom layout exclusions round-trip through save and load', async ({ page }) => {
  await applyCustomFrame(page);
  await page.getByLabel('Custom exclusion ID').fill('left-rail');
  await page.getByLabel('Custom exclusion name').fill('Left rail');
  await page.getByLabel('Custom exclusion X').fill('0');
  await page.getByLabel('Custom exclusion Y').fill('0');
  await page.getByLabel('Custom exclusion width').fill('18');
  await page.getByLabel('Custom exclusion height').fill('240');
  await page.getByRole('button', { name: 'Add custom exclusion' }).click();

  const savePromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  const save = await savePromise;
  const stream = await save.createReadStream();
  let contents = '';
  for await (const chunk of stream) contents += chunk;
  const saved = JSON.parse(contents);
  expect(saved).toMatchObject({
    printer: 'custom',
    customFrame: { width: 360, height: 240 },
    exclusionZones: [{ id: 'left-rail', name: 'Left rail', rect: { x: 0, y: 0, w: 18, h: 240 } }],
  });

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'custom-layout.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(saved)),
  });

  await expect(page.locator('#frame-dimensions')).toHaveText('Custom frame: 360 × 240 mm');
  await expect(page.locator('[data-testid="custom-exclusion-row"]')).toContainText('Left rail');
});
