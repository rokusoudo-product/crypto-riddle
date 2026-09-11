// e2e/sl-playthrough.spec.ts — Issue #76(#6量産4本目・法務新規シナリオ)
// 「委託先クラウドストレージからの個人データ漏えい」通しプレイの E2E テスト。
//
// e2e/s1-playthrough.spec.ts・e2e/s2-playthrough.spec.ts・e2e/s3-playthrough.spec.ts と同じ理由・
// 同じ手法(実ブラウザ・実IndexedDB・vite preview)で、マップ選択→導入→探索(背景シーン経由・
// 一覧経由の両方・ドア移動・危険操作)→解決(会話モード。#76指定の「原因→報告義務の所在→
// 是正・方針」3問構成・誤答フォロー)→結果まで、SLの実データで1マップ通しプレイできることを
// 確認する(タスク指示「マップ選択からSLに入れること」)。マップ選択で4件並ぶ(S1/S2/S3/SL)ため、
// S1〜S3のヘルパー方式(一覧行(li)をタイトルの文言で絞り込む)に倣い、専用セレクタで曖昧一致を
// 回避する。S1〜S3同様の演出(タイプライター表示・スキップ)を踏襲する。
//
// **これは代表監修前のドラフト**(Issue #76)。教育内容・法制度(委託先監督義務・報告義務)の
// 正確性は代表レビュー(#81と同スコープ)後に確定する。
import { expect, test } from '@playwright/test'

/**
 * ConversationFrame のタイプライター表示をタップでスキップする(#64/T042と同じ仕組み。
 * 会話文の全文がスキップボタンのaccessible nameになる)。
 */
async function skipTypewriter(page: import('@playwright/test').Page, line: string) {
  await page.getByRole('button', { name: line, exact: true }).click()
}

/** マップ選択でSL「委託先クラウドストレージからの個人データ漏えい」を選ぶ(S1/S2/S3と4件並ぶため、
 * 一覧行(li)をタイトルの文言で絞り込んでから押す。e2e/s1-playthrough.spec.ts の selectS1Map・
 * e2e/s2-playthrough.spec.ts の selectS2Map・e2e/s3-playthrough.spec.ts の selectS3Map と対)。 */
async function selectSlMap(page: import('@playwright/test').Page) {
  await page
    .getByRole('listitem')
    .filter({ hasText: '委託先クラウドストレージからの個人データ漏えい' })
    .getByRole('button', { name: 'マップを選ぶ' })
    .click()
}

