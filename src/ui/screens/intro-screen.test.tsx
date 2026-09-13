/** @vitest-environment jsdom */
// src/ui/screens/intro-screen.test.tsx — 導入③の会話フレーム化(#100/#102・#50吸収)、および
// 左右2枠の入れ替わり方式・画面クリックでの台詞送りへの刷新(#108/#110)の結線テスト。
//
// Issue #102 完了条件: 「character_intros を1行ずつ送れる」「intro.background 省略時は
// ナレーションブロックを描画せず会話へ直行する」「SKIP はタイプライター進行状況に関わらず
// いつでも即座に探索へ進める」。
// Issue #110 完了条件: 「旧・対策室レイアウト(3枠)を廃止し左右2枠の入れ替わり方式にする」
// 「導入の『タップで進行』ボタンを廃止し、画面のどこをクリック/タップしても次の行に進む」
// 「Enter/Spaceでも送れる」「SKIPはそのまま維持し、台詞送りのクリックと二重処理されない」。
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import type { Scenario } from '@/core/model'
import { resetGameStoreForTests, useGameStore } from '@/ui/store/game-store'

import { introMultiTurnFixture, introNoBackgroundFixture } from './intro-screen.fixture'
import { IntroScreen } from './intro-screen'

afterEach(() => cleanup())

/** 導入パート(intro)のまま IntroScreen だけをレンダーする(既定でprogress.partはintro)。 */
function renderIntro(scenario: Scenario) {
  resetGameStoreForTests({ scenario })
  return render(
    <MemoryRouter initialEntries={['/intro']}>
      <IntroScreen />
    </MemoryRouter>,
  )
}

/**
 * 画面クリックで1行送る(#108/#110): 会話ウィンドウ全体が1つの操作領域になり(dismissAnywhere)、
 * アクセシブルネームは会話文(line)のまま変わらない。1回目のクリックでタイプライターを
 * 全文表示(スキップ)、2回目のクリックで次の行(または最終行なら探索)へ進む(2段階)。
 */
async function advanceIntroLine(user: ReturnType<typeof userEvent.setup>, line: string) {
  const window_ = screen.getByRole('button', { name: line })
  await user.click(window_) // 1回目: スキップ(全文表示)。
  await user.click(screen.getByRole('button', { name: line })) // 2回目: 次の行/探索へ進む。
}

