// src/core/model/common.ts — シナリオ・用語カード・法制度データが共通で参照する zod スキーマ。
// schemas/*.json（削除済み。#22/#24 PR 参照）の $defs のうち、複数ファイルで共有されていたものを移した。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

/** サポート役キャラの短縮表記。霧島=霧島悠(技術)、橘=橘澪(法務)。docs/characters.md が正本。 */
export const characterSchema = z.enum(['霧島', '橘'])
export type Character = z.infer<typeof characterSchema>

/** 用語カードマスタ側のID。実在チェックはファイル単位ではなく collection 単位で行う（validate-collection.ts）。 */
export const termIdSchema = z.string().regex(/^term-[a-z0-9_-]+$/, {
  message: 'termId は ^term-[a-z0-9_-]+$ に一致する必要があります。',
})
export type TermId = z.infer<typeof termIdSchema>

/** legal/*.yaml 内の法制度データID(LAW- prefix)。 */
export const legalRefIdSchema = z.string().regex(/^LAW-[A-Z0-9_-]+$/, {
  message: 'legalRefId は ^LAW-[A-Z0-9_-]+$ に一致する必要があります。',
})
export type LegalRefId = z.infer<typeof legalRefIdSchema>

/** サポート役キャラの台詞1行。 */
export const dialogueLineSchema = z
  .object({
    character: characterSchema,
    line: z.string().min(1),
  })
  .strict()
export type DialogueLine = z.infer<typeof dialogueLineSchema>

/** 制作ステータス共通スキーマ。省略時は draft 扱い（呼び出し側で .default('draft') する）。 */
export const productionStatusSchema = z.enum(['draft', 'reviewed', 'published'])
export type ProductionStatus = z.infer<typeof productionStatusSchema>
