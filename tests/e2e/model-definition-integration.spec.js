const { test, expect } = require('@playwright/test');

test('the planner loads authored exclusion data for a built-in model', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#printer', 'v24-250');

  await expect.poll(() => page.evaluate(() => ({
    version: printer.definitionVersion,
    exclusionZoneIds: (printer.exclusionZones || []).map(zone => zone.id),
  }))).toEqual({
    version: 1,
    exclusionZoneIds: ['v24-250-rear-rail'],
  });
});

test('the planner loads all four authored Doom Cube corner exclusions', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#printer', 'doom-300');

  await expect.poll(() => page.evaluate(() => (printer.exclusionZones || []).map(zone => zone.id))).toEqual([
    'doom-300-corner-nw',
    'doom-300-corner-ne',
    'doom-300-corner-sw',
    'doom-300-corner-se',
  ]);
});

test('the planner loads the screenshot-captured model exclusions', async ({ page }) => {
  await page.goto('/');

  const expected = {
    'doom-350': [
      ['doom-350-corner-nw', 0, 0, 88.8, 72.9],
      ['doom-350-corner-ne', 410.8, 0, 89.2, 74.5],
      ['doom-350-corner-sw', 0, 424.3, 84.7, 75.7],
      ['doom-350-corner-se', 412.4, 424.3, 87.6, 75.7],
    ],
    'micron-180': [
      ['micron-180-corner-nw', 0, 0, 27.2, 34],
      ['micron-180-corner-ne', 253.9, 0, 26.1, 37.4],
      ['micron-180-corner-sw', 0, 253.2, 26.8, 33.8],
      ['micron-180-corner-se', 253.4, 254.4, 26.6, 32.6],
    ],
    enderwire: [['enderwire-center-rail', 97.1, 0, 53.8, 266]],
    sw: [['switchwire-raised-rail', 0, 0, 280, 38.2]],
  };

  for (const [modelId, zones] of Object.entries(expected)) {
    await page.selectOption('#printer', modelId);
    await expect.poll(() => page.evaluate(() => (printer.exclusionZones || []).map(zone => [
      zone.id,
      zone.rect.x,
      zone.rect.y,
      zone.rect.w,
      zone.rect.h,
    ]))).toEqual(zones);
  }
});
