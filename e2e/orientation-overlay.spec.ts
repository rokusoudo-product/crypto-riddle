// e2e/orientation-overlay.spec.ts — #119/#124: 背景の箱(横16:9/縦9:16)への全面表示・
// 立ち絵/会話ウィンドウの重ね直しに伴う「縦スクロールを出さない」要件のE2E確認。
//
// DESIGN.md「探索シーン」節「背景の箱」「重ねる要素は背景の箱に対する相対位置」:
// 背景を持つ画面(導入③・探索④・解決⑤)は、横長・縦長どちらの画面サイズでも縦スクロールを
// 出さずに進行できること。横長(例1280×800)・縦長(例390×844)の両方で、導入→探索→解決の
// 主要な表示状態(初回表示・会話オーバーレイ表示中)を確認する。
import { expect, test } from '@playwright/test'

async function skipTypewriter(page: import('@playwright/test').Page, line: string) {
  await page.getByRole('button', { name: line, exact: true }).click()
}

async function selectS1Map(page: import('@playwright/test').Page) {
  await page
    .getByRole('listitem')
    .filter({ hasText: '標的型メールからの侵入' })
    .getByRole('button', { name: 'マップを選ぶ' })
    .click()
}

/** ページ自体が縦スクロール可能になっていないかを確認する(#119「縦スクロールを出さない」)。
 * ウィンドウ内部(会話ウィンドウのoverflow-y-auto)のスクロールは対象外(ページの
 * scrollHeightには影響しない)。
 * `page.evaluate`に文字列式を渡す(関数ではなく)のは、このファイル(e2e/**)がtsconfig.node.json
 * (`lib: ["ES2023"]`、DOM無し)でコンパイルされるため、コールバック内で`document`/`window`を
 * 直接参照するとブラウザ側のコードにもかかわらず「型が無い」でビルドエラーになるのを避けるため
 * (文字列式はPlaywright側でブラウザのコンテキストにそのまま渡され、Node側のTS型検査を通らない)。 */
async function expectNoPageScroll(page: import('@playwright/test').Page) {
  const { scrollHeight, innerHeight } = (await page.evaluate(
    '({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight })',
  )) as { scrollHeight: number; innerHeight: number }
  expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 1)
}

for (const [label, viewport] of Object.entries({
  横長: { width: 1280, height: 800 },
  縦長: { width: 390, height: 844 },
})) {
  test.describe(`背景の箱の全面表示・縦スクロールなし(${label} ${viewport.width}x${viewport.height}、#119/#124)`, () => {
    test.use({ viewport })

    test(`導入→探索→解決の主要な表示状態で縦スクロールが出ない(${label})`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'つづきから' }).click()
      await selectS1Map(page)
      await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()

      // 導入: 1行目(小鳥遊)が表示された時点。
      const introLine1 =
        'あらあら〜、新人さん、ちょうど良いところに。今、浜通(はまどおり)商事さんから緊急のお電話が入りまして……。はい、お茶どうぞ〜。'
      await expect(page.getByText(introLine1, { exact: false })).toBeVisible()
      await expectNoPageScroll(page)

      await page.getByRole('button', { name: 'SKIP' }).click()
      await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

      // 探索状態(初期表示、ホットスポットのみ)。
      await expectNoPageScroll(page)

      // 会話状態(調査結果の会話オーバーレイ)。
      await page.getByRole('button', { name: '経理部 中野の端末（PC）' }).click()
      await page.getByRole('button', { name: 'EDRアラートを確認する' }).click()
      const edrLine = 'このプロセス名――どう見る？'
      await expect(page.getByText(edrLine, { exact: false })).toBeVisible()
      await expectNoPageScroll(page)
      await skipTypewriter(page, edrLine)
      await expectNoPageScroll(page)
      // 次のターンへ進めても崩れない。
      await page.getByRole('button', { name: edrLine, exact: true }).click()
      await expectNoPageScroll(page)

      // 探索完了→解決画面へ(一覧から全件調査して活性化)。
      await page.getByRole('button', { name: '調査ポイント一覧' }).click()
      let investigateButton = page.getByRole('button', { name: '調査する' }).first()
      while (await investigateButton.count()) {
        await investigateButton.click()
        investigateButton = page.getByRole('button', { name: '調査する' }).first()
      }
      const enterResolution = page.getByRole('button', { name: '解決へ進む' })
      await expect(enterResolution).toBeEnabled()
      await enterResolution.click()
      await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()

      // 解決: 問1の表示(直前の探索シーンの背景を引き継いだ箱の上に重ねて表示される)。
      const questionLine = 'この侵入、どこから入られたと見る？'
      await expect(page.getByText(questionLine, { exact: false })).toBeVisible()
      await expectNoPageScroll(page)
    })
  })
}

// #124(秘書レビュー・代表決定2026-09-14)の見た目の完全性を確認するE2E:
// A「背景の箱を画面いっぱいに」・B「解決の会話ウィンドウが窮屈」の回帰確認。
// - 導入の台詞全文・解決の問いと全選択肢・相談ボタンがビューポート内に表示されている
//   (`toBeInViewport()`。スクロールしないと見えない位置に押し出されていないこと)。
// - 会話ウィンドウ内にスクロールが発生していない(`scrollHeight <= clientHeight`、
//   conversation-frame.tsxの`data-testid="conversation-window"`)。
// - 立ち絵の上端が箱の上端より下(切れていない、getBoundingClientRectは祖先のoverflow-hidden
//   による視覚的なクリップの影響を受けないため、切れていれば上端がボックスの上端より
//   上=数値が小さくなる)。
// - 背景の箱の高さがビューポート高さの90%以上(横長)/幅がビューポート幅の90%以上(縦長)
//   であること(background-box.tsxの`data-testid="background-box"`)。
async function selectAllInvestigationPoints(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '調査ポイント一覧' }).click()
  let investigateButton = page.getByRole('button', { name: '調査する' }).first()
  while (await investigateButton.count()) {
    await investigateButton.click()
    investigateButton = page.getByRole('button', { name: '調査する' }).first()
  }
}

