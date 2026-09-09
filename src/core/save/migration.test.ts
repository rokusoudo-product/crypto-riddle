import { describe, expect, it } from 'vitest'

import { SAVE_DATA_SCHEMA_VERSION, type SaveData } from '../model/index.ts'

import { MIGRATIONS, migrateSaveData, SaveDataMigrationError } from './migration.ts'

function validSaveDataV1(): SaveData {
  return {
    version: SAVE_DATA_SCHEMA_VERSION,
    xp: 100,
    scenario_progress: [{ scenario_id: 's0-sample', cleared: true }],
    owned_card_ids: ['card-a', 'card-b'],
    subject_mastery: { 暗号: 5 },
    settings: { bgm_volume: 0.5, se_volume: 0.5, reduce_motion: false },
  }
}

describe('migrateSaveData', () => {
  it('現行バージョンのデータはそのまま検証を通過する', () => {
    const result = migrateSaveData(validSaveDataV1())
    expect(result).toEqual(validSaveDataV1())
  })

  it.each([
    ['オブジェクトでない(文字列)', 'not-an-object'],
    ['オブジェクトでない(null)', null],
    ['オブジェクトでない(配列)', ['a', 'b']],
    ['version フィールドがない', { xp: 0 }],
    ['version が数値でない', { ...validSaveDataV1(), version: '1' }],
  ])('%s の場合は SaveDataMigrationError を投げる', (_label, raw) => {
    expect(() => migrateSaveData(raw)).toThrow(SaveDataMigrationError)
  })

  it('未知の将来バージョンは SaveDataMigrationError を投げる', () => {
    const future = { ...validSaveDataV1(), version: SAVE_DATA_SCHEMA_VERSION + 1 }
    expect(() => migrateSaveData(future)).toThrow(SaveDataMigrationError)
  })

  it('マイグレーション手順が定義されていない古いバージョンは SaveDataMigrationError を投げる', () => {
    // 現行 SAVE_DATA_SCHEMA_VERSION=1 のため、0 は「手順未定義の旧バージョン」を模擬する。
    const old = { ...validSaveDataV1(), version: 0 }
    expect(() => migrateSaveData(old)).toThrow(SaveDataMigrationError)
  })

  it('マイグレーション後もスキーマ検証に失敗するデータは SaveDataMigrationError を投げる', () => {
    const invalid = { ...validSaveDataV1(), xp: -1 }
    expect(() => migrateSaveData(invalid)).toThrow(SaveDataMigrationError)
  })

  describe('マイグレーション関数チェーンの枠組み(将来の version 追加を想定した検証)', () => {
    it('MIGRATIONS に v0->v1 の変換を仮登録すると、v0 のデータが現行版まで変換される', () => {
      // 実運用の MIGRATIONS は空(現行バージョンが1のみのため)だが、将来 v1->v2 等を
      // 追加した際にチェーンが正しく動くことをこのテストで担保しておく。
      const original = { ...MIGRATIONS }
      MIGRATIONS[0] = (data) => ({
        ...data,
        version: 1,
        xp: 0,
        scenario_progress: [],
        owned_card_ids: [],
        subject_mastery: {},
        settings: { bgm_volume: 1, se_volume: 1, reduce_motion: false },
      })
      try {
        const migrated = migrateSaveData({ version: 0 })
        expect(migrated.version).toBe(SAVE_DATA_SCHEMA_VERSION)
        expect(migrated.xp).toBe(0)
      } finally {
        for (const key of Object.keys(MIGRATIONS)) delete MIGRATIONS[Number(key)]
        Object.assign(MIGRATIONS, original)
      }
    })

    it('マイグレーション関数が version を増加させない場合は SaveDataMigrationError を投げる', () => {
      const original = { ...MIGRATIONS }
      MIGRATIONS[0] = (data) => ({ ...data, version: 0 })
      try {
        expect(() => migrateSaveData({ version: 0 })).toThrow(SaveDataMigrationError)
      } finally {
        for (const key of Object.keys(MIGRATIONS)) delete MIGRATIONS[Number(key)]
        Object.assign(MIGRATIONS, original)
      }
    })
  })
})
