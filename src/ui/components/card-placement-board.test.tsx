/** @vitest-environment jsdom */
// CardPlacementBoard の結線テスト(T014 完了条件):
// 「タップのみ」「キーボードのみ」の両方でカード配置(選択→配置→確定)が完遂できることを確認する。
// dnd-kit のドラッグ経路(ポインタの実移動を伴う)は jsdom での再現が難しいため対象外とし、
// PR 本文の手動確認項目として明記する(tasks.md T014 完了条件の注記どおり)。
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '@/core/model'

import { CardPlacementBoard } from './card-placement-board'

afterEach(() => cleanup())

const CARDS: Card[] = [
  {
    id: 'card-proxy-log',
    type: 'ログ',
    source: 'プロキシサーバ',
    investigation_point_id: 'ip-proxy-log',
    body: '深夜に大量ログイン試行が記録されている。',
    is_dummy: false,
  },
  {
    id: 'card-auth-log',
    type: 'ログ',
    source: '認証基盤',
    investigation_point_id: 'ip-auth-log',
    body: '流出パスワードと一致するログインが1件成功している。',
    is_dummy: false,
  },
  {
    id: 'card-witness-tanaka',
    type: '証言',
    source: '経理部 田中',
    investigation_point_id: 'ip-witness-tanaka',
    body: 'パスワードを使い回していたと証言。',
    is_dummy: false,
  },
]

describe('CardPlacementBoard — タップのみでの完遂', () => {
  it('カードをタップ→スロットをタップで配置し、全スロットが埋まったら確定できる', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<CardPlacementBoard cards={CARDS} slotCount={2} onConfirm={onConfirm} />)

    const confirmButton = screen.getByRole('button', { name: '確定' })
    expect(confirmButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /プロキシサーバ/ }))
    await user.click(screen.getByRole('button', { name: 'スロット1(空)へ配置する' }))

    await user.click(screen.getByRole('button', { name: /認証基盤/ }))
    await user.click(screen.getByRole('button', { name: 'スロット2(空)へ配置する' }))

    expect(confirmButton).toBeEnabled()
    await user.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledWith(['card-proxy-log', 'card-auth-log'])
  })

  it('配置済みスロットをタップすると配置解除され、プールに戻る(タップのみで再配置できる)', async () => {
    const user = userEvent.setup()
    render(<CardPlacementBoard cards={CARDS} slotCount={1} onConfirm={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /プロキシサーバ/ }))
    await user.click(screen.getByRole('button', { name: 'スロット1(空)へ配置する' }))
    expect(
      screen.getByRole('button', { name: /スロット1: ログ「プロキシサーバ」を配置解除する/ }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /スロット1: ログ「プロキシサーバ」を配置解除する/ }),
    )
    expect(screen.getByRole('button', { name: 'スロット1(空)へ配置する' })).toBeInTheDocument()
    // プールに戻っている(手持ちカード一覧に再度表示される)。
    const pool = screen.getByRole('list', { name: '手持ちカード' })
    expect(within(pool).getByRole('button', { name: /プロキシサーバ/ })).toBeInTheDocument()
  })

  it('同じカードを2回タップすると選択解除される(誤タップの取り消し)', async () => {
    const user = userEvent.setup()
    render(<CardPlacementBoard cards={CARDS} slotCount={1} onConfirm={vi.fn()} />)

    const card = screen.getByRole('button', { name: /プロキシサーバ/ })
    await user.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'true')
    await user.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('CardPlacementBoard — キーボードのみでの完遂', () => {
  it('Tab で最初の要素にフォーカスが届く(素の <button> のため Tab 順から外れていないことの確認)', async () => {
    const user = userEvent.setup()
    render(<CardPlacementBoard cards={CARDS} slotCount={1} onConfirm={vi.fn()} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'スロット1(空)へ配置する' })).toHaveFocus()
  })

  it('フォーカス+Enter/Space だけで選択・配置・確定まで完遂できる(クリックを一切使わない)', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<CardPlacementBoard cards={CARDS} slotCount={2} onConfirm={onConfirm} />)

    // Tab による到達可能性は上のテストで確認済みのため、ここでは focus() でフォーカスを移した上で
    // Enter/Space キーのみを使い、選択・配置・確定という「操作の完遂」を検証する
    // (実ブラウザでは focus() の代わりに Tab キーで同じ要素に到達できる。素の <button> は
    // Tab 順から外していないため、Tab の回数を数える脆いアサーションにはしない)。
    screen.getByRole('button', { name: /プロキシサーバ/ }).focus()
    await user.keyboard('{Enter}') // カード1(プロキシサーバ)を選択

    screen.getByRole('button', { name: 'スロット1(空)へ配置する' }).focus()
    await user.keyboard('{Enter}') // カード1をスロット1へ配置

    screen.getByRole('button', { name: /認証基盤/ }).focus()
    await user.keyboard(' ') // Space でも選択できる(カード2)

    screen.getByRole('button', { name: 'スロット2(空)へ配置する' }).focus()
    await user.keyboard('{Enter}') // カード2をスロット2へ配置

    const confirmButton = screen.getByRole('button', { name: '確定' })
    expect(confirmButton).toBeEnabled()
    confirmButton.focus()
    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledWith(['card-proxy-log', 'card-auth-log'])
  })
})
