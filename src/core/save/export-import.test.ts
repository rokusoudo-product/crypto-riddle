import { describe, expect, it } from 'vitest'

import { SAVE_DATA_SCHEMA_VERSION, type SaveData } from '../model/index.ts'

import { exportSaveData, importSaveData, SaveDataMigrationError } from './export-import.ts'

function sampleSaveData(): SaveData {
  return {
    version: SAVE_DATA_SCHEMA_VERSION,
    xp: 250,
    scenario_progress: [
      { scenario_id: 's0-sample', cleared: true, cleared_at: '2026-09-09T12:00:00.000Z' },
    ],
    owned_card_ids: ['card-proxy-log', 'card-witness-tanaka'],
    subject_mastery: { 暗号: 3, 攻撃手法: 2 },
    settings: { bgm_volume: 0.7, se_volume: 0.6, reduce_motion: true },
  }
}

describe('exportSaveData / importSaveData 往復', () => {
  it('エクスポート結果は自己完結した JSON 文字列であり、インポートすると元のデータに戻る', () => {
    const original = sampleSaveData()
    const json = exportSaveData(original)
    expect(() => JSON.parse(json)).not.toThrow()
    const imported = importSaveData(json)
    expect(imported).toEqual(original)
  })

  it('不正な SaveData(スキーマ違反)はエクスポート時に例外を投げる', () => {
    const invalid = { ...sampleSaveData(), xp: -1 }
    expect(() => exportSaveData(invalid as SaveData)).toThrow()
  })

  it('不正な JSON 文字列のインポートは SaveDataMigrationError を投げる', () => {
    expect(() => importSaveData('{ this is not valid json')).toThrow(SaveDataMigrationError)
  })

  it('スキーマに合わないデータの JSON はインポート時に SaveDataMigrationError を投げる', () => {
    const invalidJson = JSON.stringify({ version: SAVE_DATA_SCHEMA_VERSION, xp: -1 })
    expect(() => importSaveData(invalidJson)).toThrow(SaveDataMigrationError)
  })
})
