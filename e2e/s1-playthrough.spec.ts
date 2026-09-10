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

// Issue #57/T041: S1 の実データに投入した scenes(執務室／サーバ室の背景シーン)を、一覧の
// 「調査する」ボタンではなく背景シーンのホットスポットだけで探索できることを実ブラウザで確認する。
// 上の describe は一覧側のみを使う既存の通しプレイなので、scenes 実データの結線はここでのみ
// E2E 確認する(`src/ui/screens/s1-play-flow.test.tsx` の Vitest 版と同じ操作を実ブラウザで行う)。
test.describe('S1「標的型メールからの侵入」背景シーン経由の探索(#57/T041)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('背景シーンのホットスポットのみで全9ポイントを調査でき、PCのdanger操作は教育的フィードバックのみで詰まずに解決へ進める', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await page.getByRole('button', { name: 'マップを選ぶ' }).click()
    await page.getByRole('button', { name: 'タップで進行' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    // 執務室／サーバ室の2シーンタブが表示され、背景画像(T039生成物)が読み込まれる。
    const officeTab = page.getByRole('tab', { name: '執務室' })
    const serverTab = page.getByRole('tab', { name: 'サーバ室' })
    await expect(officeTab).toHaveAttribute('aria-selected', 'true')
    await expect(serverTab).toBeVisible()
    await expect(page.getByRole('img', { name: '執務室の背景' })).toBeVisible()

    // --- 執務室: PC(経理部 中野の端末。collect/danger/noopの3action=アクションシート) ---
    // exact:true にすると調査済み後にサフィックスが付いた名前と一致しなくなるため付けない。
    const pcHotspot = page.getByRole('button', { name: '経理部 中野の端末（PC）' })
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeVisible()

    // dangerを先に選ぶ: 教育的フィードバックのみが表示され、シートは閉じない(詰み防止)。
    await page.getByRole('button', { name: '感染端末の電源を落とす' }).click()
    await expect(
      page.getByText('揮発性メモリの証拠が消えてしまいます', { exact: false }),
    ).toBeVisible()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeVisible()

    // 電源を落とした後も同じホットスポットを操作でき、EDRログをcollectできる(詰み防止)。
    await page.getByRole('button', { name: 'EDRアラートを確認する' }).click()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeHidden()
    await expect(pcHotspot).toHaveAccessibleName('経理部 中野の端末（PC）・調査済み')

    // --- 執務室: person(中野・経理部長。単一action=即実行、証言は会話フレームで表示) ---
    await page.getByRole('button', { name: '中野（人物）', exact: true }).click()
    await expect(page.getByText('深く確認せずに開いてしまいました', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: '閉じる' }).click()

    await page.getByRole('button', { name: '経理部長（人物）', exact: true }).click()
    await expect(
      page.getByText('取引先の請求サイクルが集中する時期', { exact: false }),
    ).toBeVisible()
    await page.getByRole('button', { name: '閉じる' }).click()

    // --- 執務室: book(資料棚。collectを2件持つ=1件選ぶたびにシートが閉じるため開き直す) ---
    const bookHotspot = page.getByRole('button', { name: '資料棚（書籍）' })
    await bookHotspot.click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'セキュリティ注意喚起情報を確認する' }).click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeHidden()
    await bookHotspot.click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'インシデント対応ガイドラインを確認する' }).click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeHidden()
    await expect(bookHotspot).toHaveAccessibleName('資料棚（書籍）・調査済み')

    // --- サーバ室へシーンタブを切り替える ---
    await serverTab.click()
    await expect(serverTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('img', { name: 'サーバ室の背景' })).toBeVisible()

    // device(プロキシサーバ・メールサーバ)・pc(解析用端末)は単一action=即実行。
    await page.getByRole('button', { name: 'プロキシサーバ（機器）', exact: true }).click()
    await page.getByRole('button', { name: 'メールサーバ（機器）', exact: true }).click()
    await page.getByRole('button', { name: '解析用端末（PC）', exact: true }).click()

    // person(情シス担当。単一action=即実行)。証言(非ダミーの対策カードが優先表示される)。
    await page.getByRole('button', { name: '情シス担当（人物）', exact: true }).click()
    await expect(page.getByText('ネットワークから論理的に隔離する', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: '閉じる' }).click()

    // 一覧側(常に併設)でも9/9件が調査済みとして共有されている。
    await expect(page.getByText('9/9 件調査済み')).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)

    // 背景シーン経由だけで「解決へ進む」が活性化し、解決パートへ遷移できる。
    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()
    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()
  })
})
