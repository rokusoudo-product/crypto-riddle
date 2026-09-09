// src/core/save/migration.ts — SaveData のマイグレーション枠組み(T009、plan.md §6)。
//
// 「スキーマに version を持たせ、マイグレーション関数を最初から用意する」という plan.md §6 の
// 決定に対応する。SAVE_DATA_SCHEMA_VERSION は現状 1 のみ(#3/#5 代表回答時点でセーブ要件が
// 固まっていないため)だが、将来 version を上げる際は MIGRATIONS に `version N -> N+1` の
// 変換関数を1つ追加するだけで済む形にしてある(関数チェーンを version が現行値に達するまで
// 順に適用する)。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { SAVE_DATA_SCHEMA_VERSION, saveDataSchema, type SaveData } from '../model/index.ts'

export class SaveDataMigrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SaveDataMigrationError'
  }
}

/**
 * バージョン N のセーブデータ(未検証の生オブジェクト)を受け取り、バージョン N+1 の
 * 生オブジェクトを返す変換関数。呼び出し側(migrateSaveData)は戻り値の version が
 * 確かに N+1 になっていることを確認する。
 */
export type SaveDataMigration = (data: Record<string, unknown>) => Record<string, unknown>

/**
 * `version` の値 N をキーに、N -> N+1 の変換関数を登録する。
 * 現行 SAVE_DATA_SCHEMA_VERSION=1 のためまだ空だが、v1->v2 が必要になったら
 * `{ 1: (data) => ({ ...data, version: 2, /* 追加フィールドの初期値等 *\/ }) }` のように追加する。
 */
export const MIGRATIONS: Record<number, SaveDataMigration> = {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 生データ(JSON.parse 直後の unknown 等)を、必要なら MIGRATIONS を順に適用したうえで
 * 現行の SaveData スキーマとして検証する。マイグレーション手順が存在しない古いバージョンや、
 * 未知の(現行より新しい)バージョンは SaveDataMigrationError を投げる。
 */
export function migrateSaveData(raw: unknown): SaveData {
  if (!isRecord(raw)) {
    throw new SaveDataMigrationError('セーブデータの形式が不正です(オブジェクトではありません)。')
  }
  if (typeof raw.version !== 'number') {
    throw new SaveDataMigrationError(
      'セーブデータに version フィールドがないか、数値ではありません。',
    )
  }

  let data: Record<string, unknown> = raw
  let version = raw.version as number

  while (version < SAVE_DATA_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version]
    if (!migrate) {
      throw new SaveDataMigrationError(
        `バージョン ${version} から ${SAVE_DATA_SCHEMA_VERSION} へのマイグレーション手順が定義されていません。`,
      )
    }
    const migrated = migrate(data)
    const nextVersion = migrated.version
    if (typeof nextVersion !== 'number' || nextVersion <= version) {
      throw new SaveDataMigrationError(
        `バージョン ${version} のマイグレーション関数が version を正しく増加させていません。`,
      )
    }
    data = migrated
    version = nextVersion
  }

  if (version > SAVE_DATA_SCHEMA_VERSION) {
    throw new SaveDataMigrationError(
      `未知のバージョン(${version})のセーブデータです(現行バージョン: ${SAVE_DATA_SCHEMA_VERSION})。` +
        'アプリのアップデートが必要な可能性があります。',
    )
  }

  const parsed = saveDataSchema.safeParse(data)
  if (!parsed.success) {
    throw new SaveDataMigrationError(
      `マイグレーション後のデータがスキーマ検証に失敗しました: ${parsed.error.message}`,
    )
  }
  return parsed.data
}
