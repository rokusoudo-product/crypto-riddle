/** @vitest-environment jsdom */
// src/ui/screens/resolve-screen.test.tsx — 解決⑤のヒントダイアログ(代表決定2026-09-15)の
// 画面結線テスト。
//
// 代表決定(2026-09-15)の受け入れ基準のうち、単体テストで直接確認すべき項目
// (誤答・相談・正解のUIフロー全体はs1-play-flow.test.tsxが担当するため、本ファイルは
// ヒントダイアログの開閉・フォーカス・背景の操作不可化に絞って確認する):
// - 誤答するとヒントダイアログが自動で開く
// - Escapeと閉じるボタンのどちらでも閉じ、閉じると選択パネルの最初の選択肢へフォーカスが戻る
// - 「解説を見る」ボタンで同じ内容を再度開ける
// - 正解時(次の問いがある場合)、次の問いが操作可能になる前にヒントダイアログが表示される
// - ヒントダイアログ表示中は選択肢を押せない(disabled、resolve-choice-panel.tsx参照)
// - 会話ウィンドウはline(台詞本文)が空のときは描画しない(代表決定2026-09-15・決定2)
//
// game-time-badge-flow.test.tsxと同じ「core の scenarioReducer に直接
// INVESTIGATE/ENTER_RESOLUTION を積んでresolutionへ進めてからResolveScreen単体をレンダーする」
// 方針を踏襲する(canEnterResolutionの実装詳細ではなく、ヒントダイアログ側の結線だけを
// 確認したいため)。S1は暗号ステージを持たないため、ENTER_RESOLUTIONで直接q-entry-pointへ進む。
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { s1TargetedEmailIntrusionFixture } from '@/core/scenario/fixtures/s1-targeted-email-intrusion.fixture'
import { resetGameStoreForTests, useGameStore } from '@/ui/store/game-store'

import { ResolveScreen } from './resolve-screen'

afterEach(() => cleanup())

function renderResolveScreen() {
  return render(
    <MemoryRouter initialEntries={['/resolve']}>
      <ResolveScreen />
    </MemoryRouter>,
  )
}

/** S1の解決パート(q-entry-point)まで進める(#134/#149と同じ、上記コメント参照)。 */
function enterResolution(): void {
  resetGameStoreForTests({ scenario: s1TargetedEmailIntrusionFixture })
  const { dispatch } = useGameStore.getState()
  dispatch({ type: 'ADVANCE_INTRO' })
  for (const point of s1TargetedEmailIntrusionFixture.investigation_points) {
    dispatch({ type: 'INVESTIGATE', pointId: point.id })
  }
  dispatch({ type: 'ENTER_RESOLUTION' })
}

