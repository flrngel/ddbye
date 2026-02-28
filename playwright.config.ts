import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT) || 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    navigationTimeout: 10000,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],
  webServer: {
    command: `npx vite --port=${port} --host=0.0.0.0`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
