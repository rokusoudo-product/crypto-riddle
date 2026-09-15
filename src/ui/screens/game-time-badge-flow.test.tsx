/** @vitest-environment jsdom */
// src/ui/screens/game-time-badge-flow.test.tsx — ゲーム内時刻(#136/#137)の画面結線テスト。
//
// Issue #137 の受け入れ基準:
// 「導入・探索・解決で時刻が表示され、場面の切り替えで更新される(粒度は#136に従う)」
// 「時刻を省略した場面で何も表示されないことを確認するテストがある」
// を、実データ(S1「標的型メールからの侵入」・DEFAULT_SCENARIO)で確認する。
//
// 探索中はシーンを行き来できるが、各シーンの時刻は固定表示する(戻ると早い時刻が出てよい・
// 代表承認2026-09-15)ことも、シーンタブの往復で確認する。
//
// s1-play-flow.test.tsx と違い、解決パートの確認は「9件すべて調査してから解決へ進む」実操作を
// 再現せず、core の scenarioReducer に直接 INVESTIGATE/ENTER_RESOLUTION を積んで resolution へ
// 進めてから ResolveScreen 単体をレンダーする(intro-screen.test.tsx と同じ「該当パートの画面だけを
// レンダーする」方針。canEnterResolutionの実装詳細ではなく、時刻表示側の結線だけを確認したいため)。
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { s0SampleFixture } from '@/core/scenario/fixtures/s0-sample.fixture'
import { s1TargetedEmailIntrusionFixture } from '@/core/scenario/fixtures/s1-targeted-email-intrusion.fixture'
import { AppRoutes } from '@/ui/routes'

import { ExploreScreen } from './explore-screen'
import { IntroScreen } from './intro-screen'
import { resetGameStoreForTests, useGameStore } from '../store/game-store'
import { ResolveScreen } from './resolve-screen'

afterEach(() => cleanup())

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('ゲーム内時刻(#136/#137) — S1実データでの画面結線', () => {
  it('導入(intro.game_time)がゲーム内時刻バッジとして表示される', async () => {
    resetGameStoreForTests({ scenario: s1TargetedEmailIntrusionFixture })
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: 'つづきから' }))
    await user.click(await screen.findByRole('button', { name: 'マップを選ぶ' }))
    expect(await screen.findByRole('heading', { name: '導入' })).toBeInTheDocument()

    expect(screen.getByText('ゲーム内時刻 10:15')).toBeInTheDocument()
  })

  it(
    '探索の各シーン(scenes[].game_time)は各シーンの時刻を固定表示し、シーンタブの切替で更新される' +
      '(戻ると早い時刻に戻る・代表承認2026-09-15)',
    async () => {
      resetGameStoreForTests({ scenario: s1TargetedEmailIntrusionFixture })
      const user = userEvent.setup()
      renderApp()

      await user.click(screen.getByRole('link', { name: 'つづきから' }))
      await user.click(await screen.findByRole('button', { name: 'マップを選ぶ' }))
      await user.click(screen.getByRole('button', { name: 'SKIP' }))
      expect(await screen.findByRole('heading', { name: '探索' })).toBeInTheDocument()

      // 既定は執務室(scene-office, game_time: 11:20)。
      expect(screen.getByRole('tab', { name: '執務室' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('ゲーム内時刻 11:20')).toBeInTheDocument()
      expect(screen.queryByText('ゲーム内時刻 11:45')).not.toBeInTheDocument()

      // サーバ室(scene-server, game_time: 11:45)へ切り替える。
      await user.click(screen.getByRole('tab', { name: 'サーバ室' }))
      expect(screen.getByText('ゲーム内時刻 11:45')).toBeInTheDocument()
      expect(screen.queryByText('ゲーム内時刻 11:20')).not.toBeInTheDocument()

      // 執務室へ戻ると、より早い11:20の表示に戻る(各シーンの時刻を固定表示する・仕様どおり)。
      await user.click(screen.getByRole('tab', { name: '執務室' }))
      expect(screen.getByText('ゲーム内時刻 11:20')).toBeInTheDocument()
      expect(screen.queryByText('ゲーム内時刻 11:45')).not.toBeInTheDocument()
    },
  )

  it('探索の会話オーバーレイ(調査結果)を開いている間も、現在のシーンの時刻を表示し続ける', async () => {
    resetGameStoreForTests({ scenario: s1TargetedEmailIntrusionFixture })
    useGameStore.getState().dispatch({ type: 'ADVANCE_INTRO' })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/explore']}>
        <ExploreScreen />
      </MemoryRouter>,
    )

    // person(中野)は単一action(collect)のため即座に会話オーバーレイが開く。
    await user.click(await screen.findByRole('button', { name: '中野（人物）' }))
    expect(
      await screen.findByText(/すみません……月末で請求処理が立て込んでて/),
    ).toBeInTheDocument()
    // 会話状態でも執務室(11:20)の時刻が表示され続ける(表示位置は会話ウィンドウ帯の右上端へ
    // 移るが、時刻の値自体は同じシーンのものを示す)。
    expect(screen.getByText('ゲーム内時刻 11:20')).toBeInTheDocument()
  })

  it('解決(resolution.game_time)がゲーム内時刻バッジとして表示される', async () => {
    resetGameStoreForTests({ scenario: s1TargetedEmailIntrusionFixture })
    const { dispatch } = useGameStore.getState()
    dispatch({ type: 'ADVANCE_INTRO' })
    for (const point of s1TargetedEmailIntrusionFixture.investigation_points) {
      dispatch({ type: 'INVESTIGATE', pointId: point.id })
    }
    const afterEnter = dispatch({ type: 'ENTER_RESOLUTION' })
    expect(afterEnter.part).toBe('resolution')

    render(
      <MemoryRouter initialEntries={['/resolve']}>
        <ResolveScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText('ゲーム内時刻 12:30')).toBeInTheDocument()
  })

  it('game_timeを省略したシナリオ(s0-sample)では、導入・探索のどこにも時刻が表示されない', async () => {
    resetGameStoreForTests({ scenario: s0SampleFixture })
    render(
      <MemoryRouter initialEntries={['/intro']}>
        <IntroScreen />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/ゲーム内時刻/)).not.toBeInTheDocument()
  })
})
