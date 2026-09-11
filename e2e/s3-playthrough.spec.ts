// e2e/s3-playthrough.spec.ts — Issue #75(#6量産2本目)「ECサイトのカード情報漏洩」
// 通しプレイの E2E テスト。
//
// e2e/s1-playthrough.spec.ts・e2e/s2-playthrough.spec.ts と同じ理由・同じ手法(実ブラウザ・
// 実IndexedDB・vite preview)で、マップ選択→導入→探索(背景シーン経由・一覧経由の両方・
// ドア移動・危険操作)→解決(会話モード。#75指定の「起点→原因特定→対策/対応」3問構成・
// 誤答フォロー)→結果まで、S3の実データで1マップ通しプレイできることを確認する
// (タスク指示「マップ選択からS3に入れること」)。S1/S2同様の演出(タイプライター表示・
// スキップ)を踏襲する。
//
// **これは代表監修前のドラフト**(Issue #75)。教育内容・決済規格(PCI DSS)・法制度の正確性は
// 代表レビュー後に確定する。
import { expect, test } from '@playwright/test'

/**
 * ConversationFrame のタイプライター表示をタップでスキップする(#64/T042と同じ仕組み。
 * 会話文の全文がスキップボタンのaccessible nameになる)。
 */
async function skipTypewriter(page: import('@playwright/test').Page, line: string) {
  await page.getByRole('button', { name: line, exact: true }).click()
}

/** マップ選択でS3「ECサイトのカード情報漏洩」を選ぶ(S1/S2と3件並ぶため、一覧行(li)を
 * タイトルの文言で絞り込んでから押す。e2e/s1-playthrough.spec.ts の selectS1Map・
 * e2e/s2-playthrough.spec.ts の selectS2Map と対)。 */
async function selectS3Map(page: import('@playwright/test').Page) {
  await page
    .getByRole('listitem')
    .filter({ hasText: 'ECサイトのカード情報漏洩' })
    .getByRole('button', { name: 'マップを選ぶ' })
    .click()
}

