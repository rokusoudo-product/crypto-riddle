// src/ui/lib/explanation.ts — questions[].explanations の話者付き表示(#100/#102)。
//
// schema_version 0.7.0 で explanations が array(string | DialogueLine) の union になった
// (docs/scenario_schema.md §2.6)。core側の pickExplanation(src/core/scenario/state.ts)は
// AnswerFeedback.explanation を string | null のまま返す後方互換な最小対応で、オブジェクト
// 要素の character(話者)は意図的に落としている(pickExplanationのJSDoc参照)。話者付き表示
// (DESIGN.md「解決の会話モード」節「誤答フィードバック」、Issue #102 要件5)には character が
// 要るため、UI側で core と同じインデックス選択式(explanations[min(priorWrongAttempts,
// length-1)])を再現し、string | DialogueLine を表示用の{character, line}へ正規化する。
//
// 二重実装になる点(coreのpickExplanationと同じインデックス式をここでも計算する)は承知の上の
// 妥協。coreのAnswerFeedbackにexplanationSpeakerを足せば避けられるが、本PR(#102)は
// src/core/ を変更しない制約のため見送った(PR本文に記載)。resolve-screen.test.tsxで
// このindex式が core の pickExplanation とズレていないことを回帰確認する。
import type { Character, Question } from '@/core/model'

export interface ResolvedExplanation {
  readonly character: Character
  readonly line: string
}

/**
 * 誤答時の段階解説を話者付きで解決する(spec §8.2「外すたびに解説が段階的に深くなる」)。
 * `priorWrongAttempts` は今回の誤答より前の誤答回数(初回誤答なら0。
 * src/core/scenario/state.ts の pickExplanation と同じ意味・同じインデックス式。
 * 呼び出し側は `(progress.wrongAttemptsByQuestionId[question.id] ?? 1) - 1` で求める
 * =dispatch後は既に+1されているため1引く、resolve-screen.tsx参照)。
 * explanations が無い/空なら null(replyのみで表示する、docs/scenario_schema.md §2.4)。
 */
export function resolveExplanation(
  question: Question,
  priorWrongAttempts: number,
): ResolvedExplanation | null {
  const explanations = question.explanations
  if (!explanations || explanations.length === 0) return null
  const index = Math.min(priorWrongAttempts, explanations.length - 1)
  const explanation = explanations[index]
  return typeof explanation === 'string'
    ? { character: question.speaker, line: explanation }
    : { character: explanation.character, line: explanation.line }
}
