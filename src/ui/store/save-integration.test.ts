import { describe, expect, it } from 'vitest'

import { SAVE_DATA_SCHEMA_VERSION, type SaveData } from '@/core/model'
import {
  createInitialScenarioState,
  scenarioReducer,
  type ScenarioProgressState,
} from '@/core/scenario'
import { s0SampleFixture } from '@/core/scenario/fixtures/s0-sample.fixture'

import {
  applyClearToSaveData,
  applyProgressToSaveData,
  CLEAR_XP_REWARD,
  computeClearXpReward,
  CONSULT_XP_PENALTY,
  createDefaultSaveData,
  MASTERY_POINTS_PER_TAG,
  WRONG_ANSWER_XP_PENALTY,
} from './save-integration'

function progressAfterInvestigatingOne(): ScenarioProgressState {
  const intro = createInitialScenarioState(s0SampleFixture)
  const exploring = scenarioReducer(s0SampleFixture, intro, { type: 'ADVANCE_INTRO' })
  return scenarioReducer(s0SampleFixture, exploring, {
    type: 'INVESTIGATE',
    pointId: 'ip-proxy-log',
  })
}

describe('createDefaultSaveData', () => {
  it('現行スキーマバージョンで空のセーブデータを作る', () => {
    const save = createDefaultSaveData()
    expect(save.version).toBe(SAVE_DATA_SCHEMA_VERSION)
    expect(save.xp).toBe(0)
    expect(save.owned_card_ids).toEqual([])
    expect(save.scenario_progress).toEqual([])
  })
})

describe('applyProgressToSaveData', () => {
  it('進行中に獲得したカードIDを owned_card_ids へ重複なく合流させる', () => {
    const save = createDefaultSaveData()
    const progress = progressAfterInvestigatingOne()
    const updated = applyProgressToSaveData(save, progress)
    expect(updated.owned_card_ids.slice().sort()).toEqual(
      ['card-proxy-log', 'card-proxy-log-noise'].sort(),
    )
    // クリア済みフラグは変更しない
    expect(updated.scenario_progress).toEqual([])
  })

  it('既存の owned_card_ids と重複しないよう合流する', () => {
    const save: SaveData = { ...createDefaultSaveData(), owned_card_ids: ['card-proxy-log'] }
    const progress = progressAfterInvestigatingOne()
    const updated = applyProgressToSaveData(save, progress)
    expect(updated.owned_card_ids).toHaveLength(2)
  })
})

describe('applyClearToSaveData', () => {
  it('クリア済みフラグと日時を scenario_progress に記録する', () => {
    const save = createDefaultSaveData()
    const progress = progressAfterInvestigatingOne()
    const updated = applyClearToSaveData(
      save,
      s0SampleFixture,
      progress,
      '2026-09-10T00:00:00.000Z',
    )
    expect(updated.scenario_progress).toEqual([
      {
        scenario_id: 's0-sample',
        cleared: true,
        cleared_at: '2026-09-10T00:00:00.000Z',
        no_hint_clear: true,
        wrong_answer_count: 0,
        consult_count: 0,
      },
    ])
  })

  it('同じシナリオを再クリアした場合は scenario_progress を上書きする(重複エントリを作らない)', () => {
    const save = createDefaultSaveData()
    const progress = progressAfterInvestigatingOne()
    const once = applyClearToSaveData(save, s0SampleFixture, progress, '2026-09-10T00:00:00.000Z')
    const twice = applyClearToSaveData(once, s0SampleFixture, progress, '2026-09-11T00:00:00.000Z')
    expect(twice.scenario_progress).toHaveLength(1)
    expect(twice.scenario_progress[0]?.cleared_at).toBe('2026-09-11T00:00:00.000Z')
  })

  // T016(FR-6, Issue #5): クリア時に XP・分野習熟(subject_mastery)が加算されることの回帰確認。
  // 前回の実機確認でクリアしても xp:0・subject_mastery:{} のままだった(加算ロジック未結線)ため、
  // ここで確実に固定する。
  it('クリアで CLEAR_XP_REWARD だけ XP が加算される', () => {
    const save = createDefaultSaveData()
    const progress = progressAfterInvestigatingOne()
    const updated = applyClearToSaveData(save, s0SampleFixture, progress)
    expect(updated.xp).toBe(CLEAR_XP_REWARD)
  })

  it('クリアでシナリオの subject_tags それぞれに MASTERY_POINTS_PER_TAG が加算される', () => {
    const save = createDefaultSaveData()
    const progress = progressAfterInvestigatingOne()
    const updated = applyClearToSaveData(save, s0SampleFixture, progress)
    for (const tag of s0SampleFixture.subject_tags) {
      expect(updated.subject_mastery[tag]).toBe(MASTERY_POINTS_PER_TAG)
    }
  })

  it('再クリアすると XP・分野習熟が積み上がる(重複防止ロジックは持たない)', () => {
    const save = createDefaultSaveData()
    const progress = progressAfterInvestigatingOne()
    const once = applyClearToSaveData(save, s0SampleFixture, progress)
    const twice = applyClearToSaveData(once, s0SampleFixture, progress)
    expect(twice.xp).toBe(CLEAR_XP_REWARD * 2)
    expect(twice.subject_mastery[s0SampleFixture.subject_tags[0]]).toBe(MASTERY_POINTS_PER_TAG * 2)
  })

  it('既存の subject_mastery に加算する(既存分野は上乗せ、新規分野は新設)', () => {
    const save: SaveData = {
      ...createDefaultSaveData(),
      subject_mastery: { 認証: 5 },
    }
    const progress = progressAfterInvestigatingOne()
    const updated = applyClearToSaveData(save, s0SampleFixture, progress)
    expect(updated.subject_mastery['認証']).toBe(5 + MASTERY_POINTS_PER_TAG)
    expect(updated.subject_mastery['法制度']).toBe(MASTERY_POINTS_PER_TAG)
  })
})

