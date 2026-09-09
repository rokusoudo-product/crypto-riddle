import { describe, expect, it } from 'vitest'

import type { CipherStage } from '../model/index.ts'

import { judgeCardSelection, judgeCipherStage, judgeTextAnswer } from './index.ts'

describe('judgeTextAnswer', () => {
  it.each([
    // [説明, 回答, 正解, 期待値]
    ['完全一致', 'PASSWORD LIST ATTACK', 'PASSWORD LIST ATTACK', true],
    ['大文字小文字の違いを無視する', 'password list attack', 'PASSWORD LIST ATTACK', true],
    ['全角/半角の違いを無視する', 'ＰＡＳＳＷＯＲＤ', 'PASSWORD', true],
    ['カタカナ/ひらがなの違いを無視する', 'ぱすわーど', 'パスワード', true],
    ['前後の空白の違いを無視する', '  こたえ  ', 'こたえ', true],
    ['連続空白の違いを無視する', 'a    b', 'a b', true],
    ['不正解(別の単語)', 'フィッシング', 'パスワードリスト攻撃', false],
    ['部分一致は不正解(厳密一致)', 'PASSWORD', 'PASSWORD LIST ATTACK', false],
  ])('%s: judgeTextAnswer(%j, %j) === %s', (_label, submitted, expected, want) => {
    expect(judgeTextAnswer(submitted, expected)).toBe(want)
  })
})

describe('judgeCardSelection', () => {
  it.each([
    // [説明, 選択カードID, 正解カードID集合, 期待値]
    ['完全一致(順序違い)', ['b', 'a'], ['a', 'b'], true],
    ['過不足なし', ['a', 'b', 'c'], ['a', 'b', 'c'], true],
    ['不足があると不正解', ['a'], ['a', 'b'], false],
    ['余分があると不正解(ダミーカード混入)', ['a', 'b', 'dummy'], ['a', 'b'], false],
    ['完全に異なる集合は不正解', ['x', 'y'], ['a', 'b'], false],
    ['重複を含む選択は重複排除してから比較する', ['a', 'a', 'b'], ['a', 'b'], true],
    ['空の正解に対し空選択は正解(境界)', [], [], true],
  ])('%s', (_label, submitted, required, want) => {
    expect(judgeCardSelection(submitted, required)).toBe(want)
  })
})

describe('judgeCipherStage', () => {
  function caesarStage(overrides: Partial<Extract<CipherStage, { method: 'caesar' }>> = {}) {
    return {
      id: 'cs-1',
      method: 'caesar' as const,
      ciphertext: 'SDVVZRUG OLVW DWWDFN',
      key: '3',
      key_hint: 'A→D',
      plaintext: 'PASSWORD LIST ATTACK',
      ...overrides,
    }
  }

  it('平文回答が正規化後に一致すれば正解', () => {
    expect(judgeCipherStage(caesarStage(), 'password list attack')).toBe(true)
  })

  it('平文回答が不一致なら不正解', () => {
    expect(judgeCipherStage(caesarStage(), 'phishing attack')).toBe(false)
  })
})
