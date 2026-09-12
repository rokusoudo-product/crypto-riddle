import { describe, expect, it } from 'vitest'

import type { Scenario } from '../model/index.ts'

import {
  MAX_CONSULTS,
  canEnterResolution,
  createInitialScenarioState,
  scenarioReducer,
  type ScenarioProgressState,
} from './state.ts'

/**
 * テスト用の最小シナリオ(会話モード, #42/T032)。src/core/model/scenario.ts の scenarioSchema が
 * 要求する参照整合性(投稿ポイントに紐づくカードが最低1件等)を満たす。
 * シーザー暗号は shift=3 で "KHOOR" -> "HELLO" に復号できる値にしてある。
 * questions は spec §8.5 の「攻撃の起点 → 初動対応」2問構成を模す。
 */
function buildScenario(): Scenario {
  return {
    schema_version: '0.7.0',
    id: 'test-scenario',
    title: 'テストシナリオ',
    subject_tags: ['ネットワーク基盤'],
    difficulty: 1,
    estimated_minutes: 10,
    intro: {
      background: '背景',
      victim_company: { name: '被害企業', description: '説明' },
      character_intros: [{ character: '霧島', line: '導入台詞' }],
    },
    investigation_points: [
      { id: 'ip-1', category: 'ログを見る', label: 'ログ', description: 'ログを見る' },
      { id: 'ip-2', category: '人に聞く', label: '証言', description: '人に聞く' },
    ],
    cards: [
      {
        id: 'card-a',
        type: 'ログ',
        source: 'サーバ',
        investigation_point_id: 'ip-1',
        body: 'カードA',
        is_dummy: false,
      },
      {
        id: 'card-dummy',
        type: 'ログ',
        source: 'サーバ',
        investigation_point_id: 'ip-1',
        body: 'ダミーカード',
        is_dummy: true,
      },
      {
        id: 'card-b',
        type: '証言',
        source: '関係者',
        investigation_point_id: 'ip-2',
        body: 'カードB',
        is_dummy: false,
      },
    ],
    resolution: {
      cipher_stages: [
        {
          id: 'cs-1',
          method: 'caesar',
          ciphertext: 'KHOOR',
          key: '3',
          key_hint: 'ヒント',
          plaintext: 'HELLO',
        },
      ],
      questions: [
        {
          id: 'q-entry-point',
          subject_tag: '攻撃手法',
          speaker: '霧島',
          prompt: 'どこから入られたと見る？',
          choices: [
            { text: '正解の起点', is_correct: true },
            {
              text: '誤りの起点A',
              is_correct: false,
              reply: '一次解説: それは違う。',
            },
            {
              text: '誤りの起点B',
              is_correct: false,
              reply: '再誤答の返し。',
            },
          ],
          explanations: ['一段目の解説。', '二段目の解説。'],
          consult_hint: '起点に関する詳細ヒント',
        },
        {
          id: 'q-initial-response',
          subject_tag: 'インシデント対応',
          speaker: '橘',
          prompt: '初動はどうする？',
          choices: [
            { text: '正しい初動', is_correct: true, reply: 'その通りです。' },
            { text: '誤った初動', is_correct: false, reply: 'それでは証拠が消えます。' },
          ],
          consult_hint: '初動に関する詳細ヒント',
        },
      ],
      clear_explanation: [{ character: '霧島', line: 'クリア解説' }],
    },
  }
}

/** 探索を完了(全ポイント調査済み)させた状態を作るヘルパ。 */
function stateAfterFullExploration(scenario: Scenario): ScenarioProgressState {
  let state = createInitialScenarioState(scenario)
  state = scenarioReducer(scenario, state, { type: 'ADVANCE_INTRO' })
  for (const point of scenario.investigation_points) {
    state = scenarioReducer(scenario, state, { type: 'INVESTIGATE', pointId: point.id })
  }
  return state
}

function stateAtResolution(scenario: Scenario): ScenarioProgressState {
  return scenarioReducer(scenario, stateAfterFullExploration(scenario), {
    type: 'ENTER_RESOLUTION',
  })
}

