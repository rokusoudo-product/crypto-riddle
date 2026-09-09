// src/core/judge/cipher.ts — シーザー暗号の復号ヘルパ（T008、plan.md §3・spec §8.1）。
//
// `cipher_stages` は zod の判別可能 union（src/core/model/scenario.ts の cipherStageSchema）で、
// T005 時点では method: 'caesar' の1 variant のみを持つ。判定に必要な範囲として、
// 「暗号文 + シフト数(key)から平文を復号する」処理のみをここに置く。ミニゲームの UI
// （シフトをライブ調整する等）は範囲外（spec §8.1 注記）。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import type { CipherStage } from '../model/index.ts'

// scenario.ts は判別可能 union の `caesarCipherStageSchema` を export していないため、
// model 側に手を加えずに `CipherStage` から 'caesar' variant を抽出する（model への変更を
// 最小限に留める方針、PR 本文参照）。T005 時点では union の唯一の要素と一致する。
export type CaesarCipherStage = Extract<CipherStage, { method: 'caesar' }>

/**
 * シーザー暗号を復号する。英字(A-Z/a-z)以外の文字(空白・記号)はそのまま透過する。
 * 大文字/小文字は保持する。`shift` は負値や26以上も許容し、内部で 0-25 に正規化する。
 */
export function caesarDecode(ciphertext: string, shift: number): string {
  const normalizedShift = ((shift % 26) + 26) % 26
  return Array.from(ciphertext)
    .map((ch) => {
      const code = ch.codePointAt(0)
      if (code === undefined) return ch
      if (code >= 65 && code <= 90) {
        // A-Z
        return String.fromCodePoint(((code - 65 - normalizedShift + 26) % 26) + 65)
      }
      if (code >= 97 && code <= 122) {
        // a-z
        return String.fromCodePoint(((code - 97 - normalizedShift + 26) % 26) + 97)
      }
      return ch
    })
    .join('')
}

/**
 * `CaesarCipherStage.key` は自由記述の文字列(§8.1)だが、MVP では数値のシフト量を想定する。
 * 数値として解釈できない場合は null を返す(呼び出し側で扱いを決める)。
 */
export function parseCaesarShift(key: string): number | null {
  const trimmed = key.trim()
  if (!/^-?\d+$/.test(trimmed)) return null
  return Number.parseInt(trimmed, 10)
}

/**
 * ステージの `key` を使って `ciphertext` を復号し、データ上の `plaintext` と一致するかを返す
 * (シナリオデータ自体の整合性確認や、将来シフト数入力式 UI を作る際の検証に使える)。
 * `key` が数値として解釈できない場合は false を返す。
 */
export function caesarStageDecodesToPlaintext(stage: CaesarCipherStage): boolean {
  const shift = parseCaesarShift(stage.key)
  if (shift === null) return false
  return caesarDecode(stage.ciphertext, shift) === stage.plaintext
}
