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
//
// 2026-09-11(#64/T042): 会話フレーム(ConversationFrame)にタイプライター表示を追加したため、
// 選択肢・相談・カードドロワー・調査結果パネルの「閉じる」等の操作要素(children)は、会話文の
// 全文表示(またはスキップ)後にしか描画されなくなった(送り途中の誤タップ防止、DESIGN.md
// 「タイプライター表示」節)。本ファイルの「選択肢/閉じるがすぐ押せる」前提の操作は、
// すべてタップでのスキップ操作を挟むよう更新した(skipTypewriter参照)。
//
// 2026-09-11(#52 Phase4.7/#66・T044): 探索の調査結果(人物の証言だけでなくPCのログ・書籍の
// 文献も)を種別を問わず会話フレームで台詞提示する方式に刷新し、ホットスポットを常時不可視化した。
// これに伴い下の「背景シーン経由の探索」describe を全面的に書き直し、#62(人物証言に対策
// カードが表示される不具合)の回帰確認・タッチ端末での調査ポイント一覧の初期表示確認を
// describe を追加して行う。
import { expect, test } from '@playwright/test'

/**
 * ConversationFrame のタイプライター表示をタップでスキップする。演出中、会話文の全文が
 * スキップボタンの accessible name になる(sr-onlyで支援技術へ一度に渡すため、#64/T042)ので、
 * その会話文そのもので button ロールとして引ける。
 */
async function skipTypewriter(page: import('@playwright/test').Page, line: string) {
  await page.getByRole('button', { name: line, exact: true }).click()
}

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

    // q-entry-point: 選択肢はタイプライターの全文表示後(またはスキップ)にしか出ない(#64/T042)。
    await skipTypewriter(page, 'この侵入、どこから入られたと見る？')
    await page
      .getByRole('button', {
        name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
      })
      .click()

    // q-initial-response(橘)へ進む。正解時の一言(reply)が新しい問いの上に表示される
    // (誤答肢の reply 本執筆(#46/T035)により、この reply も本 PR で新規に追加した内容)。
    await expect(page.getByText('感染が疑われる端末への初動対応は？')).toBeVisible()
    await skipTypewriter(page, '感染が疑われる端末への初動対応は？')
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

    // q-entry-point: 選択肢はタイプライターの全文表示後(またはスキップ)にしか出ない(#64/T042)。
    await skipTypewriter(page, 'この侵入、どこから入られたと見る？')
    await page
      .getByRole('button', {
        name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
      })
      .click()
    await expect(page.getByText('感染が疑われる端末への初動対応は？')).toBeVisible()
    await skipTypewriter(page, '感染が疑われる端末への初動対応は？')

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

