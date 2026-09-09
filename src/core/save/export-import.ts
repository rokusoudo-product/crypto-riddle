// src/core/save/export-import.ts — セーブデータのエクスポート/インポート core ロジック(T009、FR-9)。
//
// spec FR-9「セーブデータのエクスポート/インポートができる」(iOS Safari の7日ストレージ削除対策、
// 将来のアカウント同期の布石。plan.md §6)に対応する。ここでは「SaveData を自己完結 JSON として
// 書き出し・読み込み・zod 検証する」core ロジックのみを扱う。ファイル選択・ダウンロード等の
// UI(File System Access API や <input type="file"> 等)は範囲外(T025 で扱う)。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { saveDataSchema, type SaveData } from '../model/index.ts'

import { migrateSaveData, SaveDataMigrationError } from './migration.ts'

export { SaveDataMigrationError } from './migration.ts'

/**
 * SaveData を自己完結 JSON 文字列に書き出す。「アカウント同期時にそのままサーバへ送れる」
 * (plan.md §6)設計方針どおり、追加のラッパー(タイムスタンプ等のメタ情報)は付けない。
 * 書き出し前に zod 検証を行い、不正な SaveData をエクスポートしてしまうことを防ぐ。
 */
export function exportSaveData(data: SaveData): string {
  const parsed = saveDataSchema.parse(data)
  return JSON.stringify(parsed, null, 2)
}

/**
 * エクスポートされた JSON 文字列を読み込み、マイグレーション + zod 検証を経て SaveData を返す。
 * JSON として不正な場合・スキーマ検証に失敗した場合は SaveDataMigrationError を投げる
 * (呼び出し側の UI は catch して「無効なファイルです」等のメッセージを出す想定)。
 */
export function importSaveData(json: string): SaveData {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch (e) {
    throw new SaveDataMigrationError(
      `セーブデータの JSON パースに失敗しました(${(e as Error).message})`,
    )
  }
  return migrateSaveData(raw)
}
