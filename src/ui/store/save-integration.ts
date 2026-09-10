// src/ui/store/save-integration.ts — ScenarioProgressState(core)と SaveData(core)を
// つなぐ純関数群(T013)。
//
// SaveData(プロフィール全体の永続データ。core/model/save-data.ts)と
// ScenarioProgressState(1回のプレイセッションの進行。core/scenario/state.ts)は別レイヤーの概念で、
// 「今回の進行を永続データへ反映する」という統合ロジックはどちらの core モジュールにも属さない
// (ScenarioProgressState 自体は SaveData を知らない設計、plan.md §2 の関心分離)。
// そのため ui 側のこのファイルに置く。ゲームロジック(判定・遷移)自体は再実装せず、
// core が返した ScenarioProgressState をそのまま材料として使うだけにとどめる。
//
// T013/T014 時点では「クリア済みフラグ」「獲得カードの永続化」という T009 のスキーマが
// すでに持っているフィールドの反映のみを行い、XP 加算等のバランス設計には踏み込まないスコープだった。
// T016(FR-6, Issue #5)でこの続きを実装する: spec.md §9「報酬: 事件クリアで XP」「分野別に習熟度を
// 記録」に対応する具体的な加算値は spec/plan に定義が無いため、最小の妥当値として以下を採用した
// (バランス調整の本調整は tasks.md T022 の範囲。値は PR 本文に明記のうえ代表レビューを受ける)。
//   - CLEAR_XP_REWARD(固定値)をクリアのたびに加算する(再クリアでも加算される。単純化のため
//     「初回クリアのみ」等の重複防止ロジックは持たない)。
//   - シナリオの subject_tags に含まれる分野タグそれぞれに +1 する(MASTERY_POINTS_PER_TAG)。
//
// 2026-09-10(#42/#45/T034, FR-11/spec §8.4): 「誤答1回・相談1回ごとに獲得XPを減算する(下限あり)」を
// computeClearXpReward() として実装した。単価も spec/plan に定義が無いため最小の妥当値を置く
// (本調整は T022 の範囲。値・根拠は PR 本文に明記):
//   - WRONG_ANSWER_XP_PENALTY: 誤答1回ごとの減算。誤答しても選択肢に残った reply(部分的なフォロー)
//     のみが得られる(spec §8.2)ため、相談より軽い単価にする。
//   - CONSULT_XP_PENALTY: 相談1回ごとの減算。相談は consult_hint という完成された詳細ヒントを
//     丸ごと得られる(spec §8.2「詰まったら相談で、詳細ヒントを提示する」)ため、誤答より重い単価にする。
//   - 下限は 0(CLEAR_XP_REWARD を上回る減算にはしない。spec §8.4「0未満にはしない」)。
import {
  SAVE_DATA_SCHEMA_VERSION,
  type SaveData,
  type Scenario,
  type ScenarioProgress,
  type SubjectMastery,
  type SubjectTag,
} from '@/core/model'
import type { ScenarioProgressState } from '@/core/scenario'

/** 事件クリアで加算する基礎XP(spec §9「報酬: 事件クリアでXP」の最小実装値)。誤答・相談の減算前の値。 */
export const CLEAR_XP_REWARD = 100

/** クリアしたシナリオの分野タグ1つあたりに加算する習熟ポイント(最小実装値)。 */
export const MASTERY_POINTS_PER_TAG = 1

/** 誤答1回ごとに獲得XPから減算する量(spec §8.4・FR-11の最小実装値)。 */
export const WRONG_ANSWER_XP_PENALTY = 10

/** 相談1回ごとに獲得XPから減算する量(spec §8.4・FR-11の最小実装値。誤答より重い単価)。 */
export const CONSULT_XP_PENALTY = 15

/** questions 全体の誤答回数を合計する。 */
function sumWrongAttempts(progress: ScenarioProgressState): number {
  return Object.values(progress.wrongAttemptsByQuestionId).reduce((sum, n) => sum + n, 0)
}