// Issue #57/T041(調査結果の会話フレーム化・#62吸収は#52 Phase4.7/#66・T044): S1 の実データに
// 投入した scenes(執務室／サーバ室の背景シーン)を、一覧の「調査する」ボタンではなく背景シーンの
// ホットスポットだけで探索できることを実ブラウザで確認する。上の describe は一覧側のみを使う
// 既存の通しプレイなので、scenes 実データの結線はここでのみ E2E 確認する
// (`src/ui/screens/s1-play-flow.test.tsx` の Vitest 版と同じ操作を実ブラウザで行う)。
test.describe('S1「標的型メールからの侵入」背景シーン経由の探索(#57/T041、調査結果の会話フレーム化は#66)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  /**
   * 調査結果の会話フレーム(#66)を指定した台詞でスキップして閉じる共通手順。
   * 台詞そのものがタイプライターのスキップボタンのaccessible nameになる(#64/T042)。
   */
  async function skipCollectResultAndClose(
    page: import('@playwright/test').Page,
    line: string,
  ): Promise<void> {
    await expect(page.getByText(line, { exact: false })).toBeVisible()
    await skipTypewriter(page, line)
    await page.getByRole('button', { name: '閉じる' }).click()
  }

  test('背景シーンのホットスポットのみで全9ポイントを調査でき、調査結果が会話フレームで台詞提示され、PCのdanger操作は教育的フィードバックのみで詰まずに解決へ進める', async ({
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

    // ホットスポットは常時不可視(アイコン・可視ラベル無し、#66)。aria-labelだけでbutton要素を
    // 引ける(exact:trueにすると調査済み後にサフィックスが付いた名前と一致しなくなるため付けない)。
    const pcHotspot = page.getByRole('button', { name: '経理部 中野の端末（PC）' })
    await expect(pcHotspot).toHaveText('')

    // --- 執務室: PC(経理部 中野の端末。collect/danger/noopの3action=アクションシート) ---
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeVisible()

    // dangerを先に選ぶ: 教育的フィードバックのみが表示され、シートは閉じない(詰み防止)。
    await page.getByRole('button', { name: '感染端末の電源を落とす' }).click()
    await expect(
      page.getByText('揮発性メモリの証拠が消えてしまいます', { exact: false }),
    ).toBeVisible()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeVisible()

    // 電源を落とした後も同じホットスポットを操作でき、EDRログをcollectできる(詰み防止)。
    // collectするとシートは閉じ、調査結果が会話フレームで台詞提示される(#66、話者=霧島の既定)。
    await page.getByRole('button', { name: 'EDRアラートを確認する' }).click()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeHidden()
    const edrLine =
      '中野の端末でExcelのマクロ実行に続いて、見慣れないPowerShellプロセスが起動した記録がある。侵入の起点はここだろう。'
    await skipCollectResultAndClose(page, edrLine)
    await expect(pcHotspot).toHaveAccessibleName('経理部 中野の端末（PC）・調査済み')

    // --- 執務室: person(中野・経理部長。単一action=即実行、調査結果は会話フレームで表示) ---
    await page.getByRole('button', { name: '中野（人物）', exact: true }).click()
    const nakanoLine =
      '中野さんに話を聞きました。月末で請求書処理が立て込み、深く確認せずに開いてしまったと。マクロ有効化の警告が出たことにも、深く気を留めなかったそうです。'
    await skipCollectResultAndClose(page, nakanoLine)

    await page.getByRole('button', { name: '経理部長（人物）', exact: true }).click()
    const buchoLine =
      '経理部長に伺いました。今月は取引先の請求サイクルが集中する時期で、多少雑な件名のメールでも本物だと思い込みやすい状況だったと。マクロ実行に関する社内規程の周知も、徹底されていなかったようです。'
    await skipCollectResultAndClose(page, buchoLine)

    // --- 執務室: book(資料棚。collectを2件持つ=1件選ぶたびにシートが閉じるため開き直す) ---
    const bookHotspot = page.getByRole('button', { name: '資料棚（書籍）' })
    await bookHotspot.click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'セキュリティ注意喚起情報を確認する' }).click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeHidden()
    const advisoryLine =
      '業界団体の注意喚起を確認した。取引先を装った請求書メールにマクロ付きファイルを添付し、開封後にC2サーバへ接続させる手口が、直近全国で報告されている。今回の型と一致する。'
    await skipCollectResultAndClose(page, advisoryLine)

    await bookHotspot.click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'インシデント対応ガイドラインを確認する' }).click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeHidden()
    const guidelineLine =
      'インシデント対応ガイドラインを確認しました。感染が疑われる端末は、まずネットワークから論理的に隔離し、電源は落とさないこと。揮発性メモリに乗った証拠を失わないためです。'
    await skipCollectResultAndClose(page, guidelineLine)
    await expect(bookHotspot).toHaveAccessibleName('資料棚（書籍）・調査済み')

    // --- サーバ室へシーンタブを切り替える ---
    await serverTab.click()
    await expect(serverTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('img', { name: 'サーバ室の背景' })).toBeVisible()

    // device(プロキシサーバ・メールサーバ)は単一action=即実行。
    await page.getByRole('button', { name: 'プロキシサーバ（機器）', exact: true }).click()
    const proxyLine =
      '深夜帯、中野のPCから見覚えのない海外IPアドレスへ、約30分間隔で通信が続いている。典型的なビーコン通信のパターンだ。'
    await skipCollectResultAndClose(page, proxyLine)

    await page.getByRole('button', { name: 'メールサーバ（機器）', exact: true }).click()
    const mailLine =
      '問題のメールを確認した。取引先名を騙った件名で、送信元は正規ドメインによく似た別ドメインだ。手口としては典型的だが、手が込んでいる。'
    await skipCollectResultAndClose(page, mailLine)

    // person(サーバ管理者。旧・解析用端末(pc)＋旧・情シス担当(person)を統合したホットスポット、
    // #78・T046-ui-data)。複数collect＋noopのためアクションシート経由になり、見出しには
    // promptの挨拶台詞が出る。
    const adminHotspot = page.getByRole('button', { name: 'サーバ管理者（人物）' })
    await adminHotspot.click()
    const adminSheet = page.getByRole('group', { name: 'サーバ管理者の操作' })
    await expect(adminSheet).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'サーバ管理者「どうしましたか？」' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'PCを確認する' }).click()
    await expect(adminSheet).toBeHidden()
    const sandboxLine =
      '回収した添付ファイルをサンドボックスで動かした。マクロが外部URLから追加のプログラムを取得し、プロキシログと同じ宛先へビーコン通信している。IoCとして他端末の調査にも使える。'
    await skipCollectResultAndClose(page, sandboxLine)

    // 調査結果は証言ベースの台詞のみで、対策カードの本文は表示されない(#62回帰確認は
    // 別テストで独立確認する)。
    await adminHotspot.click()
    await expect(adminSheet).toBeVisible()
    await page.getByRole('button', { name: '話を聞く' }).click()
    await expect(adminSheet).toBeHidden()
    const itStaffLine =
      '情シス担当に聞きました。発覚直後、反射的に経理部PCの電源ケーブルに手をかけたものの、判断がつかず抜くのをためらい、対策室の到着を待ったそうです。'
    await skipCollectResultAndClose(page, itStaffLine)
    await expect(adminHotspot).toHaveAccessibleName('サーバ管理者（人物）・調査済み')

    // 一覧側(常に併設)でも9/9件が調査済みとして共有されている。
    await expect(page.getByText('9/9 件調査済み')).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)

    // 背景シーン経由だけで「解決へ進む」が活性化し、解決パートへ遷移できる。
    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()
    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()
  })

  test('ドア(object_type: door)でも執務室↔サーバ室を移動でき、シーンタブと併用できる(#78・T046-ui-data)', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await page.getByRole('button', { name: 'マップを選ぶ' }).click()
    await page.getByRole('button', { name: 'タップで進行' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    const officeTab = page.getByRole('tab', { name: '執務室' })
    const serverTab = page.getByRole('tab', { name: 'サーバ室' })
    await expect(officeTab).toHaveAttribute('aria-selected', 'true')

    // 執務室のドア(単一goto=即実行)でサーバ室へ移動する。
    await page.getByRole('button', { name: 'サーバ室への扉（扉）' }).click()
    await expect(serverTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: 'サーバ管理者（人物）' })).toBeVisible()

    // サーバ室のドアで執務室へ戻る(ドアの往復)。
    await page.getByRole('button', { name: '執務室への扉（扉）' }).click()
    await expect(officeTab).toHaveAttribute('aria-selected', 'true')

    // シーンタブでも同じ移動ができる(ドアとタブの併用)。
    await serverTab.click()
    await expect(serverTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: '執務室への扉（扉）' })).toBeVisible()
  })

  test('調査結果の会話フレーム上の?ボタンで、獲得済みの手持ちカードを無料で閲覧できる(#66)', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await page.getByRole('button', { name: 'マップを選ぶ' }).click()
    await page.getByRole('button', { name: 'タップで進行' }).click()

    await page.getByRole('button', { name: '経理部 中野の端末（PC）' }).click()
    // PCはcollect/danger/noopの3action=シート経由。「EDRアラートを確認する」を実行する。
    await page.getByRole('button', { name: 'EDRアラートを確認する' }).click()

    const edrLine =
      '中野の端末でExcelのマクロ実行に続いて、見慣れないPowerShellプロセスが起動した記録がある。侵入の起点はここだろう。'
    await skipTypewriter(page, edrLine)

    // ?ボタンはaria-label固定文言・48px(DESIGN.md「探索シーン」節)。解決の card-drawer と
    // 同じ無料閲覧の導線。
    const cardDrawerButton = page.getByRole('button', { name: '手持ちカードを見る（無料）' })
    await expect(cardDrawerButton).toBeVisible()
    await cardDrawerButton.click()
    await expect(page.getByRole('heading', { name: '手持ちカード' })).toBeVisible()
    await expect(
      page.getByText(
        '中野のPCで、Excelファイルからのマクロ実行に続いて、見慣れないPowerShellプロセスが起動した記録をEDRが検知していた。',
      ),
    ).toBeVisible()
  })

  test('#62回帰: 情シス担当への聞き取り(ip-witness-itstaff)は証言ベースの台詞のみを提示し、同時に紐づく対策カードの本文が誤って表示されない', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await page.getByRole('button', { name: 'マップを選ぶ' }).click()
    await page.getByRole('button', { name: 'タップで進行' }).click()
    await page.getByRole('tab', { name: 'サーバ室' }).click()

    // #78・T046-ui-dataで「サーバ管理者」に統合されたホットスポット経由(複数action=シート)。
    await page.getByRole('button', { name: 'サーバ管理者（人物）' }).click()
    await page.getByRole('button', { name: '話を聞く' }).click()
    const itStaffLine =
      '情シス担当に聞きました。発覚直後、反射的に経理部PCの電源ケーブルに手をかけたものの、判断がつかず抜くのをためらい、対策室の到着を待ったそうです。'
    await expect(page.getByText(itStaffLine, { exact: false })).toBeVisible()
    // #62の症状(対策カードの本文が証言として表示される)が再現しないことを確認する。
    await expect(
      page.getByText('感染が疑われる端末をネットワークから論理的に隔離する', { exact: false }),
    ).toHaveCount(0)
    await expect(
      page.getByText('感染が疑われる端末の電源を直ちに落とし', { exact: false }),
    ).toHaveCount(0)
  })
})

