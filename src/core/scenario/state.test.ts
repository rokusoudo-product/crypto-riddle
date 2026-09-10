import { describe, expect, it } from 'vitest'

import type { Scenario } from '../model/index.ts'

import {
  canEnterResolution,
  createInitialScenarioState,
  scenarioReducer,
  type ScenarioProgressState,
} from './state.ts'

/**
 * テスト用の最小シナリオ。src/core/model/scenario.ts の scenarioSchema が要求する
 * 参照整合性(投稿ポイントに紐づくカードが最低1件、required_card_ids の実在等)を満たす。
 * シーザー暗号は shift=3 で "KHOOR" -> "HELLO" に復号できる値にしてある。
 */
function buildScenario(): Scenario {
  return {
    schema_version: '0.2.0',
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
      {
        id: 'card-defense',
        type: '対策',
        source: '情報システム部',
        investigation_point_id: 'ip-2',
        body: '対策カード',
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
      attack_identification: {
        required_card_ids: ['card-a', 'card-b'],
        attack_name: 'テスト攻撃',
        attack_description: '攻撃の説明',
      },
      countermeasure: {
        required_card_ids: ['card-defense'],
        summary: '対策の説明',
      },
      wrong_answer_follow_ups: [
        { trigger: 'cipher', character: '霧島', line: '暗号のフォロー' },
        { trigger: 'attack_identification', character: '霧島', line: '特定のフォロー' },
        { trigger: 'countermeasure', character: '橘', line: '防衛のフォロー' },
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

describe('createInitialScenarioState', () => {
  it('intro パートから開始し、獲得済みカード・調査済みポイントは空である', () => {
    const scenario = buildScenario()
    const state = createInitialScenarioState(scenario)
    expect(state.part).toBe('intro')
    expect(state.resolutionStage).toBeNull()
    expect(state.investigatedPointIds).toEqual([])
    expect(state.ownedCardIds).toEqual([])
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
  it('cipher_stages が0件の場合、resolution(attack_identification) に直接進む', () => {
    const scenario = buildScenario()
    scenario.resolution.cipher_stages = []
    const fullyExplored = stateAfterFullExploration(scenario)
    const resolving = scenarioReducer(scenario, fullyExplored, { type: 'ENTER_RESOLUTION' })
    expect(resolving.part).toBe('resolution')
    expect(resolving.resolutionStage).toBe('attack_identification')
  })
})

describe('解決パート: 正解ルート(暗号 -> 特定 -> 防衛 -> クリア)', () => {
  function stateAtResolution(scenario: Scenario): ScenarioProgressState {
    return scenarioReducer(scenario, stateAfterFullExploration(scenario), {
      type: 'ENTER_RESOLUTION',
    })
  }

  it('暗号の正解で attack_identification ステージに進む', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario)
    const next = scenarioReducer(scenario, resolving, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'hello',
    })
    expect(next.part).toBe('resolution')
    expect(next.resolutionStage).toBe('attack_identification')
  })

  it('攻撃特定の正解で countermeasure ステージに進む', () => {
    const scenario = buildScenario()
    const afterCipher = scenarioReducer(scenario, stateAtResolution(scenario), {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
    const next = scenarioReducer(scenario, afterCipher, {
      type: 'SUBMIT_ATTACK_IDENTIFICATION',
      cardIds: ['card-a', 'card-b'],
    })
    expect(next.resolutionStage).toBe('countermeasure')
  })

  it('防衛策の正解で clear に到達する', () => {
    const scenario = buildScenario()
    const afterCipher = scenarioReducer(scenario, stateAtResolution(scenario), {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
    const afterIdentification = scenarioReducer(scenario, afterCipher, {
      type: 'SUBMIT_ATTACK_IDENTIFICATION',
      cardIds: ['card-a', 'card-b'],
    })
    const cleared = scenarioReducer(scenario, afterIdentification, {
      type: 'SUBMIT_COUNTERMEASURE',
      cardIds: ['card-defense'],
    })
    expect(cleared.part).toBe('clear')
    expect(cleared.resolutionStage).toBeNull()
  })
})

describe('誤答時のフォロー分岐(失敗解説への遷移と「初動をやり直す」復帰)', () => {
  function stateAtResolution(scenario: Scenario): ScenarioProgressState {
    return scenarioReducer(scenario, stateAfterFullExploration(scenario), {
      type: 'ENTER_RESOLUTION',
    })
  }

  it('暗号の誤答で follow_up に遷移し、該当キャラの台詞を保持する', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario)
    const failed = scenarioReducer(scenario, resolving, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'まちがい',
    })
    expect(failed.part).toBe('follow_up')
    expect(failed.pendingFollowUp).toEqual({
      trigger: 'cipher',
      character: '霧島',
      line: '暗号のフォロー',
    })
    expect(failed.resumeStage).toBe('cipher')
  })

  it('RESUME_FROM_FOLLOW_UP で誤答したステージ(cipher)に復帰し、resolution が続けられる', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario)
    const failed = scenarioReducer(scenario, resolving, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'まちがい',
    })
    const resumed = scenarioReducer(scenario, failed, { type: 'RESUME_FROM_FOLLOW_UP' })
    expect(resumed.part).toBe('resolution')
    expect(resumed.resolutionStage).toBe('cipher')
    expect(resumed.pendingFollowUp).toBeNull()
    expect(resumed.resumeStage).toBeNull()

    // 復帰後、正しい答えを送れば通常どおり次ステージに進める。
    const succeeded = scenarioReducer(scenario, resumed, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
    expect(succeeded.resolutionStage).toBe('attack_identification')
  })

  it('攻撃特定の誤答(ダミーカード混入)で follow_up(attack_identification)に遷移する', () => {
    const scenario = buildScenario()
    const afterCipher = scenarioReducer(scenario, stateAtResolution(scenario), {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
    const failed = scenarioReducer(scenario, afterCipher, {
      type: 'SUBMIT_ATTACK_IDENTIFICATION',
      cardIds: ['card-a', 'card-dummy'],
    })
    expect(failed.part).toBe('follow_up')
    expect(failed.pendingFollowUp?.trigger).toBe('attack_identification')
    expect(failed.resumeStage).toBe('attack_identification')
  })

  it('防衛策の誤答で follow_up(countermeasure)に遷移し、復帰後に再提出してクリアできる', () => {
    const scenario = buildScenario()
    const afterCipher = scenarioReducer(scenario, stateAtResolution(scenario), {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'HELLO',
    })
    const afterIdentification = scenarioReducer(scenario, afterCipher, {
      type: 'SUBMIT_ATTACK_IDENTIFICATION',
      cardIds: ['card-a', 'card-b'],
    })
    const failed = scenarioReducer(scenario, afterIdentification, {
      type: 'SUBMIT_COUNTERMEASURE',
      cardIds: [],
    })
    expect(failed.part).toBe('follow_up')
    expect(failed.pendingFollowUp?.trigger).toBe('countermeasure')

    const resumed = scenarioReducer(scenario, failed, { type: 'RESUME_FROM_FOLLOW_UP' })
    expect(resumed.resolutionStage).toBe('countermeasure')

    const cleared = scenarioReducer(scenario, resumed, {
      type: 'SUBMIT_COUNTERMEASURE',
      cardIds: ['card-defense'],
    })
    expect(cleared.part).toBe('clear')
  })

  it('follow_up 以外の状態で RESUME_FROM_FOLLOW_UP を送っても状態は変化しない', () => {
    const scenario = buildScenario()
    const resolving = stateAtResolution(scenario)
    const noop = scenarioReducer(scenario, resolving, { type: 'RESUME_FROM_FOLLOW_UP' })
    expect(noop).toBe(resolving)
  })
})
