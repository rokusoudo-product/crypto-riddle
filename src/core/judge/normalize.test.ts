import { describe, expect, it } from 'vitest'

import { normalizeAnswer } from './normalize.ts'

describe('normalizeAnswer', () => {
  it.each([
    // [説明, 入力, 期待値]
    ['全角英数字をNFKCで半角に統一する', 'ＡＢＣ１２３', 'abc123'],
    ['大文字を小文字にする', 'PASSWORD LIST ATTACK', 'password list attack'],
    ['カタカナをひらがなに変換する', 'パスワードリスト', 'ぱすわーどりすと'],
    ['半角カタカナはNFKCで全角化された後にひらがな変換される', 'ﾊﾟｽﾜｰﾄﾞ', 'ぱすわーど'],
    ['前後の空白を除去する', '  こたえ  ', 'こたえ'],
    ['連続する空白を1個に圧縮する', 'password   list    attack', 'password list attack'],
    ['全角スペースも空白として圧縮する', '答え　です', '答え です'],
    ['タブや改行を含む連続空白も1個に圧縮する', 'a\t\n b', 'a b'],
    ['4規則の組み合わせ(全角英数字+カタカナ+大文字+前後空白)', '  ＰＡＳＳワード  ', 'passわーど'],
  ])('%s: %s -> %s', (_label, input, expected) => {
    expect(normalizeAnswer(input)).toBe(expected)
  })

  it('冪等性: 正規化済みの文字列を再度正規化しても変化しない', () => {
    const once = normalizeAnswer('  ＰＡＳＳワード　ＬＩＳＴ  ')
    expect(normalizeAnswer(once)).toBe(once)
  })

  it('長音記号(ー)はひらがなに対応字が無いためそのまま保持する', () => {
    expect(normalizeAnswer('パスワード')).toBe('ぱすわーど')
  })
})
