import { describe, expect, it } from 'vitest'

import { SAVE_DATA_SCHEMA_VERSION, saveDataSchema, type SaveData } from './save-data.ts'

function validSaveData(): SaveData {
  return {
    version: SAVE_DATA_SCHEMA_VERSION,
    xp: 120,
    scenario_progress: [{ scenario_id: 's0-sample', cleared: true, no_hint_clear: false }],
    owned_card_ids: ['card-proxy-log', 'card-witness-tanaka'],
    subject_mastery: { 暗号: 3, 認証: 5, ネットワーク基盤: 1 },
    settings: { bgm_volume: 0.8, se_volume: 0.5, reduce_motion: false },
  }
}

describe('saveDataSchema', () => {
  it('正常系: 妥当なセーブデータを受理する', () => {
    expect(saveDataSchema.safeParse(validSaveData()).success).toBe(true)
  })

  it('境界: subject_mastery が空オブジェクト(未記録)でも受理する', () => {
    const save = validSaveData()
    save.subject_mastery = {}
    expect(saveDataSchema.safeParse(save).success).toBe(true)
  })

  it('境界: subject_mastery に7種目(ネットワーク基盤)を含めても受理する(Issue #22)', () => {
    const save = validSaveData()
    save.subject_mastery = { ネットワーク基盤: 10 }
    expect(saveDataSchema.safeParse(save).success).toBe(true)
  })

  it('reject: version が現行値と異なる場合を拒否する(マイグレーション対象)', () => {
    const save = { ...validSaveData(), version: 0 }
    expect(saveDataSchema.safeParse(save).success).toBe(false)
  })

  it('reject: xp が負数の場合を拒否する', () => {
    const save = validSaveData()
    save.xp = -1
    expect(saveDataSchema.safeParse(save).success).toBe(false)
  })

  it('reject: owned_card_ids に重複がある場合を拒否する', () => {
    const save = validSaveData()
    save.owned_card_ids = ['card-a', 'card-a']
    expect(saveDataSchema.safeParse(save).success).toBe(false)
  })

  it('reject: subject_mastery に未知の分野タグを含む場合を拒否する', () => {
    const save = validSaveData()
    // @ts-expect-error 意図的に不正な値を渡す
    save.subject_mastery = { 未知分野: 1 }
    expect(saveDataSchema.safeParse(save).success).toBe(false)
  })

  it('reject: settings.bgm_volume が範囲外(1.5)の場合を拒否する', () => {
    const save = validSaveData()
    save.settings.bgm_volume = 1.5
    expect(saveDataSchema.safeParse(save).success).toBe(false)
  })
})
