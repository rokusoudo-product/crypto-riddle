// src/core/model/legal.ts — 法制度データ(LawEntry)の zod スキーマ。
// 旧 schemas/legal.schema.json（JSON Schema, 手書き）を出発点に zod へ移行したもの（T005）。
// 条文番号・報告期限等、改正で変わりうるデータをシナリオ本体から分離する（plan.md §4）。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

import { legalRefIdSchema } from './common.ts'

export const legalSchemaVersionSchema = z.literal('0.1.0')

export const lawEntrySchema = z
  .object({
    id: legalRefIdSchema,
    law_name: z.string().min(1),
    article: z.string().min(1),
    title: z.string().min(1),
    report_deadline: z.string().min(1),
    summary: z.string().min(1),
    last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source_url: z.url().optional(),
  })
  .strict()
export type LawEntry = z.infer<typeof lawEntrySchema>

/** legal/*.yaml のファイル全体構造(schema_version + laws 配列)。 */
export const legalFileSchema = z
  .object({
    schema_version: legalSchemaVersionSchema,
    laws: z.array(lawEntrySchema).min(1),
  })
  .strict()
export type LegalFile = z.infer<typeof legalFileSchema>
