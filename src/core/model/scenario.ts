// src/core/model/scenario.ts — シナリオ(1マップ)の zod スキーマ。
//
// 旧 schemas/scenario.schema.json（JSON Schema, 手書き）を出発点に zod へ移行したもの（T005）。
// zod が正本、YAML はオーサリング用の入力形式（plan.md §1/§4）。JSON Schema は削除済み
// （#22/#24 対応 PR 本文に理由を記載）。
//
// 単一シナリオ内で完結する参照整合性（card id 重複禁止・investigation_point_id の実在・
// required_card_ids の実在とダミー/種別チェック）は superRefine でここに集約し、
// 旧 scripts/validate_scenarios.py の validate_scenario_semantics 相当を zod 側で担保する。
// ファイル名と id の一致、legal_refs の実在（legal/*.yaml は別ファイルのため cross-file）等、
// 複数ファイルにまたがる整合性チェックは src/core/model/validate-collection.ts に分離する。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

import { characterSchema, dialogueLineSchema, legalRefIdSchema, termIdSchema } from './common.ts'
import { subjectTagSchema } from './tags.ts'
import { uniqueArraySchema } from './util.ts'

export const scenarioSchemaVersionSchema = z.literal('0.1.0')

/** マップID。ファイル名(拡張子除く)と一致させる（実在チェックは validate-collection.ts）。 */
export const scenarioIdSchema = z.string().regex(/^[a-z][a-z0-9_-]*$/)

export const scenarioStatusSchema = z.enum(['draft', 'reviewed', 'published', 'sample'])

/** spec §7 / DESIGN.md で定義されたカード種別(この7種で固定)。 */
export const cardTypeSchema = z.enum([
  '証言',
  'ログ',
  '通信記録',
  '外部情報',
  '暗号文',
  '鍵',
  '対策',
])
export type CardType = z.infer<typeof cardTypeSchema>

/** spec §7 の調査3系統。 */
export const investigationCategorySchema = z.enum(['ログを見る', '人に聞く', '文献を引く'])
export type InvestigationCategory = z.infer<typeof investigationCategorySchema>

const slugIdSchema = z.string().regex(/^[a-z0-9_-]+$/)

export const investigationPointIdSchema = slugIdSchema
export const cardIdSchema = slugIdSchema
export const cipherStageIdSchema = slugIdSchema

/** 出典表記。IPA過去問由来か創作かを明示する(spec FR-7)。#14 未確定のため緩い構造。 */
export const scenarioSourceSchema = z
  .object({
    type: z.enum(['ipa_sc_am2', 'ipa_sc_pm', 'original', 'other']),
    exam_period: z.string().optional(),
    question_no: z.string().optional(),
    note: z.string().optional(),
  })
  .strict()
export type ScenarioSource = z.infer<typeof scenarioSourceSchema>

export const victimCompanySchema = z
  .object({
    name: z.string().min(1),
    industry: z.string().optional(),
    description: z.string().min(1),
  })
  .strict()

export const introSchema = z
  .object({
    background: z.string().min(1),
    victim_company: victimCompanySchema,
    character_intros: z.array(dialogueLineSchema).min(1),
  })
  .strict()
export type Intro = z.infer<typeof introSchema>

export const investigationPointSchema = z
  .object({
    id: investigationPointIdSchema,
    category: investigationCategorySchema,
    label: z.string().min(1),
    description: z.string().min(1),
  })
  .strict()
export type InvestigationPoint = z.infer<typeof investigationPointSchema>

export const cardSchema = z
  .object({
    id: cardIdSchema,
    type: cardTypeSchema,
    source: z.string().min(1),
    investigation_point_id: investigationPointIdSchema,
    body: z.string().min(1),
    is_dummy: z.boolean(),
    related_terms: uniqueArraySchema(termIdSchema).optional(),
  })
  .strict()
export type Card = z.infer<typeof cardSchema>

// 暗号解読ミニゲーム1段分。MVP は caesar(シーザー暗号)の1種のみ(#3 代表回答)。
// 判別可能 union にしておくことで、将来 base64/xor/hash_match 等を追加する際は
// `method` を判別子とする variant を1個増やして cipherStageSchema の配列に足すだけでよい
// （plan.md §8.1「暗号を複数種・複数段組み合わせる」拡張への対応、T005 の設計要件）。
const caesarCipherStageSchema = z
  .object({
    id: cipherStageIdSchema,
    method: z.literal('caesar'),
    ciphertext: z.string().min(1),
    key: z.string().min(1),
    key_hint: z.string().min(1),
    plaintext: z.string().min(1),
    card_ref: cardIdSchema.optional(),
  })
  .strict()

// 将来の拡張例（未実装。追加する場合はここに variant を足し、下の union に加える):
//   const base64CipherStageSchema = z.object({ id: cipherStageIdSchema, method: z.literal('base64'), ... }).strict()
export const cipherStageSchema = z.discriminatedUnion('method', [caesarCipherStageSchema])
export type CipherStage = z.infer<typeof cipherStageSchema>

export const attackIdentificationSchema = z
  .object({
    required_card_ids: uniqueArraySchema(cardIdSchema, { minItems: 1 }),
    attack_name: z.string().min(1),
    attack_description: z.string().min(1),
  })
  .strict()
export type AttackIdentification = z.infer<typeof attackIdentificationSchema>

export const countermeasureSchema = z
  .object({
    required_card_ids: uniqueArraySchema(cardIdSchema, { minItems: 1 }),
    summary: z.string().min(1),
  })
  .strict()
export type Countermeasure = z.infer<typeof countermeasureSchema>

