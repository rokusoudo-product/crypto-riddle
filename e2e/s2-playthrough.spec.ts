// e2e/s2-playthrough.spec.ts — Issue #74(#6量産1本目)「VPN装置の脆弱性放置とランサムウェア感染」
// 通しプレイの E2E テスト。
//
// e2e/s1-playthrough.spec.ts と同じ理由・同じ手法(実ブラウザ・実IndexedDB・vite preview)で、
// マップ選択→導入→探索(背景シーン経由・一覧経由の両方・ドア移動・統合ホットスポット・
// 危険操作)→解決(会話モード。#74指定の「起点→初動→方針」3問構成・誤答フォロー)→結果まで、
// S2の実データで1マップ通しプレイできることを確認する(タスク指示「マップ選択からS2に入れる
// こと」)。S1同様の演出(タイプライター表示・スキップ)を踏襲する。
//
// **これは代表監修前のドラフト**(Issue #74)。教育内容・法制度の正確性は代表レビュー後に確定する。
import { expect, test } from '@playwright/test'

/**
 * ConversationFrame のタイプライター表示をタップでスキップする(#64/T042と同じ仕組み。
 * 会話文の全文がスキップボタンのaccessible nameになる)。
 */
async function skipTypewriter(page: import('@playwright/test').Page, line: string) {
  await page.getByRole('button', { name: line, exact: true }).click()
}

/** マップ選択でS2「VPN装置の脆弱性放置とランサムウェア感染」を選ぶ(S1と行が並ぶため、
 * 一覧行(li)をタイトルの文言で絞り込んでから押す。e2e/s1-playthrough.spec.ts の
 * selectS1Map と対)。 */
async function selectS2Map(page: import('@playwright/test').Page) {
  await page
    .getByRole('listitem')
    .filter({ hasText: 'VPN装置の脆弱性放置とランサムウェア感染' })
    .getByRole('button', { name: 'マップを選ぶ' })
    .click()
}

