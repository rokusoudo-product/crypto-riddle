// src/core/save — SaveStorage インターフェース・IndexedDB 実装・マイグレーション・
// エクスポート/インポート core ロジック(T009、plan.md §6)。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
export * from './storage.ts'
export * from './migration.ts'
export * from './export-import.ts'
export * from './indexed-db-storage.ts'