describe('解決⑤のヒントダイアログ(代表決定2026-09-15)', () => {
  it('問い表示中(誤答・相談の前)は会話ウィンドウを描画しない(決定2・空のときは隠す)', async () => {
    enterResolution()
    renderResolveScreen()

    expect(await screen.findByText('この侵入、どこから入られたと見る？')).toBeInTheDocument()
    expect(screen.queryByTestId('conversation-window')).not.toBeInTheDocument()
  })

  it('誤答するとヒントダイアログが自動で開き、段階解説を表示する', async () => {
    enterResolution()
    const user = userEvent.setup()
    renderResolveScreen()

    await user.click(screen.getByRole('button', { name: '公開サーバーの脆弱性を突かれた侵入' }))

    const dialog = await screen.findByRole('dialog', { name: '解説' })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      screen.getByText(/「怪しく見える」ことと「今回の侵入を裏付ける証拠」は違う/),
    ).toBeInTheDocument()
  })

  it('ヒントダイアログ表示中は選択肢・相談ボタンを押せない(disabled)', async () => {
    enterResolution()
    const user = userEvent.setup()
    renderResolveScreen()

    await user.click(screen.getByRole('button', { name: '公開サーバーの脆弱性を突かれた侵入' }))
    await screen.findByRole('dialog', { name: '解説' })

    // 背景(選択パネルを含む)はRadix Dialogの既定動作(hideOthers)・本PRのinertラッパーの
    // 両方でaria-hiddenになるため、getByRoleでこれらを引くにはhidden: trueを指定する
    // (アクセシビリティツリーからは正しく隠れている、というのがこのテストの主眼)。
    expect(
      screen.getByRole('button', {
        name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
        hidden: true,
      }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: /相談する/, hidden: true })).toBeDisabled()
  })

  it('Escapeで閉じ、選択パネルの最初の選択肢へフォーカスが戻る', async () => {
    enterResolution()
    const user = userEvent.setup()
    renderResolveScreen()

    await user.click(screen.getByRole('button', { name: '公開サーバーの脆弱性を突かれた侵入' }))
    await screen.findByRole('dialog', { name: '解説' })

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '解説' })).not.toBeInTheDocument()
    expect(document.activeElement).toHaveTextContent('取引先を装った請求書メールの添付ファイル')
  })

  it('閉じるボタンでも閉じ、選択パネルの最初の選択肢へフォーカスが戻る', async () => {
    enterResolution()
    const user = userEvent.setup()
    renderResolveScreen()

    await user.click(screen.getByRole('button', { name: '公開サーバーの脆弱性を突かれた侵入' }))
    await screen.findByRole('dialog', { name: '解説' })

    await user.click(screen.getByRole('button', { name: '閉じる' }))

    expect(screen.queryByRole('dialog', { name: '解説' })).not.toBeInTheDocument()
    expect(document.activeElement).toHaveTextContent('取引先を装った請求書メールの添付ファイル')
  })

  it('「解説を見る」ボタンで、閉じたヒントダイアログを同じ内容のまま再度開ける', async () => {
    enterResolution()
    const user = userEvent.setup()
    renderResolveScreen()

    await user.click(screen.getByRole('button', { name: '公開サーバーの脆弱性を突かれた侵入' }))
    await screen.findByRole('dialog', { name: '解説' })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '解説' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '解説を見る' }))

    const dialog = await screen.findByRole('dialog', { name: '解説' })
    expect(
      screen.getByText(/「怪しく見える」ことと「今回の侵入を裏付ける証拠」は違う/),
    ).toBeInTheDocument()
    expect(dialog).toBeInTheDocument()
  })

  it(
    '正解(次の問いがある場合)は、次の問いが操作可能になる前にヒントダイアログで一言を表示する' +
      '(代表決定2026-09-15)',
    async () => {
      enterResolution()
      const user = userEvent.setup()
      renderResolveScreen()

      await user.click(
        screen.getByRole('button', {
          name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
        }),
      )

      // 次の問い(q-initial-response)は既に表示されているが、
      expect(await screen.findByText('感染が疑われる端末への初動対応は？')).toBeInTheDocument()
      // ヒントダイアログが直前の正解への一言を表示していて、
      const dialog = await screen.findByRole('dialog', { name: '解説' })
      expect(
        screen.getByText(
          /その通りだ、新人。フィッシングメールの実在、マクロ実行の記録、C2通信の痕跡/,
        ),
      ).toBeInTheDocument()
      // 閉じるまでは次の問いの選択肢を操作できない(背景はaria-hiddenになるため
      // hidden: trueで引く、上記コメント参照)。
      expect(
        screen.getByRole('button', {
          name: 'ネットワークから論理的に隔離し(LANケーブル抜線・無線LAN無効化)、電源は落とさず揮発性メモリとディスクの証拠を保全する',
          hidden: true,
        }),
      ).toBeDisabled()

      await user.keyboard('{Escape}')
      expect(dialog).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', {
          name: 'ネットワークから論理的に隔離し(LANケーブル抜線・無線LAN無効化)、電源は落とさず揮発性メモリとディスクの証拠を保全する',
        }),
      ).toBeEnabled()
    },
  )
})
