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
// ここでは XP 加算等のバランス設計(未確定, tasks.md T018 で調整予定)には踏み込まず、
// 「クリア済みフラグ」「獲得カードの永続化」という T009 のスキーマがすでに持っているフィールドの
// 反映のみを行う(スコープを T013/T014 に限定する)。
import { SAVE_DATA_SCHEMA_VERSION, type SaveData, type ScenarioProgress } from '@/core/model'
import type { ScenarioProgressState } from '@/core/scenario'

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
 * クリア時の保存(plan.md §6)。scenario_progress にクリア済みを記録し、
 * 獲得済みカードを永続データへ合流させる。
 */
export function applyClearToSaveData(
  save: SaveData,
  scenarioId: string,
  progress: ScenarioProgressState,
  clearedAt: string = new Date().toISOString(),
): SaveData {
  const withCards = applyProgressToSaveData(save, progress)
  return {
    ...withCards,
    scenario_progress: upsertScenarioProgress(withCards.scenario_progress, {
      scenario_id: scenarioId,
      cleared: true,
      cleared_at: clearedAt,
    }),
  }
}
