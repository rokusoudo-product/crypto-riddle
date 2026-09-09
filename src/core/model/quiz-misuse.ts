// src/core/model/quiz-misuse.ts — 誤用検出クイズ(MisuseQuizItem)の zod スキーマ。
// 旧 schemas/quiz_misuse.schema.json（JSON Schema, 手書き）を出発点に zod へ移行したもの（T005）。
// MVP では機能(UI・ゲームロジック)の実装は行わない(Issue #4 代表回答)が、データ構造は zod で確定させる。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

import { productionStatusSchema, termIdSchema } from './common.ts'

export const quizMisuseSchemaVersionSchema = z.literal('0.1.0')

export const quizItemIdSchema = z.string().regex(/^quiz-misuse-[a-z0-9_-]+$/)

export const misuseTypeSchema = z.enum([
  'definition_confusion',
  'term_confusion',
  'scope_error',
  'factual_error',
])
export type MisuseType = z.infer<typeof misuseTypeSchema>

const misuseQuizItemObjectSchema = z
  .object({
    id: quizItemIdSchema,
    term_id: termIdSchema,
    context_text: z.string().min(1),
    speaker: z.string().optional(),
    is_misuse: z.boolean(),
    misuse_type: misuseTypeSchema.optional(),
    confused_with_term_id: termIdSchema.optional(),
    correct_statement: z.string().min(1),
    explanation: z.string().min(1),
    difficulty: z.number().int().min(1).max(5).optional(),
    source_scenario: z.string().optional(),
    status: productionStatusSchema.optional(),
  })
  .strict()

/**
 * is_misuse=true の場合は misuse_type が必須、misuse_type='term_confusion' の場合は
 * confused_with_term_id が必須（旧 JSON Schema の allOf/if-then を superRefine に移植）。
 */
export const misuseQuizItemSchema = misuseQuizItemObjectSchema.superRefine((data, ctx) => {
  if (data.is_misuse && !data.misuse_type) {
    ctx.addIssue({
      code: 'custom',
      message: 'is_misuse=true の場合 misuse_type が必須です。',
      path: ['misuse_type'],
    })
  }
  if (data.misuse_type === 'term_confusion' && !data.confused_with_term_id) {
    ctx.addIssue({
      code: 'custom',
      message: "misuse_type='term_confusion' の場合 confused_with_term_id が必須です。",
      path: ['confused_with_term_id'],
    })
  }
  if (data.confused_with_term_id && data.confused_with_term_id === data.term_id) {
    ctx.addIssue({
      code: 'custom',
      message: 'confused_with_term_id が term_id と同一です（自分自身と混同はしない）。',
      path: ['confused_with_term_id'],
    })
  }
})
export type MisuseQuizItem = z.infer<typeof misuseQuizItemSchema>

/** terms/*quiz*.yaml のファイル全体構造(schema_version + quiz_items 配列)。 */
export const quizMisuseFileSchema = z
  .object({
    schema_version: quizMisuseSchemaVersionSchema,
    quiz_items: z.array(misuseQuizItemSchema).min(1),
  })
  .strict()
export type QuizMisuseFile = z.infer<typeof quizMisuseFileSchema>
