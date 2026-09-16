const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/\.stl$/i, route => route.abort());
  await page.goto('/');
});

test('component categories start collapsed and search opens only matching results', async ({ page }) => {
  const headers = page.locator('.cat-header');
  await expect(headers.first()).toBeVisible();
  await expect(page.locator('.cat-items:not(.hidden)')).toHaveCount(0);

  await headers.first().click();
  await expect(headers.first()).not.toHaveClass(/collapsed/);
  await expect(headers.first().locator('+ .cat-items')).toBeVisible();

  await page.getByPlaceholder('Search components...').fill('octopus');
  await expect(page.locator('.cat-items:not(.hidden)')).toHaveCount(1);
  await expect(page.locator('.comp-item:not(.filtered-out)')).toHaveCount(3);
});

test('selected-component controls rotate and delete through the visible UI', async ({ page }) => {
  await page.getByPlaceholder('Search components...').fill('BTT Octopus');
  await page.locator('.comp-item:not(.filtered-out)').filter({ hasText: 'BTT Octopus' }).first().click();

  const toolbar = page.getByRole('toolbar', { name: 'Selected component actions' });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole('button')).toHaveCount(4);
  await toolbar.getByRole('button', { name: 'Rotate selected component 90 degrees' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let contents = '';
  for await (const chunk of stream) contents += chunk;
  const saved = JSON.parse(contents);
  expect(saved.components).toHaveLength(1);
  expect(saved.components[0]).toMatchObject({ name: 'BTT Octopus', rotation: 1 });

  await toolbar.getByRole('button', { name: 'Delete selected component' }).click();
  await expect(toolbar).toBeHidden();
  await expect(page.locator('#bom-empty')).toHaveText('No components placed');
});
