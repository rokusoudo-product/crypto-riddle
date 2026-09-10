/** @vitest-environment jsdom */
// src/ui/screens/explore-screen.test.tsx — 探索④の背景シーンUI(#52/#56・T038)の結線テスト。
//
// Issue #56 完了条件: 「背景・一覧の両方で、キーボードのみで全ポイント調査→解決へ進める結線
// テストが通る」「4状態(通常/ローディング=判定中/空=未調査/エラー)を満たす」。
//
// 実データの scenarios/*.yaml には scenes を追加しない(#57/T040 の範囲・二重実装防止)ため、
// scenes を持つ最小フィクスチャ(explore-scene.fixture.ts、このブランチ内のテスト専用)を使う。
// scenario.scenes が無い場合の一覧のみのフォールバック(既存動作)は
// play-flow.test.tsx / s1-play-flow.test.tsx が既に回帰確認しているため、本ファイルは
// scenes ありのケースを中心に確認する(scenesなしの非表示だけ軽く追加で確認する)。
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import type { Scenario } from '@/core/model'
import { s0SampleFixture } from '@/core/scenario/fixtures/s0-sample.fixture'

import { exploreSceneFixture } from './explore-scene.fixture'
import { ExploreScreen } from './explore-screen'
import { resetGameStoreForTests, useGameStore } from '@/ui/store/game-store'

afterEach(() => cleanup())

/** 探索パート(exploration)まで進めた状態で ExploreScreen だけをレンダーする。 */
function renderExplore(scenario: Scenario, initialEntry = '/explore') {
  resetGameStoreForTests({ scenario })
  useGameStore.getState().dispatch({ type: 'ADVANCE_INTRO' })
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ExploreScreen />
    </MemoryRouter>,
  )
}