test.describe('SL「委託先クラウドストレージからの個人データ漏えい」通しプレイ(#76)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('マップ選択からSLを選び、背景シーン経由の探索(ドア移動・危険操作)→解決(3問の会話モード・誤答フォロー)→結果まで通しプレイできる', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await expect(page.getByRole('heading', { name: 'マップ選択' })).toBeVisible()

    await selectSlMap(page)
    await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()
    // 導入文(intro.background)にも被害企業名「株式会社ひばり生活サービス」がそのまま含まれ、
    // getByText だと本文と見出しの2件がヒットして曖昧一致になるため、被害企業名見出し
    // (victim_company.name)は role=heading で厳密に絞り込む(S1〜S3は導入文と会社名見出しの
    // 表記が完全一致しないため、この曖昧一致は発生していなかった)。
    await expect(page.getByRole('heading', { name: '株式会社ひばり生活サービス' })).toBeVisible()

    await page.getByRole('button', { name: 'タップで進行' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()
    await expect(page.getByText('委託契約書(監督条項)の確認')).toBeVisible()

    // 自社執務室(背景未生成のためプレースホルダ表示。scene-explorer.tsx の BACKGROUND_SRC
    // フォールバック=コード変更なしで動作することの確認を兼ねる)。
    const officeTab = page.getByRole('tab', { name: '自社執務室' })
    const vendorTab = page.getByRole('tab', { name: '委託先ブース(会議室)' })
    await expect(officeTab).toHaveAttribute('aria-selected', 'true')
    await expect(
      page.getByRole('img', { name: '自社執務室の背景（画像は準備中のためプレースホルダ表示）' }),
    ).toBeVisible()

    // --- 執務室: book(委託契約書棚。collectを2件持つ) ---
    const bookHotspot = page.getByRole('button', { name: '委託契約書棚（書籍）' })
    await bookHotspot.click()
    await page.getByRole('button', { name: '委託契約書(監督条項)を確認する' }).click()
    const contractLine =
      '委託契約書を確認しました。委託先に対し、安全管理措置の実施状況を定期的に報告させ、必要な指示を行うことができる監督条項が明記されています。'
    await skipTypewriter(page, contractLine)
    await page.getByRole('button', { name: '閉じる' }).click()

    await bookHotspot.click()
    await page.getByRole('button', { name: '個人情報保護法ガイドラインを確認する' }).click()
    const guidelineLine =
      'ガイドラインを確認しました。個人データの取扱いを委託する場合、委託元は委託先に対して必要かつ適切な監督を行う義務を負い、委託先の監督が不十分であったことに起因する漏えい等は、委託元の義務違反として問題になり得るとされています。'
    await skipTypewriter(page, guidelineLine)
    await page.getByRole('button', { name: '閉じる' }).click()
    await expect(bookHotspot).toHaveAccessibleName('委託契約書棚（書籍）・調査済み')

    // --- 執務室: PC(委託先の一次報告を受けた端末。collect/danger/noopの3action=アクションシート) ---
    const pcHotspot = page.getByRole('button', { name: '委託先の一次報告を受けた端末（PC）' })
    await pcHotspot.click()
    await expect(page.getByRole('group', { name: '委託先の一次報告を受けた端末の操作' })).toBeVisible()

    // dangerを先に選ぶ: 教育的フィードバックのみが表示され、シートは閉じない(詰み防止)。
    await page
      .getByRole('button', {
        name: '委託先からの一次報告メールを、事実関係の確認や公表判断を待たずにそのまま社内外へ転送する',
      })
      .click()
    await expect(page.getByText('混乱と説明責任の問題を招きます', { exact: false })).toBeVisible()
    await expect(page.getByRole('group', { name: '委託先の一次報告を受けた端末の操作' })).toBeVisible()

    // 危険操作の後も同じホットスポットを操作でき、ログをcollectできる(詰み防止)。
    await page.getByRole('button', { name: '委託先からの一次報告を確認する' }).click()
    await expect(page.getByRole('group', { name: '委託先の一次報告を受けた端末の操作' })).toBeHidden()
    const reportLine =
      '委託先からの一次報告メールを確認した。クラウドストレージの共有設定を「限定公開」から誤って「リンクを知っていれば誰でも閲覧可能」に変更しており、外部からアクセスされた形跡があるとのことだった。'
    await expect(page.getByText(reportLine, { exact: false })).toBeVisible()
    await skipTypewriter(page, reportLine)
    await page.getByRole('button', { name: '閉じる' }).click()
    await expect(pcHotspot).toHaveAccessibleName('委託先の一次報告を受けた端末（PC）・調査済み')

    // --- ドア(door)で委託先ブースへ移動する(タブと併用可能・#78/T046-ui-dataと同じ結線) ---
    await page.getByRole('button', { name: '委託先ブースへの扉（扉）' }).click()
    await expect(vendorTab).toHaveAttribute('aria-selected', 'true')
    await expect(
      page.getByRole('img', { name: '委託先ブース(会議室)の背景（画像は準備中のためプレースホルダ表示）' }),
    ).toBeVisible()

    // --- 委託先ブース: device(委託先のクラウドストレージ管理端末。単一action=即実行) ---
    const deviceHotspot = page.getByRole('button', { name: '委託先のクラウドストレージ管理端末（機器）' })
    await deviceHotspot.click()
    const storageLogLine =
      '委託先のクラウドストレージのアクセスログを確認した。共有設定が変更された直後から、複数の見知らぬ外部IPアドレスから会員データの保管領域へ直接アクセスされた記録が残っている。'
    await skipTypewriter(page, storageLogLine)
    await page.getByRole('button', { name: '閉じる' }).click()
    await expect(deviceHotspot).toHaveAccessibleName('委託先のクラウドストレージ管理端末（機器）・調査済み')

    // --- 委託先ブース: person(委託先担当者。promptの挨拶が見出しに出る) ---
    const vendorHotspot = page.getByRole('button', { name: '委託先担当者（人物）' })
    await vendorHotspot.click()
    const vendorSheet = page.getByRole('group', { name: '委託先担当者の操作' })
    await expect(vendorSheet).toBeVisible()
    await expect(page.getByRole('heading', { name: '委託先担当者「何かご質問はありますか？」' })).toBeVisible()

    await page.getByRole('button', { name: '委託先担当者に話を聞く' }).click()
    const testimonyLine =
      '委託先担当者に聞きました。クラウドストレージの公開範囲の設定を、定期点検の作業中に誤って変更してしまったとのことでした。契約で定められていた定期点検も、人員不足で直近は実施できていなかったそうです。'
    await skipTypewriter(page, testimonyLine)
    await page.getByRole('button', { name: '閉じる' }).click()
    await expect(vendorHotspot).toHaveAccessibleName('委託先担当者（人物）・調査済み')

    // --- 委託先ブース: book(委託先の安全管理措置報告書。単一action=即実行) ---
    const safetyBookHotspot = page.getByRole('button', { name: '委託先の安全管理措置報告書（書籍）' })
    await safetyBookHotspot.click()
    const safetyLine =
      '委託先が提出した安全管理措置の報告書を確認した。アクセス権限の設定手順は定められているが、変更後の設定内容を第三者が確認するダブルチェック体制までは整備されていなかった。'
    await skipTypewriter(page, safetyLine)
    await page.getByRole('button', { name: '閉じる' }).click()
    await expect(safetyBookHotspot).toHaveAccessibleName('委託先の安全管理措置報告書（書籍）・調査済み')

    // 一覧側(常に併設)でも6/6件が調査済みとして共有されている。
    await expect(page.getByText('6/6 件調査済み')).toBeVisible()
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)

    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()
    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()

    // --- 解決(会話モード): q-cause → q-report-duty → q-corrective-action の3問。 ---
    const causePrompt = '顧客の個人データが漏えいした原因は、どこにあると見る？'
    await expect(page.getByText(causePrompt)).toBeVisible()
    await skipTypewriter(page, causePrompt)

    // わざと「委託先の従業員が意図的に持ち出した」を選び、誤答フォローで問い・選択肢が残ることを確認する
    // (⑥失敗解説の独立画面は廃止済み。会話モード内で完結する。S1〜S3の教育的失敗テストと対)。
    const insiderChoice = page.getByRole('button', {
      name: '委託先の従業員が個人データを意図的に持ち出した',
    })
    await insiderChoice.click()
    await expect(page.getByText('共有設定の誤変更という単純なミスだ', { exact: false })).toBeVisible()
    await expect(page.getByText(causePrompt)).toBeVisible()
    await expect(insiderChoice).toBeVisible()

    // 再挑戦で正しい原因(共有設定ミス)を選ぶ。
    await page
      .getByRole('button', {
        name: '委託先のクラウドストレージの共有設定が誤って「限定公開」から「リンクを知っていれば誰でも閲覧可能」に変更されており、外部からアクセスされた',
      })
      .click()

    const reportDutyPrompt = '個人データの漏えいのおそれが確認できました。報告義務は誰に生じると考えますか？'
    await expect(page.getByText(reportDutyPrompt)).toBeVisible()
    await skipTypewriter(page, reportDutyPrompt)
    await page
      .getByRole('button', {
        name: '個人データを取り扱う委託元である自社にも個人情報保護委員会への報告義務があり、委託先と連携して対応する必要がある',
      })
      .click()

    const correctivePrompt = '再発防止に向けて、今後どのような方針を取るべきですか？'
    await expect(page.getByText(correctivePrompt)).toBeVisible()
    await skipTypewriter(page, correctivePrompt)
    await page
      .getByRole('button', {
        name: '委託契約の内容を見直し、委託先の安全管理措置の実施状況を定期的に確認する体制を整え、再委託の状況も把握できるようにする',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    // result-screen.tsx はシナリオタイトルそのものは表示しないため、clear_explanation の
    // 台詞から本事案であることを確認する(S1〜S3テストのチェックと対)。
    await expect(page.getByText('共有設定', { exact: false }).first()).toBeVisible()

    // 誤答1回・相談0回でクリアしたぶんのXP減算を確認する(FR-11/spec §8.4。単価はS1〜S3と同じ
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
  // 全6件を調査し、正解ルート(誤答・相談なし)でクリアすることを確認する
  // (e2e/s1-playthrough.spec.ts・e2e/s2-playthrough.spec.ts・e2e/s3-playthrough.spec.ts の
  // 一覧経由テストと対)。
  test('マップ選択からSLを選び、調査ポイント一覧経由の探索→解決(3問とも正答)→結果まで進行し、満額のXPが表示される', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'つづきから' }).click()
    await selectSlMap(page)
    await page.getByRole('button', { name: 'タップで進行' }).click()
    await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

    // 一覧側の「調査する」だけで全6箇所を調査する(背景シーンのホットスポットには触れない)。
    let investigateButton = page.getByRole('button', { name: '調査する' }).first()
    while (await investigateButton.count()) {
      await investigateButton.click()
      investigateButton = page.getByRole('button', { name: '調査する' }).first()
    }
    await expect(page.getByRole('button', { name: '調査する' })).toHaveCount(0)
    await expect(page.getByText('6/6 件調査済み')).toBeVisible()

    const enterResolution = page.getByRole('button', { name: '解決へ進む' })
    await expect(enterResolution).toBeEnabled()
    await enterResolution.click()
    await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()

    const causePrompt = '顧客の個人データが漏えいした原因は、どこにあると見る？'
    await skipTypewriter(page, causePrompt)
    await page
      .getByRole('button', {
        name: '委託先のクラウドストレージの共有設定が誤って「限定公開」から「リンクを知っていれば誰でも閲覧可能」に変更されており、外部からアクセスされた',
      })
      .click()

    const reportDutyPrompt = '個人データの漏えいのおそれが確認できました。報告義務は誰に生じると考えますか？'
    await expect(page.getByText(reportDutyPrompt)).toBeVisible()
    await skipTypewriter(page, reportDutyPrompt)
    await page
      .getByRole('button', {
        name: '個人データを取り扱う委託元である自社にも個人情報保護委員会への報告義務があり、委託先と連携して対応する必要がある',
      })
      .click()

    const correctivePrompt = '再発防止に向けて、今後どのような方針を取るべきですか？'
    await expect(page.getByText(correctivePrompt)).toBeVisible()
    await skipTypewriter(page, correctivePrompt)
    await page
      .getByRole('button', {
        name: '委託契約の内容を見直し、委託先の安全管理措置の実施状況を定期的に確認する体制を整え、再委託の状況も把握できるようにする',
      })
      .click()

    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()

    // FR-6/FR-11: 誤答・相談なしでクリアしたので満額のXPが加算・表示される(S1〜S3テストと対)。
    await expect(page.getByText('誤答: 0回 / 相談: 0回')).toBeVisible()
    await expect(page.getByText('獲得XP: +100')).toBeVisible()
    await expect(page.getByText('累計XP: 100')).toBeVisible()
  })
})