// #52 Phase4.7/#66・T044: ホットスポットを常時不可視にした補償として、タッチ端末(モバイル幅)
// では「調査ポイント一覧」を折りたたまず初期表示することが完了条件になった(DESIGN.md
// 「探索シーン」節)。explore-screen.tsx は元々折りたたみ機構を持たないため実装変更は不要だが、
// 将来の回帰(例: モバイルで一覧を隠す最適化を誤って入れる)を防ぐためここで固定する。
test.describe('S1「標的型メールからの侵入」タッチ端末での調査ポイント一覧の初期表示(#66)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('モバイル幅・タッチ端末では、探索到達直後から「調査ポイント一覧」が折りたたまれず全件表示される', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'つづきから' }).click()
    await page.getByRole('button', { name: 'マップを選ぶ' }).click()
    await page.getByRole('button', { name: 'タップで進行' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    // 折りたたみ操作なしで、初期表示のまま9件すべての調査ポイントが見える(不可視ホットスポットの
    // 補償。開閉トグル等は無いため、追加の操作をせずに visible であることそのものが完了条件)。
    await expect(page.getByRole('heading', { name: '調査ポイント一覧' })).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(9)
    await expect(page.getByText('プロキシログ')).toBeVisible()
    await expect(page.getByText('インシデント対応ガイドラインの確認')).toBeVisible()
  })
})

