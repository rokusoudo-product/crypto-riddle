// playwright.config.ts — T017: S1 通しプレイの E2E テスト設定。
//
// tasks.md T003「Playwright E2E（T017 完成後に追加）」を実装する。ビルド成果物(vite preview)を
// 対象にする(dev サーバではなく本番相当のバンドルで確認するため)。ブラウザは chromium のみを
// 対象にする(WSL の非対話環境で `playwright install --with-deps` の sudo プロンプトを避けるため、
// CI・ローカルとも `npx playwright install chromium` のみをセットアップ手順とする)。
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
