// e2e/s1-playthrough.spec.ts — T017: S1「標的型メールからの侵入」通しプレイの E2E テスト。
//
// 会話モードUI(#45)実装後に #46(T036) で書き直す。それまで旧カード配置UI向けのため skip。
//
// tasks.md T017 完了条件「Playwright で S1 通しプレイの E2E を作成し、CI で安定して通ること」に対応する。
// 実ブラウザ(chromium)・実 IndexedDB(SaveStorage)を使い、ビルド成果物(vite preview)に対して
// 導入→探索(必要カード取得)→解決(暗号なし: 攻撃特定→防衛)→結果まで、実データで1マップ通しプレイできる
// ことを確認する。
//
// 操作経路はタップ(クリック)を第一操作とする(DESIGN.md「タップ配置が第一操作、ドラッグは補助」)。
// dnd-kit のドラッグ経路はブラウザ間で不安定になりやすいため、本 E2E ではタップ操作のみで検証する
// (`locator.tap()` は Chromium で `hasTouch` コンテキストを要求し構成が煩雑になるため、
// UI 側が onClick で実装しているタップ操作の実体である `.click()` を使う)。
import { expect, test } from '@playwright/test'

/** 探索を最後まで終え、解決パート(attack_identification)へ進める共通手順。 */
async function playThroughExplorationToResolution(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'つづきから' }).click()
  await expect(page.getByRole('heading', { name: 'マップ選択' })).toBeVisible()

  await page.getByRole('button', { name: 'マップを選ぶ' }).click()
  await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()
  await expect(page.getByText('株式会社浜通商事')).toBeVisible()

  await page.getByRole('button', { name: 'タップで進行' }).click()
  await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()
  await expect(page.getByText('プロキシログ')).toBeVisible()

  // 全調査ポイントをタップで調査する(9箇所)。
  let investigateButton = page.getByRole('button', { name: '調査する' }).first()
  while (await investigateButton.count()) {
    await investigateButton.click()
    investigateButton = page.getByRole('button', { name: '調査する' }).first()
  }
  await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)

  const enterResolution = page.getByRole('button', { name: '解決へ進む' })
  await expect(enterResolution).toBeEnabled()
  await enterResolution.click()
}

/** attack_identification ステージで正解の4枚をタップ配置して確定する。 */
async function submitCorrectAttackIdentification(page: import('@playwright/test').Page) {
  await expect(
    page.getByText('集めた手がかりから、攻撃手段の特定に必要なカードを選んで配置してください。'),
  ).toBeVisible()
  // 暗号なしシナリオ(S1)のため「暗号文:」は表示されない。
  await expect(page.getByText('暗号文:')).toHaveCount(0)

  for (const bodyFragment of [
    '実在する取引先名を騙り',
    'PowerShellプロセス',
    'ビーコン通信のパターン',
    '深く確認せずに開いてしまいました',
  ]) {
    const pool = page.getByRole('list', { name: '手持ちカード' })
    await pool.getByRole('button', { name: new RegExp(bodyFragment) }).click()
    await page
      .getByRole('button', { name: /\(空\)へ配置する/ })
      .first()
      .click()
  }
  await page.getByRole('button', { name: '攻撃手段を特定する' }).click()
}

test.describe.skip('S1「標的型メールからの侵入」通しプレイ(T017)', () => {
  test.beforeEach(async ({ page }) => {
    // IndexedDB(SaveStorage)は実ブラウザのタブ間で共有されないが、同一オリジンの前回実行が
    // 残らないよう、テストごとに新規コンテキストの前提で開始する(playwright.config.ts のプロジェクト
    // 設定によりテストごとに新しいブラウザコンテキストが使われる)。
    await page.goto('/')
  })

  test('正解ルート: 導入→探索→解決(攻撃特定→防衛)→結果まで進行し、XP・出典が表示される', async ({
    page,
  }) => {
    await playThroughExplorationToResolution(page)
    await submitCorrectAttackIdentification(page)

    await expect(page.getByText('への有効な対策カードを配置してください')).toBeVisible()
    await page
      .getByRole('list', { name: '手持ちカード' })
      .getByRole('button', { name: /ネットワークから論理的に隔離する/ })
      .click()
    await page
      .getByRole('button', { name: /\(空\)へ配置する/ })
      .first()
      .click()
    await page.getByRole('button', { name: '対策を選ぶ' }).click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    await expect(page.getByText('標的型メール攻撃', { exact: false }).first()).toBeVisible()

    // FR-6: 事件クリアで XP が加算・表示される(前回の実機確認で xp:0 のままだった不具合の回帰確認)。
    await expect(page.getByText('獲得XP: +100')).toBeVisible()
    await expect(page.getByText('累計XP: 100')).toBeVisible()

    // FR-7: 出典表記(citation-policy §4 の主表示位置=結果画面)。
    await expect(
      page.getByText('本シナリオは以下を参考に作成したオリジナルの創作です。'),
    ).toBeVisible()
  })

  test('教育的失敗の分岐(#5): 感染端末をシャットダウンすると失敗解説へ進み、やり直すと正しい初動でクリアできる', async ({
    page,
  }) => {
    await playThroughExplorationToResolution(page)
    await submitCorrectAttackIdentification(page)

    await expect(page.getByText('への有効な対策カードを配置してください')).toBeVisible()

    // わざと「電源を直ちに落とす」対策(教育的失敗の分岐)を選ぶ。
    await page
      .getByRole('list', { name: '手持ちカード' })
      .getByRole('button', { name: /電源を直ちに落とし/ })
      .click()
    await page
      .getByRole('button', { name: /\(空\)へ配置する/ })
      .first()
      .click()
    await page.getByRole('button', { name: '対策を選ぶ' }).click()

    // follow_up(失敗解説)へ遷移し、「なぜ誤りか」(揮発性メモリの証拠消失)が解説される。
    await expect(page.getByRole('heading', { name: '失敗解説' })).toBeVisible()
    await expect(page.getByText('揮発性メモリの情報が失われます', { exact: false })).toBeVisible()

    // 「初動をやり直す」は確認ダイアログを経由する(DESIGN.md)。
    await page.getByRole('button', { name: '初動をやり直す' }).click()
    await expect(page.getByRole('alertdialog', { name: '初動をやり直す確認' })).toBeVisible()
    await page.getByRole('button', { name: 'やり直す' }).click()

    // RESUME_FROM_FOLLOW_UP で countermeasure ステージに復帰する(暗号なしのため cipher には戻らない)。
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()
    await expect(page.getByText('への有効な対策カードを配置してください')).toBeVisible()

    // 復帰後、正しい初動(論理的隔離)を選べばクリアできる。
    await page
      .getByRole('list', { name: '手持ちカード' })
      .getByRole('button', { name: /ネットワークから論理的に隔離する/ })
      .click()
    await page
      .getByRole('button', { name: /\(空\)へ配置する/ })
      .first()
      .click()
    await page.getByRole('button', { name: '対策を選ぶ' }).click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
  })
})
