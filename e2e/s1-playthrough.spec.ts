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
// describe を追加して行った。
//
// 2026-09-11(#52 Phase4.7 追補・T047): 探索を「探索状態/会話状態」の2状態に刷新した
// (DESIGN.md「探索シーン」節「2つの状態」)。danger操作も教育的フィードバックを会話オーバーレイで
// 提示するようになった(旧: アクションシート内テキスト表示のまま)ため、danger選択後は
// アクションシートが閉じる前提に書き直した。「調査ポイント一覧」は scenes があるマップでは
// もはや常時併設ではなく、右上の「調査ポイント一覧」トグル(探索・会話状態とも常時表示)で
// 開閉する(上記#66で追加した「タッチ端末での初期表示」describeは、この常時可視トグルへの
// 置換に伴い書き直した)。全ポイント調査完了の直後は、探索完了への誘導(#71・T045)の会話
// オーバーレイが入れ替わりで自動的に開くため、一部のテストは一覧・ホットスポットの状態を
// 確認する手順を挟んでいる。
//
// 2026-09-11(#52 追補): 誘導会話の「わかった」を押すと、探索状態には戻らず「解決へ進む」
// ボタンと同じ遷移で解決画面へ直接進むようになった(DESIGN.md「探索シーン」節「探索完了→
// 解決への誘導」)。そのため一覧・ホットスポットの状態確認は「わかった」を押す前(会話状態でも
// 右上ボタン群は常時表示されるため確認できる)に行うよう書き直した。
//
// 2026-09-13(#103): S1データを台本v2.2へ移植した(小鳥遊の入電から始まる導入9行の会話劇化、
// 探索のcollect.dialogue[]化=多ターン・NPC直接発話、resolution.explanations/clear_explanation
// の話者付きオブジェクト化)。それに伴い: (1) 導入③の character_intros を1行ずつタップ送りする
// 専用テストを追加した(advanceIntroLine)、(2) 探索の多ターンcollectはskipCollectResultAndClose
// をターン数ぶん順に呼ぶ形にした(会話ウィンドウはターンごとに同じ2クリック=スキップ→次へ/閉じる
// のパターンを繰り返すだけで良い、conversation-frame.tsx/scene-explorer.tsxのonDismiss参照)、
// (3) NPC直接発話ターンでは名札にNPC名がそのまま出ること・トリガー元ホットスポットが
// npc-hotspot-markerで強調されることを確認する行を追加した、(4) explanationsの話者表示
// (「{character}「{line}」」、resolve-screen.tsx)と結果画面の小鳥遊のねぎらい
// (clear_explanationの3行目)を確認する行を追加した。
import { expect, test } from '@playwright/test'

/**
 * ConversationFrame のタイプライター表示をタップでスキップする。演出中、会話文の全文が
 * スキップボタンの accessible name になる(sr-onlyで支援技術へ一度に渡すため、#64/T042)ので、
 * その会話文そのもので button ロールとして引ける。
 */
async function skipTypewriter(page: import('@playwright/test').Page, line: string) {
  await page.getByRole('button', { name: line, exact: true }).click()
}

/**
 * マップ選択でS1「標的型メールからの侵入」を選ぶ(2026-09-11(#74)以降、store.scenariosに
 * S2「VPN装置の脆弱性放置とランサムウェア感染」も並ぶため、単純な
 * `getByRole('button', { name: 'マップを選ぶ' })` は両マップの行にヒットしstrict modeで
 * 落ちる。マップ選択の一覧行(li)をタイトルの文言で絞り込んでから押す)。
 */
async function selectS1Map(page: import('@playwright/test').Page) {
  await page
    .getByRole('listitem')
    .filter({ hasText: '標的型メールからの侵入' })
    .getByRole('button', { name: 'マップを選ぶ' })
    .click()
}

/**
 * 導入③の character_intros を1行ずつタップ送りする(台本v2.2・#100/#103で小鳥遊の入電から
 * 始まる9行の会話劇になった)。各行についてタイプライターをスキップし、「タップで進行」を押す。
 * 最終行は呼び出し側でSKIPするか、この関数で最後まで送り切る。
 */
async function advanceIntroLine(page: import('@playwright/test').Page, line: string) {
  await skipTypewriter(page, line)
  await page.getByRole('button', { name: 'タップで進行' }).click()
}