/**
 * クリア時に実際に加算するXPを計算する(spec §8.4「誤答1回・相談1回ごとに獲得XPを減算(下限あり)」)。
 * 結果画面(獲得XP表示)と applyClearToSaveData(永続化)の両方から同じ値を参照できるよう公開する。
 */
export function computeClearXpReward(progress: ScenarioProgressState): number {
  const penalty =
    sumWrongAttempts(progress) * WRONG_ANSWER_XP_PENALTY +
    progress.consultsUsed * CONSULT_XP_PENALTY
  return Math.max(0, CLEAR_XP_REWARD - penalty)
}

/** 未保存(初回起動)時の既定 SaveData。 */
export function createDefaultSaveData(): SaveData {
  return {
    version: SAVE_DATA_SCHEMA_VERSION,
    xp: 0,
    scenario_progress: [],
    owned_card_ids: [],
    subject_mastery: {},
    settings: { bgm_volume: 1, se_volume: 1, reduce_motion: false },
  }
}

function mergeOwnedCardIds(existing: readonly string[], incoming: readonly string[]): string[] {
  return [...new Set([...existing, ...incoming])]
}

function upsertScenarioProgress(
  list: readonly ScenarioProgress[],
  entry: ScenarioProgress,
): ScenarioProgress[] {
  const index = list.findIndex((p) => p.scenario_id === entry.scenario_id)
  if (index === -1) return [...list, entry]
  return list.map((p, i) => (i === index ? entry : p))
}

/** クリアしたシナリオの subject_tags それぞれに MASTERY_POINTS_PER_TAG を加算する。 */
function addMasteryForTags(mastery: SubjectMastery, tags: readonly SubjectTag[]): SubjectMastery {
  const next: SubjectMastery = { ...mastery }
  for (const tag of tags) {
    next[tag] = (next[tag] ?? 0) + MASTERY_POINTS_PER_TAG
  }
  return next
}

/**
 * 探索でカードを獲得した等、「重要進行時」の中間保存(plan.md §6)。
 * クリア済みフラグは変更しない(まだクリアしていないため)。
 */
export function applyProgressToSaveData(save: SaveData, progress: ScenarioProgressState): SaveData {
  return {
    ...save,
    owned_card_ids: mergeOwnedCardIds(save.owned_card_ids, progress.ownedCardIds),
  }
}

/**
 * クリア時の保存(plan.md §6)。scenario_progress にクリア済みを記録し、獲得済みカードを
 * 永続データへ合流させ、XP・分野習熟(subject_mastery)を加算する(T016, FR-6)。
 *
 * 第2引数は `scenario.id` だけでなく `subject_tags` も必要とするため、シナリオ丸ごとではなく
 * 必要なフィールドだけを `Pick` で受け取る(呼び出し側でシナリオ全体を保持していなくても使える)。
 */
export function applyClearToSaveData(
  save: SaveData,
  scenario: Pick<Scenario, 'id' | 'subject_tags'>,
  progress: ScenarioProgressState,
  clearedAt: string = new Date().toISOString(),
): SaveData {
  const withCards = applyProgressToSaveData(save, progress)
  const wrongAnswerCount = sumWrongAttempts(progress)
  return {
    ...withCards,
    xp: withCards.xp + computeClearXpReward(progress),
    subject_mastery: addMasteryForTags(withCards.subject_mastery, scenario.subject_tags),
    scenario_progress: upsertScenarioProgress(withCards.scenario_progress, {
      scenario_id: scenario.id,
      cleared: true,
      cleared_at: clearedAt,
      // T034(spec §8.4): 相談 0 回でのクリア(ノーヒントクリア)を記録する(誤答は含めない。
      // 「ヒント」は相談で得る consult_hint を指し、誤答時の reply は求めて得るものではないため)。
      no_hint_clear: progress.consultsUsed === 0,
      wrong_answer_count: wrongAnswerCount,
      consult_count: progress.consultsUsed,
    }),
  }
}
