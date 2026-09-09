import { describe, expect, it } from 'vitest'

import { isScreenState, SCREEN_STATES } from '@/ui/state/screen-state'

describe('isScreenState', () => {
  it.each(SCREEN_STATES)('%s は ScreenState として真', (value) => {
    expect(isScreenState(value)).toBe(true)
  })

  it('未知の文字列は偽', () => {
    expect(isScreenState('unknown')).toBe(false)
  })

  it('null は偽', () => {
    expect(isScreenState(null)).toBe(false)
  })
})
