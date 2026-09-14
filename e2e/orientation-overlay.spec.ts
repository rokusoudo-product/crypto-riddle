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
