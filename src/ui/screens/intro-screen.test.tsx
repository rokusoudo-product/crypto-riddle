/** @vitest-environment jsdom */
// src/ui/screens/intro-screen.test.tsx — 導入③の会話フレーム化(#100/#102・#50吸収)の結線テスト。
//
// Issue #102 完了条件: 「character_intros を1行ずつタップ送りできる」「intro.background 省略時は
// ナレーションブロックを描画せず会話へ直行する」「SKIP はタイプライター進行状況に関わらず
// いつでも即座に探索へ進める」「対策室レイアウト(霧島/橘/小鳥遊の3枠)が描画される」。
import { cleanup, render, screen } from '@testing-library/react'
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

/** 会話ウィンドウ(タイプライターのスキップボタン)をクリックして即全文表示にする。 */
async function skipTypewriter(user: ReturnType<typeof userEvent.setup>, line: string) {
  await user.click(screen.getByRole('button', { name: line }))
}

describe('導入③ 会話フレーム化(#100/#102・#50吸収)', () => {
  it('character_intros を1行ずつタップ送りし、最終行のあと探索へ進む(多ターン対応)', async () => {
    const user = userEvent.setup()
    renderIntro(introMultiTurnFixture)

    // 1行目: 霧島。
    expect(useGameStore.getState().progress.part).toBe('intro')
    await skipTypewriter(user, '霧島の1行目のセリフです。')
    expect(screen.getByRole('button', { name: 'タップで進行' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'タップで進行' }))

    // まだ探索へは進まない(2行目=橘)。
    expect(useGameStore.getState().progress.part).toBe('intro')
    await skipTypewriter(user, '橘の2行目のセリフです。')
    await user.click(screen.getByRole('button', { name: 'タップで進行' }))

    // まだ探索へは進まない(3行目=小鳥遊)。
    expect(useGameStore.getState().progress.part).toBe('intro')
    await skipTypewriter(user, '小鳥遊の3行目のセリフです。')

    // 最終行のタップで進行 → 探索へ進む(ステートマシンがintro→explorationへ遷移)。
    await user.click(screen.getByRole('button', { name: 'タップで進行' }))
    expect(useGameStore.getState().progress.part).toBe('exploration')
  })

  it('対策室レイアウトは霧島/橘/小鳥遊の3枠を表示し、発話者以外はグレーアウトする', async () => {
    const user = userEvent.setup()
    renderIntro(introMultiTurnFixture)

    // 1行目(霧島が話者)の時点で、3名とも立ち絵が描画されている(小鳥遊は待機中でも常に表示)。
    expect(screen.getByAltText('霧島（発話中）')).toBeInTheDocument()
    expect(screen.getByAltText('橘（待機中）')).toBeInTheDocument()
    expect(screen.getByAltText('小鳥遊（待機中）')).toBeInTheDocument()

    // 3行目まで進めると小鳥遊が発話中になる(色だけでなく名札でも発話者を示す、WCAG 1.4.1)。
    await skipTypewriter(user, '霧島の1行目のセリフです。')
    await user.click(screen.getByRole('button', { name: 'タップで進行' }))
    await skipTypewriter(user, '橘の2行目のセリフです。')
    await user.click(screen.getByRole('button', { name: 'タップで進行' }))

    expect(screen.getByAltText('霧島（待機中）')).toBeInTheDocument()
    expect(screen.getByAltText('橘（待機中）')).toBeInTheDocument()
    expect(screen.getByAltText('小鳥遊（発話中）')).toBeInTheDocument()
  })

  it('SKIPはタイプライターの進行状況に関わらずいつでも押せ、即座に探索へ進む', async () => {
    const user = userEvent.setup()
    renderIntro(introMultiTurnFixture)

    // 1行目のタイプライターが進行中(スキップ前)でも、SKIPボタンは既に押せる
    // (会話ウィンドウの外に常時表示するため、children=「タップで進行」と違いisComplete待ちしない)。
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
