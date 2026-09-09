// src/core/judge/normalize.ts — 判定の前段で使う文字列正規化（plan.md §3、T008）。
//
// 適用順序は plan.md §3 に明記された順を厳守する:
//   1. Unicode NFKC（全角/半角統一）
//   2. 大文字 → 小文字
//   3. カタカナ → ひらがな
//   4. 前後空白の除去・連続空白の1個への圧縮
//
// カードID照合（英数字+ハイフン/アンダースコアのみ、spec に日本語は出現しない）にも
// 文字列回答（暗号解読の答え等、日本語を含みうる）にも同じ関数を適用できるようにしてある。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。

/** カタカナの主要範囲(U+30A1-U+30F6)をひらがな(U+3041-U+3096)に変換する。範囲外はそのまま返す。 */
function katakanaToHiragana(input: string): string {
  return Array.from(input)
    .map((ch) => {
      const code = ch.codePointAt(0)
      if (code === undefined) return ch
      // ァ(0x30A1)～ヶ(0x30F6)のみ対象。ー(0x30FC, 長音記号)等はひらがな側に対応字が無いため変換しない。
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCodePoint(code - 0x60)
      }
      return ch
    })
    .join('')
}

/**
 * 判定前の正規化本体。plan.md §3 の4規則を順に適用する。
 * 「連続空白の除去」は空白1文字への圧縮として実装する(単語区切りの意味を保つため、
 * 単語間の空白を完全に削除すると複数語の答え(例:"PASSWORD LIST ATTACK")が別の語に
 * 連結されてしまうのを避ける設計判断)。
 */
export function normalizeAnswer(input: string): string {
  const nfkc = input.normalize('NFKC')
  const lower = nfkc.toLowerCase()
  const hiragana = katakanaToHiragana(lower)
  return hiragana.trim().replace(/\s+/g, ' ')
}