// #52 Phase4.7/#71・T045: 探索完了(「解決へ」の活性条件を満たす)と同時に、橘が会話フレームで
// 「そろそろ問題をまとめようか」と1回促す(spec §7.1・DESIGN.md「探索シーン」節)。
// 一覧側から全件調査して活性条件を満たす経路(高速)でE2E確認する(背景シーン経由の等価な結線は
// 上の describe で既に確認済みのため、ここでは誘導の有無・1回性・導線の明示のみに絞る)。
test.describe('S1「標的型メールからの侵入」探索完了→解決への誘導(#71・T045)', () => {
  test('「解決へ」の活性条件を満たした時点で促しが1回出て、閉じても「解決へ進む」導線は活性のまま残る', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'つづきから' }).click()
    await page.getByRole('button', { name: 'マップを選ぶ' }).click()
    await page.getByRole('button', { name: 'タップで進行' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    const wrapUpLine = 'そろそろ問題をまとめようか。'
    await expect(page.getByText(wrapUpLine)).toHaveCount(0)

    // 一覧側(常に併設)から全9件を調査し、活性条件を満たす。
    let investigateButton = page.getByRole('button', { name: '調査する' }).first()
    while (await investigateButton.count()) {
      await investigateButton.click()
      investigateButton = page.getByRole('button', { name: '調査する' }).first()
    }

    // 促しが会話フレームで表示される(話者=橘)。
    await expect(page.getByText(wrapUpLine)).toBeVisible()

    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()

    // タイプライターをスキップして「わかった」を押すと促しは消えるが、「解決へ進む」の
    // 導線(活性状態)は変わらない。ボタン文言は調査結果パネルの「閉じる」とわざと変えてあり
    // (#71・T045)、両方の会話フレームが同時に開いてもアクセシブルネームが衝突しない。
    await skipTypewriter(page, wrapUpLine)
    await page.getByRole('button', { name: 'わかった' }).click()
    await expect(page.getByText(wrapUpLine)).toHaveCount(0)
    await expect(enterResolution).toBeEnabled()

    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()
  })
})
