// src/core/scenario/state.ts — シナリオ進行の明示的ステートマシン（T007/T032、plan.md §2）。
//
// 導入→探索→解決(暗号→会話モードの問い列)の進行を、外部ライブラリを使わない reducer 形式の
// 明示的ステートマシンとして実装する(plan.md §1「外部ライブラリ不要」の方針)。
// 状態(ScenarioProgressState)はプレーンな JSON 互換オブジェクトにし、T009(SaveStorage)での
// 永続化・T013(Zustand 接続)へそのまま渡せるようにする(手書きクラス・Map/Set 等は使わない)。
//
// 状態遷移図(概略。#42/T032 で会話モードへ改訂):
//
//   intro --(ADVANCE_INTRO)--> exploration --(ENTER_RESOLUTION, 全ポイント調査済み)--> resolution(cipher|question)
//   exploration --(INVESTIGATE)--> exploration (カード獲得。全ポイント調査済みになるまでループ)
//   resolution(cipher) --(正解)--> resolution(question, questionIndex=0)
//   resolution(cipher) --(誤答)--> resolution(cipher) のまま(lastAnswerFeedback を更新。選択肢が
//     残る会話モードの設計方針(spec §8.2)に合わせ、旧 follow_up パートへは遷移しない)
//   resolution(question) --(正解, 次の問いがある)--> resolution(question, questionIndex+1)
//   resolution(question) --(正解, 最後の問い)--> clear
//   resolution(question) --(誤答)--> resolution(question) のまま。選択肢は残り、
//     wrongAttemptsByQuestionId を+1し、lastAnswerFeedback に reply と段階解説を積む(spec §8.2)
//   resolution(question) --(CONSULT, consultsUsed<3)--> consultsUsed+1(マップ単位。spec §8.4)
//
// 旧 follow_up パート・pendingFollowUp・resumeStage・FollowUp 型は、会話モードでは誤答しても
// 同じ問いに選択肢付きで留まり続ける設計(旧「⑥失敗解説の独立画面」を廃止し会話内へ統合。
// spec §8.2「⑥失敗解説の独立画面は廃止する」)になったことに伴い撤去した(#42/T032)。
//
// T015(Issue #5)で追加: scenario.resolution.cipher_stages が0件の「暗号なし」シナリオ(入門編 S1)では
// ENTER_RESOLUTION が resolution(cipher) をスキップし、直接 resolution(question) へ進む。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { judgeCipherStage, judgeQuestionChoice } from '../judge/index.ts'
import type { Scenario } from '../model/index.ts'

export type ScenarioPart = 'intro' | 'exploration' | 'resolution' | 'clear'

export type ResolutionStage = 'cipher' | 'question'

/** 相談(コストあり)の上限回数。マップ単位(spec §8.4)。zod スキーマには持たせない core 定数。 */
export const MAX_CONSULTS = 3

/**
 * 直近の解答結果のフィードバック(会話モードの「その場合だと〜」返し＋段階解説、spec §8.2)。
 * scenarioSchema には存在しない core 内部の一時的な表示用データ(状態は JSON 互換に保つため
 * オブジェクトリテラルのみで構成する)。次の解答が送られる・次のステージへ進む際に上書き/クリアされる。
 */
export interface AnswerFeedback {
  readonly correct: boolean
  /** 選択した choice の reply(正解 choice の reply は任意項目のため無ければ null)。 */
  readonly reply: string | null
  /** 誤答時、外すたびに深まる段階解説(explanations[min(誤答回数, len-1)])。無ければ null。 */
  readonly explanation: string | null
}

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
  /** resolution(question)中の出題インデックス(scenario.resolution.questions のインデックス)。 */
  readonly questionIndex: number
  /** 問いID -> 誤答回数(段階解説の深さ制御に使う。spec §8.2)。マップ内で保持し続ける。 */
  readonly wrongAttemptsByQuestionId: Readonly<Record<string, number>>
  /** 相談(コストあり)の使用回数。マップ単位で MAX_CONSULTS まで(spec §8.4)。 */
  readonly consultsUsed: number
  /** 直近の解答結果のフィードバック。次の解答/遷移で上書きされる。resolution 以外では null。 */
  readonly lastAnswerFeedback: AnswerFeedback | null
}