describe('createInitialScenarioState', () => {
  it('intro パートから開始し、獲得済みカード・調査済みポイント・相談回数は空/0である', () => {
    const scenario = buildScenario()
    const state = createInitialScenarioState(scenario)
    expect(state.part).toBe('intro')
    expect(state.resolutionStage).toBeNull()
    expect(state.investigatedPointIds).toEqual([])
    expect(state.ownedCardIds).toEqual([])
    expect(state.questionIndex).toBe(0)
    expect(state.wrongAttemptsByQuestionId).toEqual({})
    expect(state.consultsUsed).toBe(0)
    expect(state.lastAnswerFeedback).toBeNull()
  })
})

describe('パート遷移(intro -> exploration)', () => {
  it('ADVANCE_INTRO で exploration に進む', () => {
    const scenario = buildScenario()
    const state = createInitialScenarioState(scenario)
    const next = scenarioReducer(scenario, state, { type: 'ADVANCE_INTRO' })
    expect(next.part).toBe('exploration')
  })

  it('intro 以外の状態で ADVANCE_INTRO を送っても状態は変化しない', () => {
    const scenario = buildScenario()
    const exploring = scenarioReducer(scenario, createInitialScenarioState(scenario), {
      type: 'ADVANCE_INTRO',
    })
    const noop = scenarioReducer(scenario, exploring, { type: 'ADVANCE_INTRO' })
    expect(noop).toBe(exploring)
  })
})

describe('カード獲得(探索)', () => {
  it('INVESTIGATE で該当ポイントのカードを獲得する(ダミーカードも含む)', () => {
    const scenario = buildScenario()
    const state = scenarioReducer(scenario, createInitialScenarioState(scenario), {
      type: 'ADVANCE_INTRO',
    })
    const next = scenarioReducer(scenario, state, { type: 'INVESTIGATE', pointId: 'ip-1' })
    expect(next.investigatedPointIds).toEqual(['ip-1'])
    expect(next.ownedCardIds.slice().sort()).toEqual(['card-a', 'card-dummy'])
  })

  it('同じポイントを2回調査しても状態は変化しない(冪等)', () => {
    const scenario = buildScenario()
    const exploring = scenarioReducer(scenario, createInitialScenarioState(scenario), {
      type: 'ADVANCE_INTRO',
    })
    const once = scenarioReducer(scenario, exploring, { type: 'INVESTIGATE', pointId: 'ip-1' })
    const twice = scenarioReducer(scenario, once, { type: 'INVESTIGATE', pointId: 'ip-1' })
    expect(twice).toBe(once)
  })

  it('存在しない investigation_point_id を送っても状態は変化しない', () => {
    const scenario = buildScenario()
    const exploring = scenarioReducer(scenario, createInitialScenarioState(scenario), {
      type: 'ADVANCE_INTRO',
    })
    const noop = scenarioReducer(scenario, exploring, {
      type: 'INVESTIGATE',
      pointId: 'not-exist',
    })
    expect(noop).toBe(exploring)
  })

  it('exploration 以外(intro)で INVESTIGATE を送っても状態は変化しない', () => {
    const scenario = buildScenario()
    const intro = createInitialScenarioState(scenario)
    const noop = scenarioReducer(scenario, intro, { type: 'INVESTIGATE', pointId: 'ip-1' })
    expect(noop).toBe(intro)
  })
})

describe('canEnterResolution / ENTER_RESOLUTION(解決パートへの遷移条件)', () => {
  it('一部のポイントしか調査していない場合は解決パートに進めない', () => {
    const scenario = buildScenario()
    const exploring = scenarioReducer(scenario, createInitialScenarioState(scenario), {
      type: 'ADVANCE_INTRO',
    })
    const partial = scenarioReducer(scenario, exploring, {
      type: 'INVESTIGATE',
      pointId: 'ip-1',
    })
    expect(canEnterResolution(partial, scenario)).toBe(false)
    const noop = scenarioReducer(scenario, partial, { type: 'ENTER_RESOLUTION' })
    expect(noop).toBe(partial)
  })

  it('全ポイントを調査すると解決パート(暗号ステージ)に進める', () => {
    const scenario = buildScenario()
    const fullyExplored = stateAfterFullExploration(scenario)
    expect(canEnterResolution(fullyExplored, scenario)).toBe(true)
    const resolving = scenarioReducer(scenario, fullyExplored, { type: 'ENTER_RESOLUTION' })
    expect(resolving.part).toBe('resolution')
    expect(resolving.resolutionStage).toBe('cipher')
  })
})

