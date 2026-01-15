import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. */
  use: {
    baseURL: 'http://localhost:5500',
    trace: process.env.CI ? 'on-first-retry' : 'off',
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npx live-server . --port=5500 --no-browser', // Force port and prevent popups
    url: 'http://127.0.0.1:5500',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },

  globalSetup: './playwright.setup.js',
});


