/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCardPlacement } from './use-card-placement'

describe('useCardPlacement', () => {
  const cards = ['card-a', 'card-b', 'card-c'] as const

  it('初期状態: 全カードがプールにあり、スロットは全て空', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    expect(result.current.poolCardIds).toEqual(['card-a', 'card-b', 'card-c'])
    expect(result.current.slots).toEqual([null, null])
    expect(result.current.isComplete).toBe(false)
  })

  it('タップ配置: カードを選択してスロットをタップすると配置される(第一操作)', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.selectCard('card-a'))
    expect(result.current.selectedCardId).toBe('card-a')
    act(() => result.current.tapSlot(0))
    expect(result.current.slots).toEqual(['card-a', null])
    expect(result.current.poolCardIds).toEqual(['card-b', 'card-c'])
    expect(result.current.selectedCardId).toBeNull()
  })

  it('同じカードを2回タップすると選択解除される', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.selectCard('card-a'))
    act(() => result.current.selectCard('card-a'))
    expect(result.current.selectedCardId).toBeNull()
  })

  it('選択なしで配置済みスロットをタップすると配置解除される', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.selectCard('card-a'))
    act(() => result.current.tapSlot(0))
    act(() => result.current.tapSlot(0))
    expect(result.current.slots).toEqual([null, null])
    expect(result.current.poolCardIds).toContain('card-a')
  })

  it('選択なしで空スロットをタップしても何も起きない', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.tapSlot(0))
    expect(result.current.slots).toEqual([null, null])
  })

  it('配置済みスロットへ選択中のカードをタップすると入れ替わる(元のカードはプールへ戻る)', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.selectCard('card-a'))
    act(() => result.current.tapSlot(0))
    act(() => result.current.selectCard('card-b'))
    act(() => result.current.tapSlot(0))
    expect(result.current.slots).toEqual(['card-b', null])
    expect(result.current.poolCardIds.slice().sort()).toEqual(['card-a', 'card-c'])
  })

  it('全スロットが埋まると isComplete が true になる', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.selectCard('card-a'))
    act(() => result.current.tapSlot(0))
    act(() => result.current.selectCard('card-b'))
    act(() => result.current.tapSlot(1))
    expect(result.current.isComplete).toBe(true)
    expect(result.current.placedCardIds).toEqual(['card-a', 'card-b'])
  })

  it('ドラッグ操作(補助): moveCardToSlot でカードを直接スロットへ移動できる', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.moveCardToSlot('card-c', 1))
    expect(result.current.slots).toEqual([null, 'card-c'])
    expect(result.current.poolCardIds).toEqual(['card-a', 'card-b'])
  })

  it('moveCardToSlot は既に配置済みのカードを別スロットへ移動できる(元スロットは空になる)', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.moveCardToSlot('card-a', 0))
    act(() => result.current.moveCardToSlot('card-a', 1))
    expect(result.current.slots).toEqual([null, 'card-a'])
  })

  it('moveCardToPool でスロットのカードをプールへ戻せる', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.moveCardToSlot('card-a', 0))
    act(() => result.current.moveCardToPool('card-a'))
    expect(result.current.slots).toEqual([null, null])
    expect(result.current.poolCardIds).toContain('card-a')
  })

  it('reset で選択・配置が初期状態に戻る', () => {
    const { result } = renderHook(() => useCardPlacement(cards, 2))
    act(() => result.current.selectCard('card-a'))
    act(() => result.current.tapSlot(0))
    act(() => result.current.reset())
    expect(result.current.slots).toEqual([null, null])
    expect(result.current.selectedCardId).toBeNull()
    expect(result.current.poolCardIds).toEqual(['card-a', 'card-b', 'card-c'])
  })
})