test.describe('S2「VPN装置の脆弱性放置とランサムウェア感染」通しプレイ(#74)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('マップ選択からS2を選び、背景シーン経由の探索(ドア移動・統合ホットスポット・危険操作)→解決(3問の会話モード・誤答フォロー)→結果まで通しプレイできる', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await expect(page.getByRole('heading', { name: 'マップ選択' })).toBeVisible()

    await selectS2Map(page)
    await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()
    await expect(page.getByText('株式会社みなと精工')).toBeVisible()

    await page.getByRole('button', { name: 'SKIP' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()
    // 「調査ポイント一覧」はトグルを開くまで表示されない(#66→T047でトグル化)ため、
    // このテスト(背景シーン経由)ではここでは開かず、末尾で開いて件数を確認する。

    // 執務室(#88で bg-s2-office を BACKGROUND_SRC に登録済み。実背景<img>が表示される)。
    const officeTab = page.getByRole('tab', { name: '執務室' })
    const serverTab = page.getByRole('tab', { name: 'サーバ室' })
    await expect(officeTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('img', { name: '執務室の背景' })).toBeVisible()

    // --- 執務室: PC(情シス管理端末。collect×2/danger/noopの4action=アクションシート) ---
    const pcHotspot = page.getByRole('button', { name: '情シス管理端末（PC）' })
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: '情シス管理端末の操作' })).toBeVisible()

    // dangerを先に選ぶ: アクションシートは閉じ、会話オーバーレイ(橘の台詞)で教育的
    // フィードバックが提示される(T047。旧: シート内テキスト表示)。探索ではペナルティに
    // ならない(詰み防止・spec §8.4)。
    await page.getByRole('button', { name: '暗号化されたファイルサーバを再起動する' }).click()
    await expect(page.getByRole('group', { name: '情シス管理端末の操作' })).toBeHidden()
    const dangerLine =
      'ここでサーバを再起動すると、感染直後のプロセスや接続先の情報が乗ったメモリ上の証拠が消えてしまいます。まずネットワークから論理的に切り離し、フォレンジック調査の前に電源操作はしないでください。'
    await expect(page.getByText(dangerLine, { exact: false })).toBeVisible()

    // 会話オーバーレイを閉じると探索状態に戻り、同じホットスポットを再度開いて他のactionを
    // 選べる(危険操作の後も操作継続可=詰み防止)。ログをcollectできる。
    await skipTypewriter(page, dangerLine) // スキップ(全文表示)
    await page.getByRole('button', { name: dangerLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: '情シス管理端末の操作' })).toBeVisible()
    await page.getByRole('button', { name: '認証サーバのログを確認する' }).click()
    await expect(page.getByRole('group', { name: '情シス管理端末の操作' })).toBeHidden()
    const authLine =
      '深夜、経理システムの管理者アカウントを使って、数分の間に複数のサーバへ次々とログインした記録がある。パスワードそのものではなく認証情報のハッシュ値を使い回す、Pass-the-Hashによるラテラルムーブメントの典型的な挙動だ。'
    await expect(page.getByText(authLine, { exact: false })).toBeVisible()
    await skipTypewriter(page, authLine) // スキップ(全文表示)
    await page.getByRole('button', { name: authLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await pcHotspot.click()
    await page.getByRole('button', { name: 'ファイルサーバの暗号化状況を確認する' }).click()
    const fileserverLine =
      'ファイルサーバの共有フォルダを見た。数千件のファイルが短時間で見慣れない拡張子に置き換わっている。フォルダ直下には身代金を要求するメッセージファイルも置かれていた。ランサムウェアによる一括暗号化だ。'
    await skipTypewriter(page, fileserverLine) // スキップ(全文表示)
    await page.getByRole('button', { name: fileserverLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await expect(pcHotspot).toHaveAccessibleName('情シス管理端末（PC）・調査済み')

    // --- 執務室: person(情シス担当・管理部門長。単一action=即実行) ---
    await page.getByRole('button', { name: '情シス担当（人物）', exact: true }).click()
    const itstaffLine =
      '情シス担当に聞きました。VPN装置は数年前に保守業者へ設置してもらったきりで、資産管理台帳には登録されておらず、ファームウェア更新の通知が来ていたことにも気づいていなかったそうです。'
    await skipTypewriter(page, itstaffLine) // スキップ(全文表示)
    await page.getByRole('button', { name: itstaffLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await page.getByRole('button', { name: '管理部門長（人物）', exact: true }).click()
    const managerLine =
      '管理部門長に伺いました。すでに一部の生産ラインの稼働に影響が出ており、一刻も早い復旧のためなら身代金の支払いも検討すべきではないか、との声が社内で出ているそうです。'
    await skipTypewriter(page, managerLine) // スキップ(全文表示)
    await page.getByRole('button', { name: managerLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    // --- 執務室: book(資料棚。collectを2件持つ) ---
    const bookHotspot = page.getByRole('button', { name: '資料棚（書籍）' })
    await bookHotspot.click()
    await page
      .getByRole('button', { name: '脆弱性対応・資産管理に関する注意喚起を確認する' })
      .click()
    const advisoryLine =
      '注意喚起を確認した。境界に設置されたVPN装置等の深刻な脆弱性が放置されると、そこを起点に社内ネットワークへ侵入され、認証情報の窃取や他端末への横展開に悪用される事例が全国的に報告されている。資産管理台帳で機器を把握し、深刻度の高い脆弱性から優先して更新するのが基本とされている。'
    await skipTypewriter(page, advisoryLine) // スキップ(全文表示)
    await page.getByRole('button', { name: advisoryLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await bookHotspot.click()
    await page.getByRole('button', { name: 'バックアップ運用ガイドラインを確認する' }).click()
    const guidelineLine =
      'バックアップ運用ガイドラインを確認しました。バックアップは複数世代を保持し、本番環境とは別の媒体・別の場所に、ネットワークから切り離した状態でも保管すること(3-2-1ルール)。常時オンライン接続のバックアップは、侵入時に本体ごと暗号化される危険があるためです。'
    await skipTypewriter(page, guidelineLine) // スキップ(全文表示)
    await page.getByRole('button', { name: guidelineLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await expect(bookHotspot).toHaveAccessibleName('資料棚（書籍）・調査済み')

    // --- ドア(door)でサーバ室へ移動する(タブと併用可能・#78・T046-ui-dataと同じ結線) ---
    await page.getByRole('button', { name: 'サーバ室への扉（扉）' }).click()
    await expect(serverTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('img', { name: 'サーバ室の背景' })).toBeVisible()

    // --- サーバ室: person(保守業者。VPN装置のログ+証言を統合したホットスポット。
    //     S1の「サーバ管理者」統合と同じ考え方で、promptの挨拶が見出しに出る) ---
    const vendorHotspot = page.getByRole('button', { name: '保守業者（人物）' })
    await vendorHotspot.click()
    const vendorSheet = page.getByRole('group', { name: '保守業者の操作' })
    await expect(vendorSheet).toBeVisible()
    await expect(
      page.getByRole('heading', { name: '保守業者「点検に伺いました。何かありましたか？」' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'VPN装置のログを確認する' }).click()
    const vpnLine =
      'VPN装置のログを確認した。深夜、海外のIPアドレスから、有効な社員アカウントを使った接続が記録されている。フィッシングの形跡はなく、パッチが未適用のまま放置されていた脆弱性を突かれて認証を突破された可能性が高い。'
    await skipTypewriter(page, vpnLine) // スキップ(全文表示)
    await page.getByRole('button', { name: vpnLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await vendorHotspot.click()
    await page.getByRole('button', { name: '保守業者に話を聞く' }).click()
    const vendorLine =
      '保守業者に聞きました。半年ほど前、VPN装置のファームウェアに重大な脆弱性が見つかったとして更新を案内するメールを送ったが、その後の返信も更新作業の依頼もなく、そのままになっていたそうです。'
    await skipTypewriter(page, vendorLine) // スキップ(全文表示)
    await page.getByRole('button', { name: vendorLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await expect(vendorHotspot).toHaveAccessibleName('保守業者（人物）・調査済み')

    // --- サーバ室: device(バックアップサーバ。単一action=即実行) ---
    await page.getByRole('button', { name: 'バックアップサーバ（機器）', exact: true }).click()
    const backupLine =
      'バックアップサーバを確認した。本番ネットワークに常時オンラインで接続されており、同じ管理者アカウントでアクセスできる状態だった。直近の世代のバックアップも、横展開の過程で他のファイルと同様に暗号化されており、そのままでは復旧に使えない。'
    await skipTypewriter(page, backupLine) // スキップ(全文表示)
    await page.getByRole('button', { name: backupLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    // これが9件目(最後)の調査のため、ここで「解決へ」の活性条件を満たし、探索完了への誘導
    // (#71・T045)の会話オーバーレイが入れ替わりで自動的に開く(conversationSlotが会話状態を
    // 引き継ぐ)。
    const wrapUpLine = '材料は揃いました。そろそろ問題を整理しましょうか、あなた。'
    await expect(page.getByText(wrapUpLine)).toBeVisible()
    await skipTypewriter(page, wrapUpLine)

    // 右上の「調査ポイント一覧」トグルは会話状態でも常時表示されるため、「わかった」を押す前に
    // 一覧側で9/9件が調査済みとして共有されていること・「解決へ進む」の活性化を確認できる
    // (#66→T047でトグル化)。
    await page.getByRole('button', { name: '調査ポイント一覧' }).click()
    await expect(page.getByText('9/9 件調査済み')).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '解決へ進む' })).toBeEnabled()
    await page.getByRole('button', { name: '調査ポイント一覧' }).click()

    // 「わかった」は探索状態には戻らず、「解決へ進む」ボタンと同じ遷移で解決画面へ直接進む
    // (#52 追補、DESIGN.md「探索シーン」節「探索完了→解決への誘導」)。
    await page.getByRole('button', { name: 'わかった' }).click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()

    // --- 解決(会話モード): q-entry-point → q-initial-response → q-response-policy の3問。 ---
    const entryPrompt = '今回の侵入、どこから入られたと見る？'
    await expect(page.getByText(entryPrompt)).toBeVisible()
    await skipTypewriter(page, entryPrompt)
    await page
      .getByRole('button', {
        name: '境界に設置されたVPN装置の、更新されていなかった深刻な脆弱性を突かれた不正アクセス',
      })
      .click()

    const initialResponsePrompt =
      'ランサムウェアによる暗号化が確認された状況で、感染したサーバへの初動対応は？'
    await expect(page.getByText(initialResponsePrompt)).toBeVisible()
    await skipTypewriter(page, initialResponsePrompt)

    // わざと「直ちに再起動する」を選び、誤答フォローで問い・選択肢が残ることを確認する
    // (⑥失敗解説の独立画面は廃止済み。会話モード内で完結する。S1の教育的失敗テストと対)。
    const rebootChoice = page.getByRole('button', { name: '直ちにサーバを再起動して復旧を試みる' })
    await rebootChoice.click()
    await expect(
      page.getByText('感染直後のプロセスや接続先の情報が乗ったメモリ上の証拠が失われます', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(page.getByText(initialResponsePrompt)).toBeVisible()
    await expect(rebootChoice).toBeVisible()

    // 再挑戦で正しい初動(論理的な切り離し・証拠保全)を選ぶ。
    await page
      .getByRole('button', {
        name: 'サーバをネットワークから論理的に切り離し、電源は落とさずメモリ・ディスクの証拠を保全した上で被害範囲を特定する',
      })
      .click()

    const policyPrompt =
      'バックアップも暗号化され、復旧の目処が立たない状況です。今後の対応方針は？'
    await expect(page.getByText(policyPrompt)).toBeVisible()
    await skipTypewriter(page, policyPrompt)
    await page
      .getByRole('button', {
        name: '身代金は支払わず、警察・専門家と連携しながら復旧を進め、個人データの漏えいのおそれがある以上、個人情報保護委員会への報告要否を速やかに判断する',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    // result-screen.tsx はシナリオタイトルそのものは表示しないため、clear_explanation の
    // 台詞から本事案であることを確認する(S1テストの「標的型メール攻撃」チェックと対)。
    await expect(page.getByText('VPN装置の脆弱性', { exact: false }).first()).toBeVisible()

    // 誤答1回・相談0回でクリアしたぶんのXP減算を確認する(FR-11/spec §8.4。単価はS1と同じ
    // 共通ロジック=src/ui/store/save-integration.tsのため、CLEAR_XP_REWARD(100)から
    // WRONG_ANSWER_XP_PENALTY(10)を1回ぶん引いた90になる)。
    await expect(page.getByText('誤答: 1回 / 相談: 0回')).toBeVisible()
    await expect(page.getByText('獲得XP: +90')).toBeVisible()
    await expect(page.getByText('累計XP: 90')).toBeVisible()

    // FR-7: 出典表記(citation-policy §4 の主表示位置=結果画面)。
    await expect(
      page.getByText('本シナリオは以下を参考に作成したオリジナルの創作です。'),
    ).toBeVisible()
  })

  // 上のテストは背景シーン(ホットスポット)経由の探索のみを通る。タスク指示の「背景／一覧の
  // 両経路」を満たすため、こちらは一覧側(常に併設・WCAGの背景非依存要件)の「調査する」だけで
  // 全9件を調査し、正解ルート(誤答・相談なし)でクリアすることを確認する
  // (e2e/s1-playthrough.spec.ts の playThroughExplorationToResolution と対の経路)。
  test('マップ選択からS2を選び、調査ポイント一覧経由の探索→解決(3問とも正答)→結果まで進行し、満額のXPが表示される', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS2Map(page)
    await page.getByRole('button', { name: 'SKIP' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    // 「調査ポイント一覧」トグルを開き(#66→T047でトグル化)、一覧側の「調査する」だけで
    // 全9箇所を調査する(背景シーンのホットスポットには触れない)。
    await page.getByRole('button', { name: '調査ポイント一覧' }).click()
    let investigateButton = page.getByRole('button', { name: '調査する' }).first()
    while (await investigateButton.count()) {
      await investigateButton.click()
      investigateButton = page.getByRole('button', { name: '調査する' }).first()
    }
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)
    await expect(page.getByText('9/9 件調査済み')).toBeVisible()

    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()
    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()

    const entryPrompt = '今回の侵入、どこから入られたと見る？'
    await skipTypewriter(page, entryPrompt)
    await page
      .getByRole('button', {
        name: '境界に設置されたVPN装置の、更新されていなかった深刻な脆弱性を突かれた不正アクセス',
      })
      .click()

    const initialResponsePrompt =
      'ランサムウェアによる暗号化が確認された状況で、感染したサーバへの初動対応は？'
    await expect(page.getByText(initialResponsePrompt)).toBeVisible()
    await skipTypewriter(page, initialResponsePrompt)
    await page
      .getByRole('button', {
        name: 'サーバをネットワークから論理的に切り離し、電源は落とさずメモリ・ディスクの証拠を保全した上で被害範囲を特定する',
      })
      .click()

    const policyPrompt =
      'バックアップも暗号化され、復旧の目処が立たない状況です。今後の対応方針は？'
    await expect(page.getByText(policyPrompt)).toBeVisible()
    await skipTypewriter(page, policyPrompt)
    await page
      .getByRole('button', {
        name: '身代金は支払わず、警察・専門家と連携しながら復旧を進め、個人データの漏えいのおそれがある以上、個人情報保護委員会への報告要否を速やかに判断する',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()

    // FR-6/FR-11: 誤答・相談なしでクリアしたので満額のXPが加算・表示される(S1テストと対)。
    await expect(page.getByText('誤答: 0回 / 相談: 0回')).toBeVisible()
    await expect(page.getByText('獲得XP: +100')).toBeVisible()
    await expect(page.getByText('累計XP: 100')).toBeVisible()
  })
})
