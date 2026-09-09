// src/core/model/tags.ts — 分野タグ（subject_tags）の唯一の正本。
//
// 背景（Issue #22）: schemas/scenario.schema.json（6種）と schemas/term_card.schema.json（7種）
// が別々に手書きされ値集合が分裂していた。代表承認（案2・2026-09-09）により7種に統一し、
// シナリオ・用語カード・SaveData（分野習熟）のすべてがこの配列を単一の参照点として import する。
// spec.md §9 も本決定に合わせて更新済み。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

export const SUBJECT_TAGS = [
  '暗号',
  '認証',
  'Web',
  '攻撃手法',
  'インシデント対応',
  '法制度',
  'ネットワーク基盤',
] as const

export const subjectTagSchema = z.enum(SUBJECT_TAGS)

export type SubjectTag = z.infer<typeof subjectTagSchema>
