import { describe, expect, it } from 'vitest'

import type { CaesarCipherStage } from './cipher.ts'
import { caesarDecode, caesarStageDecodesToPlaintext, parseCaesarShift } from './cipher.ts'

describe('caesarDecode', () => {
  it.each([
    // [説明, 暗号文, シフト, 平文]
    ['s0-sample のシナリオデータ相当(シフト3)', 'SDVVZRUG OLVW DWWDFN', 3, 'PASSWORD LIST ATTACK'],
    ['シフト0は無変化', 'ABC', 0, 'ABC'],
    ['シフト26は無変化(1周)', 'ABC', 26, 'ABC'],
    ['小文字も復号できる', 'khoor', 3, 'hello'],
    ['負のシフトも正規化して扱える(-26は0と等価)', 'ABC', -26, 'ABC'],
    ['アルファベット以外(空白・記号)はそのまま透過する', 'D-D! Z', 3, 'A-A! W'],
  ])('%s', (_label, ciphertext, shift, expected) => {
    expect(caesarDecode(ciphertext, shift)).toBe(expected)
  })

  it('復号は暗号化の逆操作になる(shift分だけずらして戻す)', () => {
    const shift = 5
    const plaintext = 'HELLO WORLD'
    // 手動でシフト+5した暗号文を作り、それを復号すると元に戻ることを確認する。
    const ciphertext = Array.from(plaintext)
      .map((ch) => {
        const code = ch.codePointAt(0)
        if (code === undefined || code < 65 || code > 90) return ch
        return String.fromCodePoint(((code - 65 + shift) % 26) + 65)
      })
      .join('')
    expect(caesarDecode(ciphertext, shift)).toBe(plaintext)
  })
})

describe('parseCaesarShift', () => {
  it.each([
    ['3', 3],
    ['0', 0],
    ['-1', -1],
    ['  10  ', 10],
  ])('"%s" -> %d', (key, expected) => {
    expect(parseCaesarShift(key)).toBe(expected)
  })

  it.each([['A→D'], ['three'], ['']])('数値として解釈できない場合は null を返す: %s', (key) => {
    expect(parseCaesarShift(key)).toBeNull()
  })
})

describe('caesarStageDecodesToPlaintext', () => {
  function sampleStage(overrides: Partial<CaesarCipherStage> = {}): CaesarCipherStage {
    return {
      id: 'cs-1',
      method: 'caesar',
      ciphertext: 'SDVVZRUG OLVW DWWDFN',
      key: '3',
      key_hint: 'A→D',
      plaintext: 'PASSWORD LIST ATTACK',
      ...overrides,
    }
  }

  it('s0-sample 相当のデータで key から plaintext に復号できることを確認する', () => {
    expect(caesarStageDecodesToPlaintext(sampleStage())).toBe(true)
  })

  it('key と実際のずれ幅が合っていない場合は false になる', () => {
    expect(caesarStageDecodesToPlaintext(sampleStage({ key: '4' }))).toBe(false)
  })

  it('key が数値として解釈できない場合は false になる', () => {
    expect(caesarStageDecodesToPlaintext(sampleStage({ key: 'A→D' }))).toBe(false)
  })
})
