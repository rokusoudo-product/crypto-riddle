// src/core/save/indexed-db-storage.ts — SaveStorage の IndexedDB 実装(T009、plan.md §6)。
//
// `idb`(IndexedDB の Promise ラッパー)を使う。localStorage 直書きは禁止(tasks.md T009)。
// セーブデータは1件固定(単一プレイヤー・単一プロファイルの MVP 想定)のため、
// 固定キー(RECORD_KEY)で1レコードのみを読み書きするシンプルな構成にしている。
// 複数プロファイル対応が必要になった場合は、キーをプロファイルIDにする拡張で対応できる。
//
// 注意: ここでの `DB_VERSION` は IndexedDB 自体のスキーマバージョン(オブジェクトストア構成の
// バージョン)であり、SaveData.version(アプリケーションレベルのセーブデータバージョン、
// migration.ts が扱う)とは別物。混同しないこと。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { openDB, type IDBPDatabase } from 'idb'

import { saveDataSchema, type SaveData } from '../model/index.ts'

import { migrateSaveData } from './migration.ts'
import type { SaveStorage } from './storage.ts'

const DB_NAME = 'crypto-riddle-save'
const DB_VERSION = 1
const STORE_NAME = 'save'
const RECORD_KEY = 'current'

function openSaveDb(dbName: string): Promise<IDBPDatabase> {
  return openDB(dbName, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export class IndexedDbSaveStorage implements SaveStorage {
  private readonly openDbFn: () => Promise<IDBPDatabase>

  /**
   * `dbName` はテストで DB を分離したい場合(fake-indexeddb でテストごとに独立させたい等)に
   * 上書きできる(本番は既定の DB_NAME 固定でよい)。
   */
  constructor(dbName: string = DB_NAME) {
    this.openDbFn = () => openSaveDb(dbName)
  }

  async load(): Promise<SaveData | null> {
    const db = await this.openDbFn()
    const raw: unknown = await db.get(STORE_NAME, RECORD_KEY)
    if (raw === undefined) return null
    return migrateSaveData(raw)
  }

  async save(data: SaveData): Promise<void> {
    const parsed = saveDataSchema.parse(data)
    const db = await this.openDbFn()
    await db.put(STORE_NAME, parsed, RECORD_KEY)
  }

  async clear(): Promise<void> {
    const db = await this.openDbFn()
    await db.delete(STORE_NAME, RECORD_KEY)
  }
}