export type ScenarioEvent =
  | { type: 'ADVANCE_INTRO' }
  | { type: 'INVESTIGATE'; pointId: string }
  | { type: 'ENTER_RESOLUTION' }
  | { type: 'SUBMIT_CIPHER_ANSWER'; answer: string }
  | { type: 'SUBMIT_QUESTION_ANSWER'; choiceIndex: number }
  | { type: 'CONSULT' }

/** 初期状態を作る。導入(intro)パートから開始する。 */
export function createInitialScenarioState(scenario: Scenario): ScenarioProgressState {
  return {
    scenarioId: scenario.id,
    part: 'intro',
    resolutionStage: null,
    investigatedPointIds: [],
    ownedCardIds: [],
    questionIndex: 0,
    wrongAttemptsByQuestionId: {},
    consultsUsed: 0,
    lastAnswerFeedback: null,
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

/**
 * 誤答時の段階解説を選ぶ(spec §8.2「外すたびに解説が段階的に深くなる」)。
 * `priorWrongAttempts` は今回の誤答より前の誤答回数(初回誤答なら0)。
 * explanations が無い/空なら null(reply のみで表示する、docs/scenario_schema.md §2.4)。
 */
function pickExplanation(
  explanations: readonly string[] | undefined,
  priorWrongAttempts: number,
): string | null {
  if (!explanations || explanations.length === 0) return null
  const index = Math.min(priorWrongAttempts, explanations.length - 1)
  return explanations[index]
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
      // 暗号なしシナリオ(T015, Issue #5)は cipher ステージを飛ばし、直接 question[0] へ進む。
      const hasCipher = scenario.resolution.cipher_stages.length > 0
      return {
        ...state,
        part: 'resolution',
        resolutionStage: hasCipher ? 'cipher' : 'question',
        questionIndex: 0,
        lastAnswerFeedback: null,
      }
    }

    case 'SUBMIT_CIPHER_ANSWER': {
      if (state.part !== 'resolution' || state.resolutionStage !== 'cipher') return state
      const [stage] = scenario.resolution.cipher_stages
      const correct = judgeCipherStage(stage, event.answer)
      if (correct) {
        return {
          ...state,
          resolutionStage: 'question',
          questionIndex: 0,
          lastAnswerFeedback: null,
        }
      }
      // 会話モード(#42)は誤答しても暗号ステージに留まり、選択肢(この場合は入力欄)は残る。
      // cipher は自由記述のため choice 単位の reply/explanation を持たず、正誤のみを表示する。
      return {
        ...state,
        lastAnswerFeedback: { correct: false, reply: null, explanation: null },
      }
    }

    case 'SUBMIT_QUESTION_ANSWER': {
      if (state.part !== 'resolution' || state.resolutionStage !== 'question') return state
      const question = scenario.resolution.questions[state.questionIndex]
      if (!question) return state
      if (event.choiceIndex < 0 || event.choiceIndex >= question.choices.length) return state

      const { correct, choice } = judgeQuestionChoice(question, event.choiceIndex)

      if (correct) {
        const nextIndex = state.questionIndex + 1
        const hasNext = nextIndex < scenario.resolution.questions.length
        return {
          ...state,
          part: hasNext ? 'resolution' : 'clear',
          resolutionStage: hasNext ? 'question' : null,
          questionIndex: hasNext ? nextIndex : state.questionIndex,
          lastAnswerFeedback: {
            correct: true,
            reply: choice.reply ?? null,
            explanation: null,
          },
        }
      }

      const priorAttempts = state.wrongAttemptsByQuestionId[question.id] ?? 0
      return {
        ...state,
        wrongAttemptsByQuestionId: {
          ...state.wrongAttemptsByQuestionId,
          [question.id]: priorAttempts + 1,
        },
        lastAnswerFeedback: {
          correct: false,
          reply: choice.reply ?? null,
          explanation: pickExplanation(question.explanations, priorAttempts),
        },
      }
    }

    case 'CONSULT': {
      if (state.part !== 'resolution' || state.resolutionStage !== 'question') return state
      if (state.consultsUsed >= MAX_CONSULTS) return state
      return { ...state, consultsUsed: state.consultsUsed + 1 }
    }

    default: {
      const exhaustiveCheck: never = event
      throw new Error(`未対応のイベントです: ${JSON.stringify(exhaustiveCheck)}`)
    }
  }
}