describe('ENTER_RESOLUTION: 暗号なしシナリオ(Issue #5, T015)は cipher ステージを飛ばす', () => {
  it('cipher_stages が0件の場合、resolution(question, questionIndex=0) に直接進む', () => {
    const scenario = buildScenario()
    scenario.resolution.cipher_stages = []
    const fullyExplored = stateAfterFullExploration(scenario)
    const resolving = scenarioReducer(scenario, fullyExplored, { type: 'ENTER_RESOLUTION' })
    expect(resolving.part).toBe('resolution')
    expect(resolving.resolutionStage).toBe('question')
    expect(resolving.questionIndex).toBe(0)
  })
})

describe('解決パート: 暗号ステージ', () => {
  it('暗号の正解で question ステージ(questionIndex=0)に進む', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario)
    const next = scenarioReducer(scenario, resolving, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'hello',
    })
    expect(next.part).toBe('resolution')
    expect(next.resolutionStage).toBe('question')
    expect(next.questionIndex).toBe(0)
  })

  it('暗号の誤答では cipher ステージのまま、lastAnswerFeedback に不正解が記録される(旧follow_upへは遷移しない)', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario)
    const failed = scenarioReducer(scenario, resolving, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'まちがい',
    })
    expect(failed.part).toBe('resolution')
    expect(failed.resolutionStage).toBe('cipher')
    expect(failed.lastAnswerFeedback).toEqual({ correct: false, reply: null, explanation: null })

    // 誤答後も再挑戦でき、正しい答えを送れば通常どおり次ステージに進める。
    const succeeded = scenarioReducer(scenario, failed, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
    expect(succeeded.resolutionStage).toBe('question')
  })
})

describe('解決パート: 問い(questions)の出題順・誤答再挑戦・クリア', () => {
  function stateAtFirstQuestion(scenario: Scenario): ScenarioProgressState {
    return scenarioReducer(scenario, stateAtResolution(scenario), {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
  }

  it('1問目に正解すると2問目(questionIndex=1)に進む', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const next = scenarioReducer(scenario, q1, { type: 'SUBMIT_QUESTION_ANSWER', choiceIndex: 0 })
    expect(next.part).toBe('resolution')
    expect(next.resolutionStage).toBe('question')
    expect(next.questionIndex).toBe(1)
    expect(next.lastAnswerFeedback).toEqual({ correct: true, reply: null, explanation: null })
  })

  it('最後の問いに正解すると clear に到達する', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const q2 = scenarioReducer(scenario, q1, { type: 'SUBMIT_QUESTION_ANSWER', choiceIndex: 0 })
    const cleared = scenarioReducer(scenario, q2, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 0,
    })
    expect(cleared.part).toBe('clear')
    expect(cleared.resolutionStage).toBeNull()
    expect(cleared.lastAnswerFeedback).toEqual({
      correct: true,
      reply: 'その通りです。',
      explanation: null,
    })
  })

  it('誤答しても選択肢は残ったまま(同じ questionIndex)で、reply が返る', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const failed = scenarioReducer(scenario, q1, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 1,
    })
    expect(failed.part).toBe('resolution')
    expect(failed.resolutionStage).toBe('question')
    expect(failed.questionIndex).toBe(0)
    expect(failed.wrongAttemptsByQuestionId['q-entry-point']).toBe(1)
    expect(failed.lastAnswerFeedback).toEqual({
      correct: false,
      reply: '一次解説: それは違う。',
      explanation: '一段目の解説。',
    })
  })

  it('外すたびに解説が段階的に深くなる(explanations[min(誤答回数, len-1)])', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const firstMiss = scenarioReducer(scenario, q1, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 1,
    })
    expect(firstMiss.lastAnswerFeedback?.explanation).toBe('一段目の解説。')

    const secondMiss = scenarioReducer(scenario, firstMiss, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 2,
    })
    expect(secondMiss.wrongAttemptsByQuestionId['q-entry-point']).toBe(2)
    expect(secondMiss.lastAnswerFeedback?.explanation).toBe('二段目の解説。')

    // explanations は2段までしかないため、3回目以降も最後の段を使い続ける(len-1でクランプ)。
    const thirdMiss = scenarioReducer(scenario, secondMiss, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 1,
    })
    expect(thirdMiss.wrongAttemptsByQuestionId['q-entry-point']).toBe(3)
    expect(thirdMiss.lastAnswerFeedback?.explanation).toBe('二段目の解説。')
  })

  it('explanations が無い問いの誤答は reply のみで explanation は null になる', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const q2 = scenarioReducer(scenario, q1, { type: 'SUBMIT_QUESTION_ANSWER', choiceIndex: 0 })
    const failed = scenarioReducer(scenario, q2, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 1,
    })
    expect(failed.lastAnswerFeedback).toEqual({
      correct: false,
      reply: 'それでは証拠が消えます。',
      explanation: null,
    })
  })

  // schema_version 0.7.0(#100/#101): explanations は string | DialogueLine の union 配列になった。
  // pickExplanation はオブジェクト要素から line(台詞本文)のみを取り出す(話者表示は UI #102 の範囲)。
  it('explanations に話者付きオブジェクトが含まれる場合、line のみを explanation として返す', () => {
    const scenario = buildScenario()
    scenario.resolution.questions[0].explanations = [
      '一段目の解説。',
      { character: '橘', line: '保全の観点から見ても、まず一次情報を疑うのが筋よ。' },
    ]
    const q1 = stateAtFirstQuestion(scenario)
    const firstMiss = scenarioReducer(scenario, q1, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 1,
    })
    expect(firstMiss.lastAnswerFeedback?.explanation).toBe('一段目の解説。')

    const secondMiss = scenarioReducer(scenario, firstMiss, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 2,
    })
    expect(secondMiss.lastAnswerFeedback?.explanation).toBe(
      '保全の観点から見ても、まず一次情報を疑うのが筋よ。',
    )
  })

  it('resolution(question) 以外で SUBMIT_QUESTION_ANSWER を送っても状態は変化しない', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario) // まだ cipher ステージ
    const noop = scenarioReducer(scenario, resolving, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 0,
    })
    expect(noop).toBe(resolving)
  })

  it('範囲外の choiceIndex を送っても状態は変化しない', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const noop = scenarioReducer(scenario, q1, { type: 'SUBMIT_QUESTION_ANSWER', choiceIndex: 99 })
    expect(noop).toBe(q1)
  })
})