async function expectNoWindowScroll(page: import('@playwright/test').Page) {
  const { scrollHeight, clientHeight } = await page
    .getByTestId('conversation-window')
    .evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 1)
}

async function expectPortraitHeadNotCut(page: import('@playwright/test').Page) {
  const boxRect = await page.getByTestId('background-box').first().boundingBox()
  const portraitRect = await page.locator('img[alt*="（発話中）"]').first().boundingBox()
  if (!boxRect || !portraitRect) throw new Error('background-box or 発話中 portrait not found')
  // -1は subpixel の丸め誤差の許容(advisorのちょうど境界値を避ける指摘と同じ理由)。
  expect(portraitRect.y).toBeGreaterThanOrEqual(boxRect.y - 1)
}

for (const [label, viewport] of Object.entries({
  横長: { width: 1280, height: 800 },
  縦長: { width: 390, height: 844 },
})) {
  test.describe(`背景の箱・立ち絵・会話ウィンドウの見た目の完全性(${label} ${viewport.width}x${viewport.height}、#124)`, () => {
    test.use({ viewport })

    test(`導入の台詞全文・解決の問いと全選択肢・相談ボタンがビューポート内に表示され、会話ウィンドウはスクロールせず、立ち絵の頭が切れない(${label})`, async ({
      page,
    }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'つづきから' }).click()
      await selectS1Map(page)
      await expect(page.getByRole('heading', { name: '導入' })).toBeVisible()

      // 導入: 1行目(小鳥遊)の台詞全文(=会話ウィンドウのaccessible name)がビューポート内。
      const introLine1 =
        'あらあら〜、新人さん、ちょうど良いところに。今、浜通(はまどおり)商事さんから緊急のお電話が入りまして……。はい、お茶どうぞ〜。'
      await expect(page.getByRole('button', { name: introLine1, exact: true })).toBeInViewport()

      // 背景の箱(#124「縦長の画面は常に9:16」): 画面いっぱいに収まる最大の矩形になっている。
      const introBoxRect = await page.getByTestId('background-box').first().boundingBox()
      if (!introBoxRect) throw new Error('background-box not found (intro)')
      if (viewport.width >= viewport.height) {
        expect(introBoxRect.height / viewport.height).toBeGreaterThan(0.89)
      } else {
        expect(introBoxRect.width / viewport.width).toBeGreaterThan(0.89)
      }

      await skipTypewriter(page, introLine1)
      await page.getByRole('button', { name: 'SKIP' }).click()
      await expect(page.getByRole('heading', { name: '探索' })).toBeVisible()

      // 探索の会話(中野=NPC発話→橘=支援役ターン、tmp/shot.mjsと同じ経路): 支援役ターンでは
      // 立ち絵が「発話中」になるため、そこで頭が箱の上端で切れていないことを確認する
      // (NPCターンは霧島・橘とも「待機中」のまま=発話中の立ち絵が存在しないため対象外)。
      await page.getByRole('button', { name: '中野（人物）', exact: true }).click()
      const nakanoLine1 =
        'すみません……月末で請求処理が立て込んでて。取引先からの「請求書送付のご連絡」ってメールで、疑いもせず添付を開いてしまって……。「マクロを有効にしますか」って出たのも、いつも通りだと思って押しちゃったんです。'
      await expect(page.getByText(nakanoLine1, { exact: false })).toBeVisible()
      await skipTypewriter(page, nakanoLine1)
      await page.getByRole('button', { name: nakanoLine1, exact: true }).click()
      const nakanoLine2 =
        '……ご本人も認めているわ。件名の巧妙さと、月末の油断が重なった。よくある入口ね。'
      await expect(page.getByText(nakanoLine2, { exact: false })).toBeVisible()
      await skipTypewriter(page, nakanoLine2)
      await expectPortraitHeadNotCut(page)
      await expectNoWindowScroll(page)
      // 会話ウィンドウを閉じて探索状態へ戻す(次の操作のため)。
      await page.getByRole('button', { name: nakanoLine2, exact: true }).click()

      // 探索完了→解決画面へ。
      await selectAllInvestigationPoints(page)
      const enterResolution = page.getByRole('button', { name: '解決へ進む' })
      await expect(enterResolution).toBeEnabled()
      await enterResolution.click()
      await expect(page.getByRole('heading', { name: '解決' })).toBeVisible()

      // 解決: 問1の問い文・全選択肢・相談ボタンがビューポート内(スクロールしないと見えない
      // 位置に押し出されていない)。会話ウィンドウ自体もスクロールしていない
      // (#124「解決の会話ウィンドウが窮屈」の回帰確認)。
      const questionLine = 'この侵入、どこから入られたと見る？'
      await expect(page.getByText(questionLine, { exact: false })).toBeInViewport()
      const choices = [
        '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
        '公開サーバーの脆弱性を突かれた侵入',
        'ウイルス対策ソフトの定義ファイル更新エラーに乗じた侵入',
      ]
      for (const choice of choices) {
        await expect(page.getByRole('button', { name: choice })).toBeInViewport()
      }
      await expect(page.getByRole('button', { name: /相談する/ })).toBeInViewport()
      await expectNoWindowScroll(page)

      // 立ち絵(霧島)の頭が箱の上端で切れていない。
      await expectPortraitHeadNotCut(page)
    })
  })
}
