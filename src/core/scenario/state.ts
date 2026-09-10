// src/core/scenario/state.ts — シナリオ進行の明示的ステートマシン（T007、plan.md §2）。
//
// 導入→探索→解決(暗号→特定→防衛)の進行を、外部ライブラリを使わない reducer 形式の
// 明示的ステートマシンとして実装する(plan.md §1「外部ライブラリ不要」の方針)。
// 状態(ScenarioProgressState)はプレーンな JSON 互換オブジェクトにし、T009(SaveStorage)での
// 永続化・T013(Zustand 接続)へそのまま渡せるようにする(手書きクラス・Map/Set 等は使わない)。
//
// 状態遷移図(概略):
//
//   intro --(ADVANCE_INTRO)--> exploration --(ENTER_RESOLUTION, 全ポイント調査済み)--> resolution(cipher)
//   exploration --(INVESTIGATE)--> exploration (カード獲得。全ポイント調査済みになるまでループ)
//   resolution(cipher) --(正解)--> resolution(attack_identification)
//   resolution(attack_identification) --(正解)--> resolution(countermeasure)
//   resolution(countermeasure) --(正解)--> clear
//   resolution(*) --(不正解)--> follow_up (失敗解説。wrong_answer_follow_ups から該当行を保持)
//   follow_up --(RESUME_FROM_FOLLOW_UP)--> resolution(誤答したステージに復帰。「初動をやり直す」)
//
// T015(Issue #5)で追加: scenario.resolution.cipher_stages が0件の「暗号なし」シナリオ(入門編 S1)では
// ENTER_RESOLUTION が resolution(cipher) をスキップし、直接 resolution(attack_identification) へ進む。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { judgeCardSelection, judgeCipherStage } from '../judge/index.ts'
import type { FollowUp, Scenario } from '../model/index.ts'

export type ScenarioPart = 'intro' | 'exploration' | 'resolution' | 'follow_up' | 'clear'

export type ResolutionStage = 'cipher' | 'attack_identification' | 'countermeasure'

/**
 * シナリオ進行の状態。シリアライズ可能なプレーンデータのみで構成する(T009 のセーブ・
 * T013 の Zustand 接続を見据えた設計要件、tasks.md T007 完了条件)。
 */
export interface ScenarioProgressState {
  readonly scenarioId: string
  readonly part: ScenarioPart
  /** resolution 中のみ意味を持つ。intro/exploration/clear では null。 */
  readonly resolutionStage: ResolutionStage | null
  /** 調査済みの investigation_point id 一覧(順不同・重複なし)。 */
  readonly investigatedPointIds: readonly string[]
  /** 獲得済みカードid一覧(ダミーカードも含む。順不同・重複なし)。 */
  readonly ownedCardIds: readonly string[]
  /** follow_up 中のみ意味を持つ、表示すべきフォロー台詞。 */
  readonly pendingFollowUp: FollowUp | null
  /** follow_up から RESUME_FROM_FOLLOW_UP した際に戻る先のステージ。follow_up 中のみ意味を持つ。 */
  readonly resumeStage: ResolutionStage | null
}

export type ScenarioEvent =
  | { type: 'ADVANCE_INTRO' }
  | { type: 'INVESTIGATE'; pointId: string }
  | { type: 'ENTER_RESOLUTION' }
  | { type: 'SUBMIT_CIPHER_ANSWER'; answer: string }
  | { type: 'SUBMIT_ATTACK_IDENTIFICATION'; cardIds: string[] }
  | { type: 'SUBMIT_COUNTERMEASURE'; cardIds: string[] }
  | { type: 'RESUME_FROM_FOLLOW_UP' }

/** 初期状態を作る。導入(intro)パートから開始する。 */
export function createInitialScenarioState(scenario: Scenario): ScenarioProgressState {
  return {
    scenarioId: scenario.id,
    part: 'intro',
    resolutionStage: null,
    investigatedPointIds: [],
    ownedCardIds: [],
    pendingFollowUp: null,
    resumeStage: null,
  }
}

/**
 * 探索パートから解決パートへ進める条件。「探索(手がかり収集)」パートの完了を
 * 「全ての調査ポイントを調べ終えた」ことと定義する(spec §7: 調査ポイントは有限個で構成される
 * 設計のため、ダミーカードを含め全て調べ切ってから推理に入るのが本作の基本フロー)。
 * UI 側が「解決へ進む」ボタンの活性/非活性判定にそのまま使えるよう公開する。
 */