describe('導入③ 会話フレーム化(#100/#102・#50吸収、#108/#110で左右2枠・画面クリック送りへ刷新)', () => {
  it('character_intros を1行ずつ画面クリックで送り、最終行のあと探索へ進む(多ターン対応)', async () => {
    const user = userEvent.setup()
    renderIntro(introMultiTurnFixture)

    // 1行目: 霧島。旧「タップで進行」ボタンは廃止されているため存在しない(#108/#110)。
    expect(useGameStore.getState().progress.part).toBe('intro')
    expect(screen.queryByRole('button', { name: 'タップで進行' })).not.toBeInTheDocument()
    await advanceIntroLine(user, '霧島の1行目のセリフです。')

    // まだ探索へは進まない(2行目=橘)。
    expect(useGameStore.getState().progress.part).toBe('intro')
    await advanceIntroLine(user, '橘の2行目のセリフです。')

    // まだ探索へは進まない(3行目=小鳥遊)。
    expect(useGameStore.getState().progress.part).toBe('intro')

    // 最終行のクリックで探索へ進む(ステートマシンがintro→explorationへ遷移)。
    await advanceIntroLine(user, '小鳥遊の3行目のセリフです。')
    expect(useGameStore.getState().progress.part).toBe('exploration')
  })

  it('Enter/Spaceキーでも送れる(#108/#110)', async () => {
    renderIntro(introMultiTurnFixture)

    const line1Window = screen.getByRole('button', { name: '霧島の1行目のセリフです。' })
    line1Window.focus()
    // 1回目: Enterでスキップ(全文表示)。
    fireEvent.keyDown(line1Window, { key: 'Enter' })
    expect(screen.getByText('霧島の1行目のセリフです。').tagName).toBe('P')

    // 2回目: Spaceで次の行(2行目=橘)へ進む。
    fireEvent.keyDown(line1Window, { key: ' ' })
    expect(screen.getByText('橘の2行目のセリフです。')).toBeInTheDocument()
  })

  it('会話ウィンドウ以外(背景・立ち絵を含む外枠)のクリックでも同じ2段階で進む(#108/#110)', async () => {
    const user = userEvent.setup()
    renderIntro(introMultiTurnFixture)

    // 会話フレームの外枠(dismissAnywhereの操作領域全体、#108/#110で背景の箱の直後に配置)。
    const overlayRoot = document.querySelector(
      '[data-testid="conversation-frame-overlay"]',
    ) as HTMLElement
    await user.click(overlayRoot)
    expect(screen.getByText('霧島の1行目のセリフです。').tagName).toBe('P')
    await user.click(overlayRoot)
    expect(screen.getByText('橘の2行目のセリフです。')).toBeInTheDocument()
  })

  it('左右2枠の入れ替わり方式で描画し、旧・対策室レイアウト(3枠固定)は使わない(#108/#110)', async () => {
    const user = userEvent.setup()
    renderIntro(introMultiTurnFixture)

    // 1行目(霧島): 最初の話者は左に入る(右は空)。
    expect(screen.getByAltText('霧島（発話中）')).toBeInTheDocument()
    expect(screen.queryByAltText('橘（待機中）')).not.toBeInTheDocument()
    expect(screen.queryByAltText('小鳥遊（待機中）')).not.toBeInTheDocument()

    // 2行目(橘、画面にいない人): 直前の話者(霧島=左)ではない右へ入る。
    await advanceIntroLine(user, '霧島の1行目のセリフです。')
    expect(screen.getByAltText('霧島（待機中）')).toBeInTheDocument()
    expect(screen.getByAltText('橘（発話中）')).toBeInTheDocument()

    // 3行目(小鳥遊、画面にいない人): 直前の話者(橘=右)ではない左(霧島の枠)と入れ替わる。
    // 旧・対策室レイアウト(霧島・橘・小鳥遊の3枠が常に同時に出る)ではないため、
    // 入れ替わった霧島はもう描画されない。
    await advanceIntroLine(user, '橘の2行目のセリフです。')
    expect(screen.getByAltText('小鳥遊（発話中）')).toBeInTheDocument()
    expect(screen.getByAltText('橘（待機中）')).toBeInTheDocument()
    expect(screen.queryByAltText(/霧島/)).not.toBeInTheDocument()
  })

  it('SKIPはタイプライターの進行状況に関わらずいつでも押せ、即座に探索へ進む', async () => {
    const user = userEvent.setup()
    renderIntro(introMultiTurnFixture)

    // 1行目のタイプライターが進行中(スキップ前)でも、SKIPボタンは既に押せる
    // (会話ウィンドウの外に常時表示するため)。
    expect(useGameStore.getState().progress.part).toBe('intro')
    await user.click(screen.getByRole('button', { name: 'SKIP' }))
    expect(useGameStore.getState().progress.part).toBe('exploration')
  })

  it('intro.background が省略されている場合はナレーションブロックを描画せず会話へ直行する', () => {
    renderIntro(introNoBackgroundFixture)

    // victim_company(被害企業名・説明)は省略時も必須のため表示される。
    expect(screen.getByText('テスト株式会社')).toBeInTheDocument()
    // ナレーション本文(intro.background)は無いため描画されない。
    expect(screen.queryByText(/テスト用の導入ナレーション文/)).not.toBeInTheDocument()
    // 会話フレームへ直行し、1行目(霧島)がすぐ表示されている。
    expect(screen.getByAltText('霧島（発話中）')).toBeInTheDocument()
  })

  it('intro.background がある場合は従来どおりナレーションを表示する(S2/S3/SLの後方互換)', () => {
    renderIntro(introMultiTurnFixture)
    expect(screen.getByText('テスト用の導入ナレーション文。')).toBeInTheDocument()
  })
})