describe('相談(CONSULT, spec §8.4)', () => {
  function stateAtFirstQuestion(scenario: Scenario): ScenarioProgressState {
    return scenarioReducer(scenario, stateAtResolution(scenario), {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
  }

  it('CONSULT のたびに consultsUsed が増える', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const once = scenarioReducer(scenario, q1, { type: 'CONSULT' })
    expect(once.consultsUsed).toBe(1)
    const twice = scenarioReducer(scenario, once, { type: 'CONSULT' })
    expect(twice.consultsUsed).toBe(2)
  })

  it(`マップ単位で${MAX_CONSULTS}回に達すると以降は no-op になる(2問×3回で実質無制限にしない)`, () => {
    const scenario = buildScenario()
    let state = stateAtFirstQuestion(scenario)
    for (let i = 0; i < MAX_CONSULTS; i++) {
      state = scenarioReducer(scenario, state, { type: 'CONSULT' })
    }
    expect(state.consultsUsed).toBe(MAX_CONSULTS)

    const noop = scenarioReducer(scenario, state, { type: 'CONSULT' })
    expect(noop).toBe(state)
  })

  it('2問目に進んでも相談回数はマップ単位でリセットされない', () => {
    const scenario = buildScenario()
    const q1 = stateAtFirstQuestion(scenario)
    const consulted = scenarioReducer(scenario, q1, { type: 'CONSULT' })
    const q2 = scenarioReducer(scenario, consulted, {
      type: 'SUBMIT_QUESTION_ANSWER',
      choiceIndex: 0,
    })
    expect(q2.questionIndex).toBe(1)
    expect(q2.consultsUsed).toBe(1)
  })

  it('resolution(question) 以外(cipher)で CONSULT を送っても状態は変化しない', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario)
    const noop = scenarioReducer(scenario, resolving, { type: 'CONSULT' })
    expect(noop).toBe(resolving)
  })
})