test.describe('S3「ECサイトのカード情報漏洩」通しプレイ(#75)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('マップ選択からS3を選び、背景シーン経由の探索(ドア移動・危険操作)→解決(3問の会話モード・誤答フォロー)→結果まで通しプレイできる', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await expect(page.getByRole('heading', { name: 'マップ選択' })).toBeVisible()

    await selectS3Map(page)
    await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()
    await expect(page.getByText('株式会社つきかげ通販')).toBeVisible()

    await page.getByRole('button', { name: 'タップで進行' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()
    // 「調査ポイント一覧」はトグルを開くまで表示されない(#66→T047でトグル化)ため、
    // このテスト(背景シーン経由)ではここでは開かず、末尾で開いて件数を確認する。

    // 執務室(#88で bg-s3-office を BACKGROUND_SRC に登録済み。実背景<img>が表示される)。
    const officeTab = page.getByRole('tab', { name: '執務室' })
    const opsRoomTab = page.getByRole('tab', { name: 'システム運用ルーム' })
    await expect(officeTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('img', { name: '執務室の背景' })).toBeVisible()

    // --- 執務室: PC(EC運営担当者の端末。collect×2/danger/noopの4action=アクションシート) ---
    const pcHotspot = page.getByRole('button', { name: 'EC運営担当者の端末（PC）' })
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: 'EC運営担当者の端末の操作' })).toBeVisible()

    // dangerを先に選ぶ: アクションシートは閉じ、会話オーバーレイ(橘の台詞)で教育的
    // フィードバックが提示される(T047。旧: シート内テキスト表示)。探索ではペナルティに
    // ならない(詰み防止・spec §8.4)。
    await page
      .getByRole('button', {
        name: '改ざんに気づいた決済ページのファイルを、証拠を残さずすぐに元へ書き戻す',
      })
      .click()
    await expect(page.getByRole('group', { name: 'EC運営担当者の端末の操作' })).toBeHidden()
    const dangerLine =
      '証拠を残さずに書き戻してしまうと、いつ・どのようにスクリプトが追加され、どこへデータが送られていたのかという手がかりが失われます。まず該当ページを一時停止し、改ざんされたファイルと通信先を保全してから対応してください。'
    await expect(page.getByText(dangerLine, { exact: false })).toBeVisible()

    // 会話オーバーレイを閉じると探索状態に戻り、同じホットスポットを再度開いて他のactionを
    // 選べる(危険操作の後も操作継続可=詰み防止)。ログをcollectできる。
    await skipTypewriter(page, dangerLine) // スキップ(全文表示)
    await page.getByRole('button', { name: dangerLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: 'EC運営担当者の端末の操作' })).toBeVisible()
    await page.getByRole('button', { name: 'カード情報の保存状況を確認する' }).click()
    await expect(page.getByRole('group', { name: 'EC運営担当者の端末の操作' })).toBeHidden()
    const dbLine =
      '決済まわりのデータベースを確認した。注文番号や配送先は記録されているが、カード番号や有効期限はどの列にも保存されていない。非保持化の運用は徹底されていたようだ。'
    await expect(page.getByText(dbLine, { exact: false })).toBeVisible()
    await skipTypewriter(page, dbLine) // スキップ(全文表示)
    await page.getByRole('button', { name: dbLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await pcHotspot.click()
    await page.getByRole('button', { name: 'WAFのログを確認する' }).click()
    const wafLine =
      'WAFのログを確認した。決済ページ宛てにSQLインジェクションを試みたと見られるリクエストが複数記録されているが、いずれもブロックされている。ただしWAFは、ブラウザから外部への通信までは監視していない。'
    await skipTypewriter(page, wafLine) // スキップ(全文表示)
    await page.getByRole('button', { name: wafLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await expect(pcHotspot).toHaveAccessibleName('EC運営担当者の端末（PC）・調査済み')

    // --- 執務室: person(EC運営担当者・管理部門長。単一action=即実行) ---
    await page.getByRole('button', { name: 'EC運営担当者（人物）', exact: true }).click()
    const ecStaffLine =
      'EC運営担当者に聞きました。最近サイトの見た目や決済画面に自分たちで手を加えた覚えはなく、CMSやプラグインのバージョン管理は開発委託先に任せきりだったそうです。'
    await skipTypewriter(page, ecStaffLine) // スキップ(全文表示)
    await page.getByRole('button', { name: ecStaffLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await page.getByRole('button', { name: '管理部門長（人物）', exact: true }).click()
    const managerLine =
      '管理部門長に伺いました。すでに複数の顧客から不正利用の申告が入っており、風評への影響を心配して、原因がはっきりするまで公表を控えたいという声も出ているそうです。'
    await skipTypewriter(page, managerLine) // スキップ(全文表示)
    await page.getByRole('button', { name: managerLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    // --- 執務室: book(資料棚。collectを2件持つ) ---
    const bookHotspot = page.getByRole('button', { name: '資料棚（書籍）' })
    await bookHotspot.click()
    await page.getByRole('button', { name: 'PCI DSS・非保持化に関する資料を確認する' }).click()
    const pcidssLine =
      'PCI DSSに関する資料を確認しました。PCI DSSは法律ではなく、国際カードブランドが定める業界基準です。カード番号を自社で保持しない「非保持化」はこの基準の対象範囲を狭める有効な対策ですが、決済ページ自体が改ざんされる攻撃までは防げません。'
    await skipTypewriter(page, pcidssLine) // スキップ(全文表示)
    await page.getByRole('button', { name: pcidssLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await bookHotspot.click()
    await page
      .getByRole('button', { name: 'フォームジャッキングに関する注意喚起を確認する' })
      .click()
    const advisoryLine =
      '注意喚起を確認した。決済ページのスクリプトを改ざんし、入力中のカード情報を確定前にブラウザから外部のサーバへ直接送信させる、フォームジャッキング(Webスキミング)と呼ばれる手口が全国的に報告されている。今回の型に近い。'
    await skipTypewriter(page, advisoryLine) // スキップ(全文表示)
    await page.getByRole('button', { name: advisoryLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await expect(bookHotspot).toHaveAccessibleName('資料棚（書籍）・調査済み')

    // --- ドア(door)でシステム運用ルームへ移動する(タブと併用可能・#78/T046-ui-dataと同じ結線) ---
    await page.getByRole('button', { name: 'システム運用ルームへの扉（扉）' }).click()
    await expect(opsRoomTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('img', { name: 'システム運用ルームの背景' })).toBeVisible()

    // --- システム運用ルーム: device(運用監視端末。collectを2件持つ) ---
    const deviceHotspot = page.getByRole('button', { name: '運用監視端末（機器）' })
    await deviceHotspot.click()
    await page.getByRole('button', { name: 'Webサーバのアクセスログを確認する' }).click()
    const accessLine =
      'Webサーバのアクセスログを確認した。深夜、お知らせ機能で使っている更新の遅れたプラグインの管理画面宛てに、公表済みの脆弱性を突く典型的なリクエストパターンが記録されている。'
    await skipTypewriter(page, accessLine) // スキップ(全文表示)
    await page.getByRole('button', { name: accessLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)

    await deviceHotspot.click()
    await page.getByRole('button', { name: '決済ページの改ざん検知ログを確認する' }).click()
    const tamperLine =
      '決済ページのファイルを、正規のバックアップと比較した。スクリプトの末尾に見慣れないコードが追加されており、入力されたカード番号・有効期限・セキュリティコードを、フォーム送信前に外部の見知らぬドメインへ直接送っていた。'
    await skipTypewriter(page, tamperLine) // スキップ(全文表示)
    await page.getByRole('button', { name: tamperLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await expect(deviceHotspot).toHaveAccessibleName('運用監視端末（機器）・調査済み')

    // --- システム運用ルーム: person(開発委託先の担当者。promptの挨拶が見出しに出る) ---
    const vendorHotspot = page.getByRole('button', { name: '開発委託先の担当者（人物）' })
    await vendorHotspot.click()
    const vendorSheet = page.getByRole('group', { name: '開発委託先の担当者の操作' })
    await expect(vendorSheet).toBeVisible()
    await expect(
      page.getByRole('heading', { name: '開発委託先「何かお困りですか？」' }),
    ).toBeVisible()

    await page.getByRole('button', { name: '開発委託先に話を聞く' }).click()
    const vendorLine =
      '開発委託先に聞きました。数か月前、お知らせ機能で使っているプラグインに深刻な脆弱性が公表され、更新を案内していたが、他の連携機能への影響確認に時間がかかり、適用が後回しになっていたそうです。'
    await skipTypewriter(page, vendorLine) // スキップ(全文表示)
    await page.getByRole('button', { name: vendorLine, exact: true }).click() // 閉じる(T048。専用の「閉じる」ボタンは無い)
    await expect(vendorHotspot).toHaveAccessibleName('開発委託先の担当者（人物）・調査済み')

    // これが9件目(最後)の調査のため、ここで「解決へ」の活性条件を満たし、探索完了への誘導
    // (#71・T045)の会話オーバーレイが入れ替わりで自動的に開く(conversationSlotが会話状態を
    // 引き継ぐ)。一覧を確認する前に一旦それを閉じる。
    const wrapUpLine = 'そろそろ問題をまとめようか。'
    await expect(page.getByText(wrapUpLine)).toBeVisible()
    await skipTypewriter(page, wrapUpLine)
    await page.getByRole('button', { name: 'わかった' }).click()

    // 「調査ポイント一覧」トグルを開いて一覧側でも9/9件が調査済みとして共有されていることを
    // 確認する(#66→T047でトグル化)。
    await page.getByRole('button', { name: '調査ポイント一覧' }).click()
    await expect(page.getByText('9/9 件調査済み')).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)

    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()
    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()

    // --- 解決(会話モード): q-entry-point → q-immediate-response → q-response-policy の3問。 ---
    const entryPrompt =
      'カード情報は自社のデータベースに保存していなかった。それなのになぜ漏れたと見る？'
    await expect(page.getByText(entryPrompt)).toBeVisible()
    await skipTypewriter(page, entryPrompt)

    // わざと「SQLインジェクション」を選び、誤答フォローで問い・選択肢が残ることを確認する
    // (⑥失敗解説の独立画面は廃止済み。会話モード内で完結する。S1/S2の教育的失敗テストと対)。
    const sqliChoice = page.getByRole('button', {
      name: 'SQLインジェクションでデータベースから直接カード番号が抜き取られた',
    })
    await sqliChoice.click()
    await expect(
      page.getByText('そもそもカード番号は保存されていない', { exact: false }),
    ).toBeVisible()
    await expect(page.getByText(entryPrompt)).toBeVisible()
    await expect(sqliChoice).toBeVisible()

    // 再挑戦で正しい起点(フォームジャッキング)を選ぶ。
    await page
      .getByRole('button', {
        name: '決済ページのスクリプトが改ざんされ、入力中のカード情報が確定前にブラウザから外部のサーバへ直接送信されていた(フォームジャッキング)',
      })
      .click()

    const immediatePrompt = '決済ページの改ざんが確認できました。技術的にまず取るべき対応は？'
    await expect(page.getByText(immediatePrompt)).toBeVisible()
    await skipTypewriter(page, immediatePrompt)
    await page
      .getByRole('button', {
        name: '決済ページを一時停止するかカード決済の受付を止め、改ざんされたファイルと通信先を保全した上で、脆弱性のあるプラグインを修正してから正規のファイルに戻す',
      })
      .click()

    const policyPrompt = 'クレジットカード情報の漏えいが濃厚な状況です。今後の対応方針は？'
    await expect(page.getByText(policyPrompt)).toBeVisible()
    await skipTypewriter(page, policyPrompt)
    await page
      .getByRole('button', {
        name: 'カード会社・決済代行事業者へ速やかに連絡するとともに、個人データの漏えいのおそれがある以上、個人情報保護委員会への報告要否を速やかに判断し、必要な範囲で本人への通知も行う',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    // result-screen.tsx はシナリオタイトルそのものは表示しないため、clear_explanation の
    // 台詞から本事案であることを確認する(S1/S2テストのチェックと対)。
    await expect(page.getByText('フォームジャッキング', { exact: false }).first()).toBeVisible()

    // 誤答1回・相談0回でクリアしたぶんのXP減算を確認する(FR-11/spec §8.4。単価はS1/S2と同じ
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
  // (e2e/s1-playthrough.spec.ts・e2e/s2-playthrough.spec.ts の一覧経由テストと対)。
  test('マップ選択からS3を選び、調査ポイント一覧経由の探索→解決(3問とも正答)→結果まで進行し、満額のXPが表示される', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectS3Map(page)
    await page.getByRole('button', { name: 'タップで進行' }).click()
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

    const entryPrompt =
      'カード情報は自社のデータベースに保存していなかった。それなのになぜ漏れたと見る？'
    await skipTypewriter(page, entryPrompt)
    await page
      .getByRole('button', {
        name: '決済ページのスクリプトが改ざんされ、入力中のカード情報が確定前にブラウザから外部のサーバへ直接送信されていた(フォームジャッキング)',
      })
      .click()

    const immediatePrompt = '決済ページの改ざんが確認できました。技術的にまず取るべき対応は？'
    await expect(page.getByText(immediatePrompt)).toBeVisible()
    await skipTypewriter(page, immediatePrompt)
    await page
      .getByRole('button', {
        name: '決済ページを一時停止するかカード決済の受付を止め、改ざんされたファイルと通信先を保全した上で、脆弱性のあるプラグインを修正してから正規のファイルに戻す',
      })
      .click()

    const policyPrompt = 'クレジットカード情報の漏えいが濃厚な状況です。今後の対応方針は？'
    await expect(page.getByText(policyPrompt)).toBeVisible()
    await skipTypewriter(page, policyPrompt)
    await page
      .getByRole('button', {
        name: 'カード会社・決済代行事業者へ速やかに連絡するとともに、個人データの漏えいのおそれがある以上、個人情報保護委員会への報告要否を速やかに判断し、必要な範囲で本人への通知も行う',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()

    // FR-6/FR-11: 誤答・相談なしでクリアしたので満額のXPが加算・表示される(S1/S2テストと対)。
    await expect(page.getByText('誤答: 0回 / 相談: 0回')).toBeVisible()
    await expect(page.getByText('獲得XP: +100')).toBeVisible()
    await expect(page.getByText('累計XP: 100')).toBeVisible()
  })
})
