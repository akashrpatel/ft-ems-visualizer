const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'vite --host 127.0.0.1 --port 4173',
    command: `${process.platform === 'win32' ? 'python' : 'python3'} -m http.server 4173 --bind 127.0.0.1`,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
