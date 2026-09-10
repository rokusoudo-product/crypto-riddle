// src/core/judge — 単一解・厳密一致判定＋正規化（T008/T031、spec §8.2、plan.md §3）。
//
// spec §8.2 決定「MVP は単一解・厳密一致」に対応する判定を提供する:
//   1. judgeTextAnswer: 文字列回答(暗号解読の答え等)。normalizeAnswer で正規化してから比較する。
//   2. judgeQuestionChoice: 会話モード(#42/T030)の問い単位の選択肢判定。
//      旧 judgeCardSelection(カードID集合の完全一致判定)は required_card_ids 方式の廃止に伴い削除した
//      (#42/T031。選択肢が自由記述の questions[].choices になったため、カードID照合は不要)。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import type { CipherStage, Question, QuestionChoice } from '../model/index.ts'

import { normalizeAnswer } from './normalize.ts'

export { caesarDecode, caesarStageDecodesToPlaintext, parseCaesarShift } from './cipher.ts'
export type { CaesarCipherStage } from './cipher.ts'
export { normalizeAnswer } from './normalize.ts'

/**
 * 文字列回答の厳密一致判定(正規化後)。暗号解読の答え・攻撃名の自由記述回答等に使う。
 */
export function judgeTextAnswer(submitted: string, expected: string): boolean {
  return normalizeAnswer(submitted) === normalizeAnswer(expected)
}

export interface QuestionChoiceJudgement {
  /** 選択された choice が正解(is_correct: true)だったか。 */
  correct: boolean
  /** 選択された choice そのもの(reply 等の表示に使う)。 */
  choice: QuestionChoice
}

/**
 * 会話モード(#42/T030)の問い単位判定(spec §8.2「問い単位で単一解・厳密一致」)。
 * `choiceIndex` は `question.choices` のインデックス。範囲外は不正な入力として例外を投げる
 * (呼び出し側の src/core/scenario/state.ts が事前に範囲チェックしてから呼ぶ想定)。
 */
export function judgeQuestionChoice(question: Question, choiceIndex: number): QuestionChoiceJudgement {
  const choice = question.choices[choiceIndex]
  if (!choice) {
    throw new Error(
      `question '${question.id}' に choiceIndex=${choiceIndex} の選択肢がありません(choices.length=${question.choices.length})。`,
    )
  }
  return { correct: choice.is_correct, choice }
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
