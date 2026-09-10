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
  createDefaultSaveData,
  MASTERY_POINTS_PER_TAG,
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
      { scenario_id: 's0-sample', cleared: true, cleared_at: '2026-09-10T00:00:00.000Z' },
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