// T034(FR-11, spec §8.4): 誤答1回・相談1回ごとに獲得XPを減算する(下限あり)。
describe('computeClearXpReward', () => {
  function progressWith(wrongAttemptsByQuestionId: Record<string, number>, consultsUsed: number) {
    return { ...progressAfterInvestigatingOne(), wrongAttemptsByQuestionId, consultsUsed }
  }

  it('誤答・相談が0回ならCLEAR_XP_REWARDそのままになる', () => {
    expect(computeClearXpReward(progressWith({}, 0))).toBe(CLEAR_XP_REWARD)
  })

  it('誤答1回ごとにWRONG_ANSWER_XP_PENALTYを減算する', () => {
    expect(computeClearXpReward(progressWith({ 'q-1': 2 }, 0))).toBe(
      CLEAR_XP_REWARD - 2 * WRONG_ANSWER_XP_PENALTY,
    )
  })

  it('相談1回ごとにCONSULT_XP_PENALTYを減算する', () => {
    expect(computeClearXpReward(progressWith({}, 3))).toBe(CLEAR_XP_REWARD - 3 * CONSULT_XP_PENALTY)
  })

  it('誤答・相談は合算して減算し、複数の問いの誤答回数も合計する', () => {
    expect(computeClearXpReward(progressWith({ 'q-1': 1, 'q-2': 2 }, 1))).toBe(
      CLEAR_XP_REWARD - 3 * WRONG_ANSWER_XP_PENALTY - 1 * CONSULT_XP_PENALTY,
    )
  })

  it('減算がCLEAR_XP_REWARDを上回っても0未満にはしない(下限)', () => {
    expect(computeClearXpReward(progressWith({ 'q-1': 20 }, 3))).toBe(0)
  })

  // #135受け入れ基準「XPバーの計算とクリア時の獲得XPが同じ関数から出ていて、一致を確認する
  // 単体テストがある」: 解決⑤のXPバー(resolve-xp-bar.tsx)はresolve-screen.tsxが
  // computeClearXpReward(progress)を呼んだ結果をそのまま表示する。applyClearToSaveData も
  // 内部で同じcomputeClearXpReward()を呼ぶため(このファイル冒頭のapplyClearToSaveData実装
  // 参照)、両者は構造的に同じ値になるが、それを固定回帰として明示的に確認する。
  it('クリア時にapplyClearToSaveDataがXPへ加算する量は、computeClearXpRewardの戻り値と一致する(複数の誤答・相談パターンで確認)', () => {
    const cases: [Record<string, number>, number][] = [
      [{}, 0],
      [{ 'q-1': 1 }, 0],
      [{ 'q-1': 2, 'q-2': 1 }, 2],
      [{ 'q-1': 20 }, 3], // 下限0に張り付くケースも含める
    ]
    for (const [wrongAttemptsByQuestionId, consultsUsed] of cases) {
      const progress = progressWith(wrongAttemptsByQuestionId, consultsUsed)
      const expectedXp = computeClearXpReward(progress)

      const before = createDefaultSaveData()
      const after = applyClearToSaveData(before, s0SampleFixture, progress)

      expect(after.xp - before.xp).toBe(expectedXp)
    }
  })
})

describe('applyClearToSaveData の誤答・相談の記録(T034)', () => {
  it('誤答・相談回数ぶんXPを減算し、scenario_progressに回数を記録する', () => {
    const save = createDefaultSaveData()
    const progress = progressWithWrongAndConsult()
    const updated = applyClearToSaveData(save, s0SampleFixture, progress)
    expect(updated.xp).toBe(CLEAR_XP_REWARD - 2 * WRONG_ANSWER_XP_PENALTY - 1 * CONSULT_XP_PENALTY)
    expect(updated.scenario_progress[0]).toMatchObject({
      wrong_answer_count: 2,
      consult_count: 1,
      no_hint_clear: false,
    })
  })

  function progressWithWrongAndConsult() {
    return {
      ...progressAfterInvestigatingOne(),
      wrongAttemptsByQuestionId: { 'q-1': 2 },
      consultsUsed: 1,
    }
  }
})
