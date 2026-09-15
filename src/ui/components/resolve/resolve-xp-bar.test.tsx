/** @vitest-environment jsdom */
// src/ui/components/resolve/resolve-xp-bar.test.tsx — 解決⑤のXPバー(#135)の単体テスト。
//
// 受け入れ基準「解決中にXPバーと数値が表示され、誤答・相談のたびに更新される」「数値をテキストで
// も出し、支援技術にも伝える」を満たすことを確認する最小単位のテスト。computeClearXpReward()
// との一致そのものはsave-integration.test.tsで確認する(このコンポーネントは計算ロジックを
// 持たず、渡された数値をそのまま表示するだけのため)。
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ResolveXpBar } from './resolve-xp-bar'

afterEach(() => cleanup())

describe('ResolveXpBar(#135)', () => {
  it('見込みXPと上限を可視テキストとして表示する', () => {
    render(<ResolveXpBar estimatedXp={100} maxXp={100} />)
    expect(screen.getByText('このままクリアした場合の獲得XP見込み')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
  })

  it('誤答・相談で減った値を反映する(呼び出し側がcomputeClearXpRewardの結果を渡す想定)', () => {
    render(<ResolveXpBar estimatedXp={75} maxXp={100} />)
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('role="progressbar"でaria-valuenow/min/max/valuetextを持ち、支援技術にも数値が伝わる', () => {
    render(<ResolveXpBar estimatedXp={75} maxXp={100} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('aria-valuenow', '75')
    expect(bar).toHaveAttribute('aria-valuetext', '75 / 100')
    // ラベル(「このままクリアした場合の獲得XP見込み」)がaria-labelledbyで結びついている。
    const labelledBy = bar.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy as string)?.textContent).toBe(
      'このままクリアした場合の獲得XP見込み',
    )
  })

  it('compact指定時はラベル文の行を省き、フルラベルはsr-onlyで維持する(縦長向け・#135)', () => {
    render(<ResolveXpBar estimatedXp={75} maxXp={100} compact />)
    // 可視のラベル文テキストノード(「このままクリアした場合の獲得XP見込み」単体)は存在しない。
    expect(
      screen.queryByText('このままクリアした場合の獲得XP見込み', {
        selector: 'span:not(.sr-only)',
      }),
    ).not.toBeInTheDocument()
    // sr-onlyとしてフルラベルが残る(支援技術には伝わる)。
    expect(
      screen.getByText('このままクリアした場合の獲得XP見込み', { selector: '.sr-only' }),
    ).toBeInTheDocument()
    // 数値はバーの隣に可視テキストとして残る。
    expect(screen.getByText('75/100')).toBeInTheDocument()
    // progressbarのaria属性は非compact時と同じく維持される。
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '75')
    expect(bar).toHaveAttribute('aria-labelledby')
  })

  it('下限0・上限maxXpにclampして描画する(不正値の防御)', () => {
    render(<ResolveXpBar estimatedXp={-10} maxXp={100} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '0')

    cleanup()
    render(<ResolveXpBar estimatedXp={999} maxXp={100} />)
    const bar2 = screen.getByRole('progressbar')
    expect(bar2).toHaveAttribute('aria-valuenow', '100')
  })
})
