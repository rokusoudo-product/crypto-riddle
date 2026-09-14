/** @vitest-environment jsdom */
// src/ui/lib/orientation.test.ts — useIsPortraitScreen(#119/#124)の単体テスト。
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useIsPortraitScreen } from './orientation'

/** conversation-frame.test.tsxのmockPrefersReducedMotionと同じパターンで
 * `(orientation: portrait)`のmatchMediaをモックする。 */
function mockOrientation(matches: boolean) {
  const listeners = new Set<() => void>()
  const mediaQueryList = {
    matches,
    media: '(orientation: portrait)',
    addEventListener: (_type: string, handler: () => void) => listeners.add(handler),
    removeEventListener: (_type: string, handler: () => void) => listeners.delete(handler),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  } as unknown as MediaQueryList
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue(mediaQueryList) as unknown as typeof window.matchMedia,
  )
  return {
    setMatches(next: boolean) {
      ;(mediaQueryList as unknown as { matches: boolean }).matches = next
      listeners.forEach((handler) => handler())
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIsPortraitScreen(#119/#124)', () => {
  it('matchMedia未実装(jsdom既定)では常にfalse(landscape)を返す', () => {
    const { result } = renderHook(() => useIsPortraitScreen())
    expect(result.current).toBe(false)
  })

  it('matchMediaが(orientation: portrait)にマッチしていればtrueを返す', () => {
    mockOrientation(true)
    const { result } = renderHook(() => useIsPortraitScreen())
    expect(result.current).toBe(true)
  })

  it('向きの変化(matchMediaのchangeイベント)を購読して値を更新する', () => {
    const mock = mockOrientation(false)
    const { result } = renderHook(() => useIsPortraitScreen())
    expect(result.current).toBe(false)

    act(() => {
      mock.setMatches(true)
    })
    expect(result.current).toBe(true)
  })
})
