// src/core/model/term-card.ts — 用語カードマスタ(TermCard)の zod スキーマ。
// 旧 schemas/term_card.schema.json（JSON Schema, 手書き）を出発点に zod へ移行したもの（T005）。
// subject_tags は src/core/model/tags.ts の SUBJECT_TAGS を単一の正本として参照する（Issue #22）。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

import { productionStatusSchema, termIdSchema } from './common.ts'
import { subjectTagSchema } from './tags.ts'
import { uniqueArraySchema } from './util.ts'

export const termCardSchemaVersionSchema = z.literal('0.1.0')

/**
 * IPA試験のシラバス分類との整合(Issue #4 受け入れ基準)。CCSF のテクノロジ系/マネジメント系/
 * ストラテジ系の大分類・中分類に準拠する。
 */
export const syllabusDomainSchema = z.enum(['テクノロジ系', 'マネジメント系', 'ストラテジ系'])

export const syllabusFieldSchema = z.enum([
  '基礎理論',
  'アルゴリズムとプログラミング',
  'コンピュータ構成要素',
  'システム構成要素',
  'ソフトウェア',
  'ハードウェア',
  'ヒューマンインタフェース',
  'マルチメディア',
  'データベース',
  'ネットワーク',
  'セキュリティ',
  'システム開発技術',
  'ソフトウェア開発管理技術',
  'プロジェクトマネジメント',
  'サービスマネジメント',
  'システム監査',
  'システム戦略',
  '経営戦略',
  '企業と法務',
])

export const examRelevanceSchema = z.enum(['SC', 'NW'])

export const syllabusSchema = z
  .object({
    domain: syllabusDomainSchema,
    field: syllabusFieldSchema,
    exam_relevance: uniqueArraySchema(examRelevanceSchema, { minItems: 1 }),
  })
  .strict()
export type Syllabus = z.infer<typeof syllabusSchema>

const termSourceObjectSchema = z
  .object({
    type: z.enum(['ipa_syllabus', 'ipa_exam', 'standard', 'general_knowledge', 'other']),
    exam_period: z.string().optional(),
    question_no: z.string().optional(),
    reference: z.string().optional(),
    note: z.string().optional(),
  })
  .strict()

/**
 * 用語カードの出典。type='ipa_exam' は exam_period/question_no が、type='other' は note が
 * 必須（旧 JSON Schema の allOf/if-then を superRefine に移植）。
 */
export const termSourceSchema = termSourceObjectSchema.superRefine((data, ctx) => {
  if (data.type === 'ipa_exam') {
    if (!data.exam_period) {
      ctx.addIssue({
        code: 'custom',
        message: "type='ipa_exam' には exam_period が必須です。",
        path: ['exam_period'],
      })
    }
    if (!data.question_no) {
      ctx.addIssue({
        code: 'custom',
        message: "type='ipa_exam' には question_no が必須です。",
        path: ['question_no'],
      })
    }
  }
  if (data.type === 'other' && !data.note) {
    ctx.addIssue({ code: 'custom', message: "type='other' には note が必須です。", path: ['note'] })
  }
})
export type TermSource = z.infer<typeof termSourceSchema>

export const termCardSchema = z
  .object({
    id: termIdSchema,
    term: z.string().min(1),
    reading: z.string().min(1),
    aliases: uniqueArraySchema(z.string().min(1)).optional(),
    definition: z.string().min(1).max(400),
    subject_tags: uniqueArraySchema(subjectTagSchema, { minItems: 1 }),
    syllabus: syllabusSchema,
    related_terms: uniqueArraySchema(termIdSchema).optional(),
    source: termSourceSchema,
    status: productionStatusSchema.optional(),
  })
  .strict()
export type TermCard = z.infer<typeof termCardSchema>

/** terms/*.yaml のファイル全体構造(schema_version + terms 配列)。 */
export const termsFileSchema = z
  .object({
    schema_version: termCardSchemaVersionSchema,
    terms: z.array(termCardSchema).min(1),
  })
  .strict()
export type TermsFile = z.infer<typeof termsFileSchema>