export const followUpTriggerSchema = z.enum(['cipher', 'attack_identification', 'countermeasure'])

export const followUpSchema = z
  .object({
    trigger: followUpTriggerSchema,
    character: characterSchema,
    line: z.string().min(1),
  })
  .strict()
export type FollowUp = z.infer<typeof followUpSchema>

export const resolutionSchema = z
  .object({
    // MVP は必ず1要素(#3 代表回答)。複数段拡張は maxItems 制約を外すだけで対応できる設計
    // （旧 JSON Schema の minItems/maxItems=1 を length(1) として引き継ぐ）。
    cipher_stages: z.array(cipherStageSchema).length(1),
    attack_identification: attackIdentificationSchema,
    countermeasure: countermeasureSchema,
    wrong_answer_follow_ups: z.array(followUpSchema).min(1),
    clear_explanation: z.array(dialogueLineSchema).min(1),
    legal_refs: uniqueArraySchema(legalRefIdSchema).optional(),
  })
  .strict()
export type Resolution = z.infer<typeof resolutionSchema>

const scenarioObjectSchema = z
  .object({
    schema_version: scenarioSchemaVersionSchema,
    id: scenarioIdSchema,
    title: z.string().min(1),
    status: scenarioStatusSchema.optional(),
    map_order: z.number().int().min(1).optional(),
    subject_tags: uniqueArraySchema(subjectTagSchema, { minItems: 1 }),
    difficulty: z.number().int().min(1).max(5),
    estimated_minutes: z.number().int().min(1).max(60),
    source: scenarioSourceSchema,
    related_terms: uniqueArraySchema(termIdSchema).optional(),
    intro: introSchema,
    investigation_points: z.array(investigationPointSchema).min(1),
    cards: z.array(cardSchema).min(1),
    resolution: resolutionSchema,
  })
  .strict()

/**
 * 単一シナリオ内で完結する参照整合性チェック（旧 validate_scenarios.py の
 * validate_scenario_semantics のうち、ファイル名一致・legal_refs 以外の部分を移植）。
 */
export const scenarioSchema = scenarioObjectSchema.superRefine((data, ctx) => {
  const cardIds = new Map<string, Card>()
  data.cards.forEach((card, index) => {
    if (cardIds.has(card.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `card id 重複: ${card.id}`,
        path: ['cards', index, 'id'],
      })
    } else {
      cardIds.set(card.id, card)
    }
  })

  const pointIds = new Set<string>()
  data.investigation_points.forEach((point, index) => {
    if (pointIds.has(point.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `investigation_point id 重複: ${point.id}`,
        path: ['investigation_points', index, 'id'],
      })
    }
    pointIds.add(point.id)
  })

  const cardsPerPoint = new Map<string, number>()
  for (const pointId of pointIds) cardsPerPoint.set(pointId, 0)
  data.cards.forEach((card, index) => {
    if (!pointIds.has(card.investigation_point_id)) {
      ctx.addIssue({
        code: 'custom',
        message: `card '${card.id}' の investigation_point_id '${card.investigation_point_id}' が investigation_points に存在しません。`,
        path: ['cards', index, 'investigation_point_id'],
      })
    } else {
      cardsPerPoint.set(
        card.investigation_point_id,
        (cardsPerPoint.get(card.investigation_point_id) ?? 0) + 1,
      )
    }
  })
  data.investigation_points.forEach((point, index) => {
    if ((cardsPerPoint.get(point.id) ?? 0) === 0) {
      ctx.addIssue({
        code: 'custom',
        message: `investigation_point '${point.id}' に紐づく card がありません。`,
        path: ['investigation_points', index],
      })
    }
  })

  data.resolution.attack_identification.required_card_ids.forEach((cid, index) => {
    const card = cardIds.get(cid)
    if (!card) {
      ctx.addIssue({
        code: 'custom',
        message: `attack_identification.required_card_ids の '${cid}' が cards に存在しません。`,
        path: ['resolution', 'attack_identification', 'required_card_ids', index],
      })
    } else if (card.is_dummy) {
      ctx.addIssue({
        code: 'custom',
        message: `attack_identification.required_card_ids の '${cid}' はダミーカードです(is_dummy=true)。`,
        path: ['resolution', 'attack_identification', 'required_card_ids', index],
      })
    }
  })

  data.resolution.countermeasure.required_card_ids.forEach((cid, index) => {
    const card = cardIds.get(cid)
    if (!card) {
      ctx.addIssue({
        code: 'custom',
        message: `countermeasure.required_card_ids の '${cid}' が cards に存在しません。`,
        path: ['resolution', 'countermeasure', 'required_card_ids', index],
      })
      return
    }
    if (card.is_dummy) {
      ctx.addIssue({
        code: 'custom',
        message: `countermeasure.required_card_ids の '${cid}' はダミーカードです(is_dummy=true)。`,
        path: ['resolution', 'countermeasure', 'required_card_ids', index],
      })
    }
    if (card.type !== '対策') {
      ctx.addIssue({
        code: 'custom',
        message: `countermeasure.required_card_ids の '${cid}' は type='対策' ではありません(実際: ${card.type})。`,
        path: ['resolution', 'countermeasure', 'required_card_ids', index],
      })
    }
  })
})

export type Scenario = z.infer<typeof scenarioSchema>

/**
 * spec §8.3「本質的でない対策を誤答肢に」を満たしているかの目安（警告のみ、旧スクリプトと同様
 * エラーにはしない）。type='対策' のダミーカードが1件も無い場合に true を返す。
 */
export function hasNoDummyCountermeasure(scenario: Scenario): boolean {
  return !scenario.cards.some((card) => card.type === '対策' && card.is_dummy)
}
