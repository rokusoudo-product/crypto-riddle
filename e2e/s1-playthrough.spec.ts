// e2e/s1-playthrough.spec.ts — T017/T036: S1「標的型メールからの侵入」通しプレイの E2E テスト。
//
// tasks.md T017 完了条件「Playwright で S1 通しプレイの E2E を作成し、CI で安定して通ること」と、
// T036 完了条件「Vitest・Playwright E2E が CI で安定して通る」に対応する。
// 実ブラウザ(chromium)・実 IndexedDB(SaveStorage)を使い、ビルド成果物(vite preview)に対して
// 導入→探索(必要カード取得)→解決(暗号なし: 会話モードの2問=起点→初動)→結果まで、実データで
// 1マップ通しプレイできることを確認する。
//
// 2026-09-10(#42/#45/#46): 解決パートがカード配置(required_card_ids方式)から会話モード
// (questions[]・選択肢ボタン)へ刷新されたため、旧版(カード配置UI・attack_identification/
// countermeasure ステージ)を前提にしていた本ファイルの内容は全面的に書き直した
// (`src/ui/screens/s1-play-flow.test.tsx` の Vitest 版と同じ会話モードUIを実ブラウザで確認する)。
//
// 操作経路はタップ(クリック)を第一操作とする(DESIGN.md「タップ配置が第一操作、ドラッグは補助」)。
import { expect, test } from '@playwright/test'

/** 探索を最後まで終え、解決パート(会話モード, q-entry-point)へ進める共通手順。 */
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
  await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()
  await expect(page.getByText('この侵入、どこから入られたと見る？')).toBeVisible()
}

test.describe('S1「標的型メールからの侵入」通しプレイ(T017/T036)', () => {
  test.beforeEach(async ({ page }) => {
    // IndexedDB(SaveStorage)は実ブラウザのタブ間で共有されないが、同一オリジンの前回実行が
    // 残らないよう、テストごとに新規コンテキストの前提で開始する(playwright.config.ts のプロジェクト
    // 設定によりテストごとに新しいブラウザコンテキストが使われる)。
    await page.goto('/')
  })

  test('正解ルート: 導入→探索→解決(起点→初動)→結果まで進行し、獲得XP・出典が表示される', async ({
    page,
  }) => {
    await playThroughExplorationToResolution(page)

    // q-entry-point: 正解を選ぶ。
    await page
      .getByRole('button', {
        name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
      })
      .click()

    // q-initial-response(橘)へ進む。正解時の一言(reply)が新しい問いの上に表示される
    // (誤答肢の reply 本執筆(#46/T035)により、この reply も本 PR で新規に追加した内容)。
    await expect(page.getByText('感染が疑われる端末への初動対応は？')).toBeVisible()
    await expect(
      page.getByText('その通りだ。フィッシングメールの実在', { exact: false }),
    ).toBeVisible()
    await page
      .getByRole('button', {
        name: 'ネットワークから論理的に隔離し(LANケーブル抜線・Wi-Fi無効化)、電源は落とさず揮発性メモリとディスクの証拠を保全する',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    await expect(page.getByText('標的型メール攻撃', { exact: false }).first()).toBeVisible()

    // FR-6/FR-11: 誤答・相談なしでクリアしたので満額のXPが加算・表示される。
    await expect(page.getByText('誤答: 0回 / 相談: 0回')).toBeVisible()
    await expect(page.getByText('獲得XP: +100')).toBeVisible()
    await expect(page.getByText('累計XP: 100')).toBeVisible()

    // FR-7: 出典表記(citation-policy §4 の主表示位置=結果画面)。
    await expect(
      page.getByText('本シナリオは以下を参考に作成したオリジナルの創作です。'),
    ).toBeVisible()
  })

  test('教育的失敗の分岐(#42/#46): 感染端末の電源を切ると橘が揮発性メモリの喪失を解説し、選択肢は残ったまま正しい初動でクリアできる', async ({
    page,
  }) => {
    await playThroughExplorationToResolution(page)

    // q-entry-point: 正解を選ぶ。
    await page
      .getByRole('button', {
        name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
      })
      .click()
    await expect(page.getByText('感染が疑われる端末への初動対応は？')).toBeVisible()

    // わざと「電源を直ちに落とす」対策(教育的失敗の分岐)を選ぶ。
    const shutdownChoice = page.getByRole('button', {
      name: '感染が疑われる端末の電源を直ちに落とし、被害の拡大を止める',
    })
    await shutdownChoice.click()

    // 誤答フォロー: 揮発性メモリの証拠喪失が解説され、問い文・選択肢は残ったまま再挑戦できる
    // (⑥失敗解説の独立画面は廃止済み。会話モード内で完結する)。
    await expect(
      page.getByText('電源を切れば、事件の証拠になり得る揮発性メモリの情報が失われます', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(page.getByText('感染が疑われる端末への初動対応は？')).toBeVisible()
    await expect(shutdownChoice).toBeVisible()

    // 再挑戦で正しい初動(論理的隔離)を選べばクリアできる。
    await page
      .getByRole('button', {
        name: 'ネットワークから論理的に隔離し(LANケーブル抜線・Wi-Fi無効化)、電源は落とさず揮発性メモリとディスクの証拠を保全する',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()

    // FR-11(spec §8.4): 誤答1回ぶんXPが減算される(相談は未使用)。
    await expect(page.getByText('誤答: 1回 / 相談: 0回')).toBeVisible()
    await expect(page.getByText('獲得XP: +90')).toBeVisible()
    await expect(page.getByText('累計XP: 90')).toBeVisible()
  })
})