/** 探索を最後まで終え、解決パート(会話モード, q-entry-point)へ進める共通手順。 */
async function playThroughExplorationToResolution(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'つづきから' }).click()
  await expect(page.getByRole('heading', { name: 'マップ選択' })).toBeVisible()

  await selectS1Map(page)
  await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()
  await expect(page.getByText('株式会社浜通商事')).toBeVisible()

  await page.getByRole('button', { name: 'SKIP' }).click()
  await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

  // S1は背景シーン(#57/T040)を持つため、「調査ポイント一覧」はトグルを開くまで表示されない
  // (#66→T047でトグル化。トグル自体は探索・会話状態のどちらでも常時表示される)。
  await page.getByRole('button', { name: '調査ポイント一覧' }).click()
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
      page.getByText('その通りだ、新人。フィッシングメールの実在', { exact: false }),
    ).toBeVisible()
    await page
      .getByRole('button', {
        name: 'ネットワークから論理的に隔離し(LANケーブル抜線・Wi-Fi無効化)、電源は落とさず揮発性メモリとディスクの証拠を保全する',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    await expect(page.getByText('標的型メール攻撃', { exact: false }).first()).toBeVisible()

    // 台本v2.2(#100/#103): clear_explanationの3行目=小鳥遊のねぎらい(結果画面のみ登場可)。
    // 名札込みの表示(「{character}「{line}」」、result-screen.tsx)で話者=小鳥遊を確認する。
    await expect(
      page.getByText('小鳥遊「お疲れ様でした〜、新人さん。冷たいお茶、淹れておきましたよ。', {
        exact: false,
      }),
    ).toBeVisible()

    // FR-6/FR-11: 誤答・相談なしでクリアしたので満額のXPが加算・表示される。
    await expect(page.getByText('誤答: 0回 / 相談: 0回')).toBeVisible()
    await expect(page.getByText('獲得XP: +100')).toBeVisible()
    await expect(page.getByText('累計XP: 100')).toBeVisible()

    // FR-7: 出典表記(citation-policy §4 の主表示位置=結果画面)。
    await expect(
      page.getByText('本シナリオは以下を参考に作成したオリジナルの創作です。'),
    ).toBeVisible()
  })

  test('導入③: character_intros を9行タップ送りでき、小鳥遊→霧島→橘の対策室レイアウトで会話劇が進行する(台本v2.2・#100/#103)', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS1Map(page)
    await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()

    // 1行目(小鳥遊)は発話中、霧島・橘は待機中(対策室レイアウト=3枠、#100/#102)。
    await expect(page.getByAltText('小鳥遊（発話中）')).toBeVisible()
    await expect(page.getByAltText('霧島（待機中）')).toBeVisible()
    await expect(page.getByAltText('橘（待機中）')).toBeVisible()

    const introLines = [
      'あらあら〜、新人さん、ちょうど良いところに。今、浜通(はまどおり)商事さんから緊急のお電話が入りまして……。はい、お茶どうぞ〜。',
      '……産業資材の卸売をされている会社さんなんですけど、経理部の端末が一台、どうも様子がおかしいと。一週間ほど前に届いた請求書のメールを開いてから、というお話でした。',
      '……深夜帯に、その端末から外部の見慣れないIPへ、一定間隔で通信が続いている。ビーコンの可能性が高いな。',
      'びーこん、ですか？',
      '乗っ取った端末が、攻撃者のサーバへ「準備できました」と定期的に信号を送る通信だ。C2――指令サーバとの連絡線だと思っていい。開いた請求書メールが起点だろう。',
      '一週間放置されていたのが気がかりです。取引先の請求データを扱う部署なら、影響範囲によっては個人情報保護法の報告義務が絡みます。……新人。ここからは事実確認と、被害範囲の特定が先決です。',
      'あなたが現場を見て、証拠を組み立ててください。私と霧島さんは、詰まったところをフォローします。答えは代わりに出しません。',
      '……証拠を消すなよ、新人。現場へ行くぞ。',
      'わたしは対策室で待機して、資料や各所への連絡をまわしておきますね〜。いってらっしゃい、新人さん。',
    ]

    for (const line of introLines) {
      await expect(page.getByText(line, { exact: false })).toBeVisible()
      await advanceIntroLine(page, line)
    }

    // 最終行(9行目・小鳥遊)の「タップで進行」で探索へ遷移する。
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()
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
      page.getByText('電源を切れば、証拠になり得る揮発性メモリの情報が失われます', {
        exact: false,
      }),
    ).toBeVisible()
    // 段階解説(explanations)は話者付きオブジェクト(台本v2.2/#100/#103: 霧島→橘の2段)。
    // このq-initial-responseの出題キャラは橘だが、1回目の誤答で表示されるのは
    // explanations[0](霧島)であることを、名札込みの表示(「{character}「{line}」」、
    // resolve-screen.tsxがexplanation.lib/explanation.tsのresolveExplanationを使う)で確認する。
    await expect(
      page.getByText('霧島「揮発性メモリには、動作中のプロセスや通信先が乗っている', {
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
   * 調査結果の会話ウィンドウ(#66)を指定した台詞でスキップして閉じる共通手順。会話ウィンドウは
   * 専用の「閉じる」ボタンを持たず、ウィンドウ全体が1つの操作領域になる(T048)。
   * accessible nameは会話文(line)のまま変わらないため、同じクエリを1回目=スキップ・
   * 2回目=閉じるに使い回す(#64/T042・T048)。
   */
  async function skipCollectResultAndClose(
    page: import('@playwright/test').Page,
    line: string,
  ): Promise<void> {
    await expect(page.getByText(line, { exact: false })).toBeVisible()
    await skipTypewriter(page, line) // スキップ(全文表示)
    await page.getByRole('button', { name: line, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
  }

  test('背景シーンのホットスポットのみで全9ポイントを調査でき、調査結果が会話フレームで台詞提示され、PCのdanger操作は教育的フィードバックのみで詰まずに解決へ進める', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS1Map(page)
    await page.getByRole('button', { name: 'SKIP' }).click()
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

    // dangerを先に選ぶ: アクションシートは閉じ、会話オーバーレイ(橘の台詞)で教育的
    // フィードバックが提示される(T047。旧: シート内テキスト表示)。探索ではペナルティに
    // ならない(詰み防止・spec §8.4)。
    await page.getByRole('button', { name: '感染端末の電源を落とす' }).click()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeHidden()
    const dangerLine =
      '待って、あなた。ここで電源を落とすと、動作中のプロセスや通信先が乗った揮発性メモリの証拠が消えます。まずネットワークから論理的に隔離し、メモリ→ディスクの順で保全を。'
    await expect(page.getByText(dangerLine, { exact: false })).toBeVisible()

    // 会話オーバーレイを閉じると探索状態に戻り、同じホットスポットを再度開いて他のactionを
    // 選べる(電源を落とした後も操作継続可=詰み防止)。EDRログをcollectすると、シートは閉じ、
    // 調査結果が会話オーバーレイで台詞提示される(#66、話者=霧島の既定)。
    await skipTypewriter(page, dangerLine) // スキップ(全文表示)
    await page.getByRole('button', { name: dangerLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'EDRアラートを確認する' }).click()
    await expect(page.getByRole('group', { name: '経理部 中野の端末の操作' })).toBeHidden()
    // EDRアラート確認は霧島の2ターン(問いかけ→答え合わせ、台本v2.2/#100/#103)。
    const edrLine1 = '新人、このプロセス名――どう見る？'
    const edrLine2 =
      'Excelのマクロ実行に続いて、見慣れないPowerShellが起動した記録がある。正規の業務でこの並びは出ない。侵入の起点はここだ。'
    await skipCollectResultAndClose(page, edrLine1)
    await skipCollectResultAndClose(page, edrLine2)
    await expect(pcHotspot).toHaveAccessibleName('経理部 中野の端末（PC）・調査済み')

    // --- 執務室: person(中野・経理部長。単一action=即実行、調査結果は会話フレームで表示) ---
    // NPC直接発話(中野)→橘の要約の2ターン(台本v2.2/#100/#103)。NPCターンでは霧島・橘の
    // 両立ち絵がグレーアウトし、名札に「中野」がそのまま表示される。
    await page.getByRole('button', { name: '中野（人物）', exact: true }).click()
    const nakanoLine1 =
      'すみません……月末で請求処理が立て込んでて。取引先からの「請求書送付のご連絡」ってメールで、疑いもせず添付を開いてしまって……。「マクロを有効にしますか」って出たのも、いつも通りだと思って押しちゃったんです。'
    const nakanoLine2 =
      '……ご本人も認めています。件名の巧妙さと、月末の油断が重なった。よくある入口です。'
    await expect(page.getByText(nakanoLine1, { exact: false })).toBeVisible()
    await expect(page.getByText('中野', { exact: true }).first()).toBeVisible()
    await skipCollectResultAndClose(page, nakanoLine1)
    await skipCollectResultAndClose(page, nakanoLine2)

    await page.getByRole('button', { name: '経理部長（人物）', exact: true }).click()
    const buchoLine1 =
      '今月は取引先の請求サイクルが集中していてね。多少雑な件名でも、本物と思い込みやすい状況だった。……マクロ実行に関する社内規程も、正直、周知が徹底できていなかった。私の責任だ。'
    const buchoLine2 =
      '規程はあっても、現場に届いていなければ機能しません。ここは後の再発防止と説明責任に効いてくる論点です。覚えておいて。'
    await expect(page.getByText('経理部長 夏目', { exact: true }).first()).toBeVisible()
    await skipCollectResultAndClose(page, buchoLine1)
    await skipCollectResultAndClose(page, buchoLine2)

    // --- 執務室: book(資料棚。collectを2件持つ=1件選ぶたびにシートが閉じるため開き直す) ---
    const bookHotspot = page.getByRole('button', { name: '資料棚（書籍）' })
    await bookHotspot.click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'セキュリティ注意喚起情報を確認する' }).click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeHidden()
    const advisoryLine =
      '業界団体の注意喚起だ。取引先を装った請求書メールにマクロ付きファイルを添付し、開封後にC2サーバへ接続させる手口が、直近で全国的に報告されている。今回の型と一致する。'
    await skipCollectResultAndClose(page, advisoryLine)

    await bookHotspot.click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'インシデント対応ガイドラインを確認する' }).click()
    await expect(page.getByRole('group', { name: '資料棚の操作' })).toBeHidden()
    const guidelineLine =
      'インシデント対応ガイドライン。感染が疑われる端末は、まずネットワークから論理的に隔離し、電源は落とさないこと。揮発性メモリの証拠を失わないためです。'
    await skipCollectResultAndClose(page, guidelineLine)
    await expect(bookHotspot).toHaveAccessibleName('資料棚（書籍）・調査済み')

    // --- サーバ室へシーンタブを切り替える ---
    await serverTab.click()
    await expect(serverTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('img', { name: 'サーバ室の背景' })).toBeVisible()

    // device(プロキシサーバ・メールサーバ)は単一action=即実行。
    // プロキシサーバは霧島の2ターン(問いかけ→答え合わせ、台本v2.2)。
    await page.getByRole('button', { name: 'プロキシサーバ（機器）', exact: true }).click()
    const proxyLine1 = '新人、この通信の“間隔”に注目しろ。何か気づかないか？'
    const proxyLine2 =
      '深夜帯、中野のPCから見覚えのない海外IPへ、約30分間隔できっちり通信が続いている。人間の操作ではありえない規則正しさ――典型的なビーコンだ。'
    await skipCollectResultAndClose(page, proxyLine1)
    await skipCollectResultAndClose(page, proxyLine2)

    await page.getByRole('button', { name: 'メールサーバ（機器）', exact: true }).click()
    const mailLine =
      '問題のメールを確認した。取引先名を騙った件名で、送信元は正規ドメインによく似た別ドメイン。手口は典型的だが、手が込んでいる。'
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

    // 「PCを確認する」は霧島→橘(用語クッション・IoC)→霧島の3ターン(台本v2.2/#100/#103)。
    await page.getByRole('button', { name: 'PCを確認する' }).click()
    await expect(adminSheet).toBeHidden()
    const sandboxLine1 =
      '回収した添付ファイルをサンドボックスで動かした。マクロが外部URLから追加プログラムを取得し、プロキシログと同じ宛先へビーコンを送っている。この宛先はIoC――侵害の痕跡として、他端末の調査にも使える。'
    const sandboxLine2 = 'そのIoCというのは、具体的には何を指すの？'
    const sandboxLine3 =
      '「この通信先が出たら感染を疑え」という手掛かりの一覧だ。今回はビーコンの宛先がそれにあたる。一つ掴めば他端末への横展開調査が早くなる。'
    await skipCollectResultAndClose(page, sandboxLine1)
    await skipCollectResultAndClose(page, sandboxLine2)
    await skipCollectResultAndClose(page, sandboxLine3)

    // 調査結果は証言ベースの台詞のみで、対策カードの本文は表示されない(#62回帰確認は
    // 別テストで独立確認する)。「話を聞く」はNPC「サーバ管理者」の直接発話→橘の2ターン。
    await adminHotspot.click()
    await expect(adminSheet).toBeVisible()
    await page.getByRole('button', { name: '話を聞く' }).click()
    await expect(adminSheet).toBeHidden()
    const itStaffLine1 =
      '発覚した直後、正直、反射的に経理部PCの電源ケーブルに手をかけたんです。でも……抜いていいのか判断がつかなくて。結局ためらって、対策室の到着を待ちました。'
    const itStaffLine2 =
      'その判断、結果的に正解です。抜かずに待ったから、私たちはまだメモリの証拠を取れる。初動の“ためらい”が保全に効くこともあります。'
    // NPC直接発話のターンでは、トリガー元のホットスポットが□で強調される(装飾用マーカー)。
    await expect(page.getByTestId('npc-hotspot-marker')).toBeVisible()
    await skipCollectResultAndClose(page, itStaffLine1)
    await skipCollectResultAndClose(page, itStaffLine2)

    // これが9件目(最後)の調査のため、ここで「解決へ」の活性条件を満たし、探索完了への誘導
    // (#71・T045)の会話オーバーレイが入れ替わりで自動的に開く(conversationSlotが会話状態を
    // 引き継ぐ)。
    const wrapUpLine = '材料は揃いました。そろそろ問題を整理しましょうか、あなた。'
    await expect(page.getByText(wrapUpLine)).toBeVisible()

    // PR#92追補・代表FB「閉じて再探索も可・ロックしない」: 会話ウィンドウの外側(背景シーンの
    // 見えている部分、`onOutsideDismiss`が付いた要素=`data-testid`で取得)をクリックすると、
    // 「わかった」を押さなくても誘導会話を閉じて探索状態に戻れる。閉じるとサーバ室の
    // ホットスポット(サーバ管理者)がまた操作でき、詰みにならないことを確認する。
    await page.getByTestId('conversation-overlay-backdrop').click()
    await expect(page.getByText(wrapUpLine)).toBeHidden()
    await expect(adminHotspot).toBeVisible()

    // 再探索: 調査済みのホットスポットも操作でき(電源を落とす操作と同様に詰まない設計)、
    // 何もしない(noop)を選んでシートを閉じても誘導会話は自動的には再表示されない
    // (ナグ防止・PR#92追補)。
    await adminHotspot.click()
    await expect(adminSheet).toBeVisible()
    await page.getByRole('button', { name: '何でもない' }).click()
    await expect(adminSheet).toBeHidden()
    await expect(page.getByText(wrapUpLine)).toBeHidden()

    // 右上の「調査ポイント一覧」トグルは探索状態でも常時表示されるため、誘導会話を閉じた後も
    // 9/9件が調査済みとして共有されていること・「解決へ進む」の活性化を確認できる
    // (#66→T047でトグル化)。
    await page.getByRole('button', { name: '調査ポイント一覧' }).click()
    await expect(page.getByText('9/9 件調査済み')).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)
    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()
    await page.getByRole('button', { name: '調査ポイント一覧' }).click()

    // 誘導会話を閉じた後も、「解決へ進む」ボタンから直接解決画面へ進める(ロックしない、
    // PR#92追補・代表FB)。「わかった」経由の遷移は他マップのE2E・vitestで確認済みのため、
    // ここでは代替経路(解決へ進む)を確認する。
    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()
  })

  test('ドア(object_type: door)でも執務室↔サーバ室を移動でき、シーンタブと併用できる(#78・T046-ui-data)', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS1Map(page)
    await page.getByRole('button', { name: 'SKIP' }).click()
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

  test('右上の「ヒント確認」ボタンで、獲得済みの手持ちカードをいつでも無料で閲覧できる(#66→T048で右上へ移設)', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS1Map(page)
    await page.getByRole('button', { name: 'SKIP' }).click()

    // 「ヒント確認」は右上のボタン群の一員として探索状態・会話状態のどちらでも常時表示される
    // (T048。aria-labelは移設前と同じ固定文言「手持ちカードを見る（無料）」を維持)。
    const cardDrawerButton = page.getByRole('button', { name: '手持ちカードを見る（無料）' })
    await expect(cardDrawerButton).toBeVisible()

    await page.getByRole('button', { name: '経理部 中野の端末（PC）' }).click()
    // PCはcollect/danger/noopの3action=シート経由。「EDRアラートを確認する」を実行する。
    await page.getByRole('button', { name: 'EDRアラートを確認する' }).click()

    const edrLine = '新人、このプロセス名――どう見る？'
    await expect(page.getByText(edrLine, { exact: false })).toBeVisible()

    // タイプライターが進行中(スキップ前)でも「ヒント確認」は押せる(右上移設によりisComplete
    // 状態に依存しない、T048)。
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
    await selectS1Map(page)
    await page.getByRole('button', { name: 'SKIP' }).click()
    await page.getByRole('tab', { name: 'サーバ室' }).click()

    // #78・T046-ui-dataで「サーバ管理者」に統合されたホットスポット経由(複数action=シート)。
    // 「話を聞く」はNPC「サーバ管理者」の直接発話が1ターン目(台本v2.2/#100/#103)。
    await page.getByRole('button', { name: 'サーバ管理者（人物）' }).click()
    await page.getByRole('button', { name: '話を聞く' }).click()
    const itStaffLine =
      '発覚した直後、正直、反射的に経理部PCの電源ケーブルに手をかけたんです。でも……抜いていいのか判断がつかなくて。結局ためらって、対策室の到着を待ちました。'
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

// #52 Phase4.7 追補・T047: 旧仕様(#66・タッチ端末では「調査ポイント一覧」を折りたたまず
// 初期表示)を、右上の「調査ポイント一覧」トグル(探索・会話状態のどちらでも常時表示)に
// 置き換えた(発見性はトグル自体の常時可視で担保する。DESIGN.md「探索シーン」節
// 「一覧フォールバック」)。モバイル幅・タッチ端末でもトグルが常時見え、キーボードのみに
// 頼らずタップだけで一覧を開閉できることを固定する。
test.describe('S1「標的型メールからの侵入」タッチ端末での「調査ポイント一覧」トグル(#66→T047でトグル化)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('モバイル幅・タッチ端末でも「調査ポイント一覧」トグルは常時見え、開くと9件すべてが表示される', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS1Map(page)
    await page.getByRole('button', { name: 'SKIP' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    const toggle = page.getByRole('button', { name: '調査ポイント一覧' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('heading', { name: '調査ポイント一覧' })).toHaveCount(0)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('heading', { name: '調査ポイント一覧' })).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(9)
    await expect(page.getByText('プロキシログ')).toBeVisible()
    await expect(page.getByText('インシデント対応ガイドラインの確認')).toBeVisible()
  })
})

// #52 Phase4.7/#71・T045: 探索完了(「解決へ」の活性条件を満たす)と同時に、橘が会話フレームで
// 「材料は揃いました。そろそろ問題を整理しましょうか、あなた。」と1回促す(spec §7.1・DESIGN.md「探索シーン」節)。
// 一覧側から全件調査して活性条件を満たす経路(高速)でE2E確認する(背景シーン経由の等価な結線は
// 上の describe で既に確認済みのため、ここでは誘導の有無・1回性・導線の明示のみに絞る)。
test.describe('S1「標的型メールからの侵入」探索完了→解決への誘導(#71・T045)', () => {
  test('「解決へ」の活性条件を満たした時点で促しが1回出て、「わかった」を押すと解決画面へ直接進む(#52 追補)', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS1Map(page)
    await page.getByRole('button', { name: 'SKIP' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    const wrapUpLine = '材料は揃いました。そろそろ問題を整理しましょうか、あなた。'
    await expect(page.getByText(wrapUpLine)).toHaveCount(0)

    // 「調査ポイント一覧」トグルを開き(#66→T047でトグル化)、一覧側から全9件を調査して
    // 活性条件を満たす。
    await page.getByRole('button', { name: '調査ポイント一覧' }).click()
    let investigateButton = page.getByRole('button', { name: '調査する' }).first()
    while (await investigateButton.count()) {
      await investigateButton.click()
      investigateButton = page.getByRole('button', { name: '調査する' }).first()
    }

    // 促しが会話フレームで表示される(話者=橘)。
    await expect(page.getByText(wrapUpLine)).toBeVisible()

    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()

    // タイプライターをスキップして「わかった」を押すと、探索状態には戻らず「解決へ進む」
    // ボタンと同じ遷移で解決画面へ直接進む(#52 追補、DESIGN.md「探索シーン」節「探索完了→
    // 解決への誘導」)。ボタン文言は調査結果パネルの「閉じる」とわざと変えてあり(#71・T045)、
    // 両方の会話フレームが同時に開いてもアクセシブルネームが衝突しない。
    await skipTypewriter(page, wrapUpLine)
    await page.getByRole('button', { name: 'わかった' }).click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()
  })
})
