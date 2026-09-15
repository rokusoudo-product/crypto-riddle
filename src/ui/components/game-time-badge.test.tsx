/** @vitest-environment jsdom */
// src/ui/components/game-time-badge.test.tsx — ゲーム内時刻バッジ(#136/#137)の単体テスト。
//
// Issue #137 の受け入れ基準「時刻を省略した場面で何も表示されないことを確認するテストがある」を
// 満たす最小単位のテスト。画面結線側の確認(導入・探索・解決での表示/更新)は
// src/ui/screens/game-time-badge-flow.test.tsx を参照。
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { GameTimeBadge } from './game-time-badge'

afterEach(() => cleanup())

describe('GameTimeBadge(#136/#137)', () => {
  it('gameTimeが省略されている場合は何も描画しない', () => {
    const { container } = render(<GameTimeBadge />)
    expect(container).toBeEmptyDOMElement()
  })

  it('gameTimeがある場合、意味の分かるラベル(「ゲーム内時刻 HH:MM」)を可視テキストとして表示する', () => {
    render(<GameTimeBadge gameTime="09:42" />)
    // 可視テキスト自体が支援技術向けのアクセシブルネームを兼ねる(追加のaria-labelは付けない、
    // DESIGN.md「ゲーム内時刻」節「支援技術向けに、意味の分かるラベルを付ける」)。
    expect(screen.getByText('ゲーム内時刻 09:42')).toBeInTheDocument()
  })
})
