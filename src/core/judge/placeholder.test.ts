import { describe, expect, it } from 'vitest'

// Phase 1（Issue #21 / T003）用の空テスト。判定エンジン本体は Issue #3 の ready 付与後、T008 で実装する。
describe('placeholder', () => {
  it('CI の Vitest ジョブが実行されることを確認する', () => {
    expect(true).toBe(true)
  })
})
