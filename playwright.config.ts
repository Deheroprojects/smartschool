import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    actionTimeout: 10000,
    baseURL: 'http://127.0.0.1:8001',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: '".venv\\Scripts\\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8001',
    url: 'http://127.0.0.1:8001/api/health',
    env: { CLASSROOM_DB: `.qa/ui-${Date.now()}.sqlite3` },
    timeout: 60000,
    reuseExistingServer: false,
  },
});
