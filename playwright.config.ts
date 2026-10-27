import { defineConfig, devices } from '@playwright/test';

// Screen tests: the real app in a browser (phone size) against the Firebase emulators.
// Run with: npm run test:e2e  (requires Java; starts the emulators through firebase-tools)
const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/seed.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // On GitHub the failures also show as annotations of the check (readable without downloading the logs)
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { VITE_FIREBASE_EMULATORS: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
