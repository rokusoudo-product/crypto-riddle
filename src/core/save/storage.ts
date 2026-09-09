// src/core/save/storage.ts — SaveStorage インターフェース(T009、plan.md §6)。
//
// Web=IndexedDB(idb)実装(indexed-db-storage.ts)を第一実装とし、フェーズ2の Capacitor
// (Preferences/Filesystem)実装に差し替えられるよう、永続化手段をインターフェースの背後に隠す
// (localStorage 直書き禁止、plan.md §6/tasks.md T009)。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import type { SaveData } from '../model/index.ts'

export interface SaveStorage {
  /** 保存済みのセーブデータを読み込む。未保存の場合は null を返す。 */
  load(): Promise<SaveData | null>
  /** セーブデータを保存する(zod 検証を通過した SaveData のみを受け付ける)。 */
  save(data: SaveData): Promise<void>
  /** 保存済みのセーブデータを削除する(主にテスト・「最初からやり直す」用途)。 */
  clear(): Promise<void>
}