describe('探索④ 背景シーン＋ホットスポット(#52/#56・T038)', () => {
  it('scenesが無いシナリオでは背景シーンUIを表示せず、一覧のみになる(既存動作の回帰)', () => {
    renderExplore(s0SampleFixture)
    expect(screen.queryByRole('tablist', { name: '探索シーンの切替' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '調査ポイント一覧' })).toBeInTheDocument()
  })

  it('scenesがあるシナリオでは背景シーンと一覧の両方が併設される', () => {
    renderExplore(exploreSceneFixture)
    // 背景シーン(プレースホルダ、T039待ち)。
    expect(screen.getByRole('img', { name: /執務室の背景（画像は準備中/ })).toBeInTheDocument()
    // 一覧フォールバックも常に併設される。
    expect(screen.getByRole('heading', { name: '調査ポイント一覧' })).toBeInTheDocument()
    expect(screen.getByText('経理担当PCのログ')).toBeInTheDocument()
    expect(screen.getByText('田中さんへの聞き取り')).toBeInTheDocument()
  })

  it('ホットスポットは48px以上の実<button>で、種別・可視ラベルを持つ', () => {
    renderExplore(exploreSceneFixture)
    const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
    expect(pcHotspot.tagName).toBe('BUTTON')
    expect(pcHotspot).toHaveClass('min-h-12', 'min-w-12')
    // 色だけに頼らず、可視のラベルテキストも持つ(DESIGN.md「探索シーン」節・WCAG 1.4.1)。
    expect(within(pcHotspot).getByText('経理担当のPC')).toBeInTheDocument()
    const personHotspot = screen.getByRole('button', { name: /田中さん（人物）/ })
    expect(personHotspot).toHaveClass('min-h-12', 'min-w-12')
  })

  it(
    '背景シーン経由で、キーボードのみで全ポイント調査→解決へ進められる' +
      '(danger操作は教育的フィードバックのみでペナルティ無し・操作継続可)',
    async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // PCホットスポットへフォーカスして開く(actionsが3件=アクションシート)。
      // 開いたシート内の最初のactionへ自動的にフォーカスが移る(ダイアログ的なフォーカス管理)。
      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      expect(await screen.findByRole('group', { name: '経理担当のPCの操作' })).toBeInTheDocument()
      expect(document.activeElement).toHaveTextContent('ログを取る')

      // 「電源を落とす」(danger)へ1つ進んで選ぶ: 教育的フィードバックが出るが、
      // 探索ではペナルティにならず、シートも閉じない(詰み防止・spec §8.4)。
      const progressBeforeDanger = useGameStore.getState().progress
      await user.keyboard('{Tab}')
      expect(document.activeElement).toHaveTextContent('電源を落とす')
      await user.keyboard('{Enter}')
      expect(await screen.findByText(/揮発性メモリの証拠が消えます/)).toBeInTheDocument()
      // シートは開いたままで、他のactionを続けて選べる(電源を落とした後も操作継続可)。
      expect(screen.getByRole('group', { name: '経理担当のPCの操作' })).toBeInTheDocument()
      // dangerはdispatchを一切呼ばない(coreのprogressが参照レベルで完全に不変=XP等への影響皆無)。
      expect(useGameStore.getState().progress).toBe(progressBeforeDanger)

      // Shift+Tabで「ログを取る」(collect)へ戻り、カードを獲得する。
      // シートは閉じ、フォーカスはホットスポットへ戻る。
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toHaveTextContent('ログを取る')
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.queryByRole('group', { name: '経理担当のPCの操作' })).not.toBeInTheDocument()
      })
      expect(document.activeElement).toBe(pcHotspot)
      expect(pcHotspot).toHaveAccessibleName(/・調査済み/)

      // 人物ホットスポット(person・単一action)。実行すると証言が会話フレームで表示される。
      const personHotspot = screen.getByRole('button', { name: /田中さん（人物）/ })
      personHotspot.focus()
      await user.keyboard('{Enter}')
      expect(await screen.findAllByText('橘')).not.toHaveLength(0)
      const tanakaTestimony = '「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'
      expect(screen.getByText(tanakaTestimony)).toBeInTheDocument()

      // 「閉じる」は会話フレームのchildrenのため、タイプライターの全文表示(またはスキップ)後に
      // しか出ない(#64/T042)。証言文そのものがスキップボタンのaccessible nameになるので、
      // それをフォーカスしてEnterでキーボードのみスキップする。スキップすると children 内の
      // 最初のフォーカス可能要素(=「閉じる」)へ自動的にフォーカスが移る(ConversationFrame側の仕様)。
      screen.getByRole('button', { name: tanakaTestimony }).focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toHaveTextContent('閉じる')
      await user.keyboard('{Enter}')
      expect(
        screen.queryByText('「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'),
      ).not.toBeInTheDocument()
      expect(document.activeElement).toBe(personHotspot)

      // 一覧側でも両方調査済みになっている(scenes・一覧は同じ状態を共有する)。
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()

      // 「解決へ進む」が活性化し、キーボードで押せる(結線テストの完了条件)。
      const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
      await waitFor(() => expect(enterResolution).toBeEnabled())
    },
  )

  it('シーンタブは矢印キーで切り替えられ、切替後は別シーンのホットスポットが操作できる', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)

    const officeTab = screen.getByRole('tab', { name: '執務室' })
    const serverTab = screen.getByRole('tab', { name: 'サーバ室' })
    expect(officeTab).toHaveAttribute('aria-selected', 'true')
    expect(serverTab).toHaveAttribute('aria-selected', 'false')

    officeTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(serverTab)
    expect(serverTab).toHaveAttribute('aria-selected', 'true')

    // サーバ室シーンのホットスポットが表示され、執務室のホットスポットは表示されない。
    expect(screen.getByRole('button', { name: /サーバ機器（機器）/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /経理担当のPC（PC）/ })).not.toBeInTheDocument()
  })

  it('一覧フォールバックだけでも、背景に頼らずキーボードのみで全ポイント調査→解決へ進められる', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)

    const list = screen.getByRole('list', { name: '調査ポイント一覧' })
    const investigateButtons = within(list).getAllByRole('button', { name: '調査する' })
    expect(investigateButtons).toHaveLength(2)

    for (const button of investigateButtons) {
      button.focus()
      await user.keyboard('{Enter}')
    }

    expect(within(list).queryByRole('button', { name: '調査する' })).not.toBeInTheDocument()
    const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
    expect(enterResolution).toBeEnabled()
  })

  it('4状態(ローディング/空/エラー)をURLクエリで切り替えられる', () => {
    renderExplore(exploreSceneFixture, '/explore?state=loading')
    expect(screen.getByRole('status')).toHaveTextContent('判定しています')
    cleanup()

    renderExplore(exploreSceneFixture, '/explore?state=empty')
    expect(
      screen.getByText('まだ調査していません。調査ポイントをタップしよう。'),
    ).toBeInTheDocument()
    cleanup()

    renderExplore(exploreSceneFixture, '/explore?state=error')
    expect(screen.getByRole('alert')).toHaveTextContent('エラーが発生しました。')
  })
})
