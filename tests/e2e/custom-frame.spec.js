const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/\.stl$/i, route => route.abort());
  await page.goto('/');
});

test('applies a rectangular custom frame size to the active board', async ({ page }) => {
  await page.getByLabel('Printer Model').selectOption('custom');
  await page.getByLabel('Custom frame width (mm)').fill('360');
  await page.getByLabel('Custom frame height (mm)').fill('240');
  await page.getByRole('button', { name: 'Apply custom frame' }).click();

  await expect(page.locator('#frame-dimensions'))
    .toHaveText('Custom frame: 360 × 240 mm');
});

test('saves custom frame dimensions with the layout', async ({ page }) => {
  await page.getByLabel('Printer Model').selectOption('custom');
  await page.getByLabel('Custom frame width (mm)').fill('360');
  await page.getByLabel('Custom frame height (mm)').fill('240');
  await page.getByRole('button', { name: 'Apply custom frame' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let contents = '';
  for await (const chunk of stream) contents += chunk;

  expect(JSON.parse(contents)).toMatchObject({
    printer: 'custom',
    customFrame: { width: 360, height: 240 },
  });
});

test('loads custom frame dimensions from a layout', async ({ page }) => {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'custom-layout.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: 5,
      printer: 'custom',
      customFrame: { width: 360, height: 240 },
      components: [],
    })),
  });

  await expect(page.locator('#frame-dimensions'))
    .toHaveText('Custom frame: 360 × 240 mm');
});
