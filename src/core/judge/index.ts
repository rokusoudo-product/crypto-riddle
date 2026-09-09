// src/core/judge — 単一解・厳密一致判定＋正規化（T008、spec §8.2、plan.md §3）。
//
// spec §8.2 決定「MVP は単一解・厳密一致」に対応する2種類の判定を提供する:
//   1. judgeTextAnswer: 文字列回答(暗号解読の答え等)。normalizeAnswer で正規化してから比較する。
//   2. judgeCardSelection: カードID照合(解決パートのスロット判定＝攻撃特定・防衛策選択)。
//      正解カードID集合と選択カードID集合が完全一致(過不足なし)する場合のみ正解とする。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import type { CipherStage } from '../model/index.ts'

import { normalizeAnswer } from './normalize.ts'

export { caesarDecode, caesarStageDecodesToPlaintext, parseCaesarShift } from './cipher.ts'
export type { CaesarCipherStage } from './cipher.ts'
export { normalizeAnswer } from './normalize.ts'

/**
 * 文字列回答の厳密一致判定(正規化後)。暗号解読の答え・攻撃名の自由記述回答等に使う。
 * カードID照合には judgeCardSelection を使うこと(意味が異なるため関数を分ける)。
 */
export function judgeTextAnswer(submitted: string, expected: string): boolean {
  return normalizeAnswer(submitted) === normalizeAnswer(expected)
}

/**
 * カードID選択の厳密一致判定(spec §8.2)。順序を問わず、過不足のない完全一致のみ正解とする
 * (部分点・複数正解ルートは見送り、#7 代表決定)。カードIDは正規化して比較する(表記ゆれ対策)。
 */
export function judgeCardSelection(submittedCardIds: string[], requiredCardIds: string[]): boolean {
  const normalize = (ids: string[]) => [...new Set(ids.map((id) => normalizeAnswer(id)))].sort()
  const submitted = normalize(submittedCardIds)
  const required = normalize(requiredCardIds)
  if (submitted.length !== required.length) return false
  return submitted.every((id, index) => id === required[index])
}

/**
 * `resolution.cipher_stages` の1段を判定する。T005 時点では method='caesar' の1 variant のみだが、
 * 将来の拡張(base64/xor/hash_match 等、plan.md §8.1)に備え判別可能 union を switch で扱う。
 * プレイヤーの回答は「復号後の平文」を入力する形式を前提とする(caesarDecode はデータ整合性確認・
 * 将来のシフト数入力式 UI 用のヘルパとして別途 export している)。
 */
export function judgeCipherStage(stage: CipherStage, submittedPlaintext: string): boolean {
  switch (stage.method) {
    case 'caesar':
      return judgeTextAnswer(submittedPlaintext, stage.plaintext)
    default: {
      // 判別可能 union が拡張されたのに switch を更新し忘れた場合にコンパイルエラーにする。
      const exhaustiveCheck: never = stage.method
      throw new Error(`未対応の cipher method です: ${String(exhaustiveCheck)}`)
    }
  }
}
