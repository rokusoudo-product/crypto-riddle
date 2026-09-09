// src/core/model — zod スキーマから z.infer で導出した型定義群（T005/T006）。
// core/ 全体はここでエクスポートする型のみを参照し、手書きの重複型を持たない（T006 完了条件）。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
export * from './tags.ts'
export * from './common.ts'
export * from './scenario.ts'
export * from './term-card.ts'
export * from './quiz-misuse.ts'
export * from './legal.ts'
export * from './save-data.ts'
export * from './validate-collection.ts'