export function canEnterResolution(state: ScenarioProgressState, scenario: Scenario): boolean {
  if (state.part !== 'exploration') return false
  return scenario.investigation_points.every((point) =>
    state.investigatedPointIds.includes(point.id),
  )
}

function addUnique(list: readonly string[], value: string): readonly string[] {
  return list.includes(value) ? list : [...list, value]
}

function findFollowUp(scenario: Scenario, trigger: ResolutionStage): FollowUp {
  const followUp = scenario.resolution.wrong_answer_follow_ups.find((f) => f.trigger === trigger)
  if (!followUp) {
    throw new Error(
      `シナリオ '${scenario.id}' に trigger='${trigger}' の wrong_answer_follow_ups がありません。`,
    )
  }
  return followUp
}

/**
 * シナリオ進行のステートマシン本体(純粋な reducer)。不正な遷移(例: intro 中に INVESTIGATE を
 * 送る、resolution の別ステージへ送る等)は状態を変更せずそのまま返す(無視する)。
 * 呼び出し側(UI/テスト)は返り値が入力と同一参照かどうかで遷移が起きたか判定できる。
 */
export function scenarioReducer(
  scenario: Scenario,
  state: ScenarioProgressState,
  event: ScenarioEvent,
): ScenarioProgressState {
  switch (event.type) {
    case 'ADVANCE_INTRO': {
      if (state.part !== 'intro') return state
      return { ...state, part: 'exploration' }
    }

    case 'INVESTIGATE': {
      if (state.part !== 'exploration') return state
      const point = scenario.investigation_points.find((p) => p.id === event.pointId)
      if (!point) return state
      if (state.investigatedPointIds.includes(event.pointId)) return state

      const cardIdsAtPoint = scenario.cards
        .filter((card) => card.investigation_point_id === event.pointId)
        .map((card) => card.id)
      const ownedCardIds = cardIdsAtPoint.reduce(addUnique, state.ownedCardIds)

      return {
        ...state,
        investigatedPointIds: addUnique(state.investigatedPointIds, event.pointId),
        ownedCardIds,
      }
    }

    case 'ENTER_RESOLUTION': {
      if (!canEnterResolution(state, scenario)) return state
      // 暗号なしシナリオ(T015, Issue #5)は cipher ステージを飛ばす。
      const hasCipher = scenario.resolution.cipher_stages.length > 0
      return {
        ...state,
        part: 'resolution',
        resolutionStage: hasCipher ? 'cipher' : 'attack_identification',
      }
    }

    case 'SUBMIT_CIPHER_ANSWER': {
      if (state.part !== 'resolution' || state.resolutionStage !== 'cipher') return state
      const [stage] = scenario.resolution.cipher_stages
      const correct = judgeCipherStage(stage, event.answer)
      if (correct) {
        return { ...state, resolutionStage: 'attack_identification' }
      }
      return {
        ...state,
        part: 'follow_up',
        pendingFollowUp: findFollowUp(scenario, 'cipher'),
        resumeStage: 'cipher',
      }
    }

    case 'SUBMIT_ATTACK_IDENTIFICATION': {
      if (state.part !== 'resolution' || state.resolutionStage !== 'attack_identification') {
        return state
      }
      const correct = judgeCardSelection(
        event.cardIds,
        scenario.resolution.attack_identification.required_card_ids,
      )
      if (correct) {
        return { ...state, resolutionStage: 'countermeasure' }
      }
      return {
        ...state,
        part: 'follow_up',
        pendingFollowUp: findFollowUp(scenario, 'attack_identification'),
        resumeStage: 'attack_identification',
      }
    }

    case 'SUBMIT_COUNTERMEASURE': {
      if (state.part !== 'resolution' || state.resolutionStage !== 'countermeasure') return state
      const correct = judgeCardSelection(
        event.cardIds,
        scenario.resolution.countermeasure.required_card_ids,
      )
      if (correct) {
        return { ...state, part: 'clear', resolutionStage: null }
      }
      return {
        ...state,
        part: 'follow_up',
        pendingFollowUp: findFollowUp(scenario, 'countermeasure'),
        resumeStage: 'countermeasure',
      }
    }

    case 'RESUME_FROM_FOLLOW_UP': {
      if (state.part !== 'follow_up' || state.resumeStage === null) return state
      return {
        ...state,
        part: 'resolution',
        resolutionStage: state.resumeStage,
        pendingFollowUp: null,
        resumeStage: null,
      }
    }

    default: {
      const exhaustiveCheck: never = event
      throw new Error(`未対応のイベントです: ${JSON.stringify(exhaustiveCheck)}`)
    }
  }
}
