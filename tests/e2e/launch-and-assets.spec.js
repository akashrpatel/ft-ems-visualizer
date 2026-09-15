const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

test('direct file launch explains how to enable 3D models', async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve(__dirname, '../../index.html')).href);
  await page.getByRole('button', { name: '3D View' }).click();

  const status = page.getByRole('status');
  await expect(status).toHaveClass(/error/);
  await expect(status).toContainText('3D models cannot load from a file:// page');
  await expect(status).toContainText('http://localhost:8080');
});

test('the 3D models involved in the reported regression are served as real STL data', async ({ request }) => {
  const models = [
    'ems-files/ft-ems-trident-doom-rear-1-4.stl',
    'ems-files/ft-ems-trident-doom-rear-2-4.stl',
    'ems-files/ft-ems-trident-doom-rear-3-4.stl',
    'ems-files/ft-ems-trident-doom-rear-4-4.stl',
    'ems-files/ft-btt-octopus-mount.stl',
  ];

  for (const model of models) {
    const response = await request.get(`/${model}`);
    expect(response.ok(), model).toBe(true);
    const body = await response.body();
    expect(body.length, model).toBeGreaterThan(1024);
    expect(body.subarray(0, 80).toString(), model).not.toContain('git-lfs.github.com/spec');
  }
});
