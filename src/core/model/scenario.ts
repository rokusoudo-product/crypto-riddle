// src/core/model/scenario.ts — シナリオ(1マップ)の zod スキーマ。
//
// 旧 schemas/scenario.schema.json（JSON Schema, 手書き）を出発点に zod へ移行したもの（T005）。
// zod が正本、YAML はオーサリング用の入力形式（plan.md §1/§4）。JSON Schema は削除済み
// （#22/#24 対応 PR 本文に理由を記載）。
//
// 単一シナリオ内で完結する参照整合性（card id 重複禁止・investigation_point_id の実在・
// investigation_point に紐づく card の存在・scenes 内の collect action と investigation_point の
// 1対1対応）は superRefine でここに集約し、旧 scripts/validate_scenarios.py の
// validate_scenario_semantics 相当を zod 側で担保する
// （会話モード（#42/T030）移行後は「問いの正解がちょうど1つ」は questionChoicesSchema の refine 側）。
// ファイル名と id の一致、legal_refs の実在（legal/*.yaml は別ファイルのため cross-file）等、
// 複数ファイルにまたがる整合性チェックは src/core/model/validate-collection.ts に分離する。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

import { characterSchema, dialogueLineSchema, legalRefIdSchema, termIdSchema } from './common.ts'
import { subjectTagSchema } from './tags.ts'
import { uniqueArraySchema } from './util.ts'

// 0.3.0（T030, 2026-09-10, #42/#44）: 解決パート(resolution)を「カード配置＋required_card_ids」方式から
// 「会話の中で問いに2〜3択で答える会話モード」（resolution.questions[]）へ刷新した破壊的変更。
// 旧 attack_identification/countermeasure/wrong_answer_follow_ups は questions[] へ統合して削除した。
// 詳細は spec.md §8・docs/scenario_schema.md §2.4。
// 0.4.0（T037, 2026-09-10, #52/#55）: 探索を「背景シーン＋クリック可能オブジェクト」にする省略可能な
// scenes[] を追加。investigation_points(カードの出所・3系統)は正のまま維持し、scenes は表示層として
// 追加しただけの後方互換な拡張(省略時は一覧表示にフォールバック)。詳細は spec.md §7.1・
// docs/scenario_schema.md §2.5。
export const scenarioSchemaVersionSchema = z.literal('0.4.0')

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

// 出典表記(references)。docs/citation-policy.md §5(#14, 2026-09-10 制定)の表に一本化した(T015)。
// 「過去問と同じような問題は出さない」方針(citation-policy §1)のため、転載・改変フラグは持たない。
// exam/year_jp/season/division/question は「特定の年度・問題」を示す場合のみ埋め、根拠のない値を
// 捏造しない(T015 代表回答)。テーマ知識のみを参考にした場合は material_kind + note のみでよい。
export const referenceExamSchema = z.enum(['SC', 'NW'])
export type ReferenceExam = z.infer<typeof referenceExamSchema>

export const referenceSeasonSchema = z.enum(['春期', '秋期'])
export type ReferenceSeason = z.infer<typeof referenceSeasonSchema>

export const referenceMaterialKindSchema = z.enum(['攻撃手口', '技術要素', '事例類型', '用語'])
export type ReferenceMaterialKind = z.infer<typeof referenceMaterialKindSchema>

export const scenarioReferenceSchema = z
  .object({
    exam: referenceExamSchema.optional(),
    year_jp: z.string().optional(),
    season: referenceSeasonSchema.optional(),
    division: z.string().optional(),
    question: z.string().optional(),
    material_kind: referenceMaterialKindSchema,
    note: z.string().optional(),
  })
  .strict()
export type ScenarioReference = z.infer<typeof scenarioReferenceSchema>

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

// 探索の背景シーン(#52・T037、docs/scenario_schema.md §2.5)。省略可能な表示層。
// investigation_points(カードの出所の正)は変えず、scenes は「背景アセット＋クリック可能な
// ホットスポット」で探索④の見せ方を差し替えるだけの拡張。省略時は一覧表示にフォールバックする。
export const sceneIdSchema = slugIdSchema

/** ホットスポットの対象種別(spec §7.1・DESIGN.md「探索シーン」節でこの4種に固定)。 */
export const hotspotObjectTypeSchema = z.enum(['pc', 'person', 'book', 'device'])
export type HotspotObjectType = z.infer<typeof hotspotObjectTypeSchema>

/** 背景画像に対する相対座標(0〜1)。[x, y] の2要素タプル。 */
export const hotspotPositionSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])
export type HotspotPosition = z.infer<typeof hotspotPositionSchema>

// ホットスポットのアクションは kind を判別子とする discriminated union にする(docs/scenario_schema.md §2.5)。
// - collect: investigation_point_id を参照してカードを獲得する(1オブジェクトが複数ポイントを
//   束ねられる。hotspot→point は 1:N。例: 1台のPCにメールログとEDRの2点)。
// - danger: 電源を落とす等の危険な選択肢。feedback は教育的な台詞のみを返し、ペナルティなし・
//   操作継続可(詰み防止, spec §8.4)。
// - noop: 何も起きない選択肢。
const collectHotspotActionSchema = z
  .object({
    kind: z.literal('collect'),
    investigation_point_id: investigationPointIdSchema,
    label: z.string().min(1),
  })
  .strict()
const dangerHotspotActionSchema = z
  .object({
    kind: z.literal('danger'),
    label: z.string().min(1),
    feedback: z.string().min(1),
  })
  .strict()
const noopHotspotActionSchema = z
  .object({
    kind: z.literal('noop'),
    label: z.string().min(1),
  })
  .strict()
export const hotspotActionSchema = z.discriminatedUnion('kind', [
  collectHotspotActionSchema,
  dangerHotspotActionSchema,
  noopHotspotActionSchema,
])
export type HotspotAction = z.infer<typeof hotspotActionSchema>

export const sceneHotspotSchema = z
  .object({
    object_type: hotspotObjectTypeSchema,
    position: hotspotPositionSchema,
    label: z.string().min(1),
    actions: z.array(hotspotActionSchema).min(1),
  })
  .strict()
export type SceneHotspot = z.infer<typeof sceneHotspotSchema>

export const sceneSchema = z
  .object({
    id: sceneIdSchema,
    title: z.string().min(1),
    // 背景アセットID(DESIGN.md「アセット」節)。image_agent 自作の16:9背景を指す。YAML に
    // パスを直書きしない(docs/scenario_schema.md §2.5)ため、単なる文字列IDとして扱う。
    background: z.string().min(1),
    hotspots: z.array(sceneHotspotSchema).min(1),
  })
  .strict()
export type Scene = z.infer<typeof sceneSchema>

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

/** 会話モードの問いID(#42/T030、docs/scenario_schema.md §2.4)。 */
export const questionIdSchema = slugIdSchema

// 選択肢は is_correct を判別子とする discriminated union にし、正解には任意で選んだ際の一言(reply)を、
// 誤答には理由を添えた返し(reply、「その場合だと〜」spec §8.2)を必須で持たせる。
const correctChoiceSchema = z
  .object({
    text: z.string().min(1),
    is_correct: z.literal(true),
    reply: z.string().min(1).optional(),
  })
  .strict()
const wrongChoiceSchema = z
  .object({
    text: z.string().min(1),
    is_correct: z.literal(false),
    reply: z.string().min(1),
  })
  .strict()
export const questionChoiceSchema = z.discriminatedUnion('is_correct', [
  correctChoiceSchema,
  wrongChoiceSchema,
])
export type QuestionChoice = z.infer<typeof questionChoiceSchema>

// spec §8.2「判断は2択、知識を要する候補は3択」。正解の選択肢はちょうど1つ(#7 維持・単一解厳密一致)。
export const questionChoicesSchema = z
  .array(questionChoiceSchema)
  .min(2)
  .max(3)
  .refine((choices) => choices.filter((c) => c.is_correct).length === 1, {
    message: '選択肢は正解(is_correct: true)がちょうど1つである必要があります。',
  })

export const questionSchema = z
  .object({
    id: questionIdSchema,
    subject_tag: subjectTagSchema,
    speaker: characterSchema,
    prompt: z.string().min(1),
    choices: questionChoicesSchema,
    // 外すたびに深まる段階解説(教育的失敗の会話内統合)。任意・多段。
    explanations: z.array(z.string().min(1)).optional(),
    // 相談(コストあり、マップ単位3回まで。spec §8.4)で提示する詳細ヒント。
    consult_hint: z.string().min(1),
  })
  .strict()
export type Question = z.infer<typeof questionSchema>

export const resolutionSchema = z
  .object({
    // MVP は最大1要素(#3 代表回答)。0件は「暗号なし」の入門シナリオ(S1, Issue #5 代表回答)を許容するため
    // T015 で length(1) から max(1) に緩めた。複数段拡張は max(1) 制約を外すだけで対応できる設計
    // （旧 JSON Schema の minItems/maxItems=1 を引き継いだ制約を、0件許容のぶんだけ緩和したもの）。
    // 0件のときは resolution パートで暗号ステージを飛ばし、探索完了から直接 questions[0] へ進む
    // （src/core/scenario/state.ts の ENTER_RESOLUTION 参照）。
    cipher_stages: z.array(cipherStageSchema).max(1),
    // 会話モード(#42/T030)の問い列。出題順の配列。旧 attack_identification/countermeasure/
    // wrong_answer_follow_ups(required_card_ids 方式)はここへ統合した(docs/scenario_schema.md §2.4)。
    questions: z
      .array(questionSchema)
      .min(1)
      .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, {
        message: 'questions の id が重複しています。',
      }),
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
    // 参照元が無い完全オリジナルのシナリオには表記を付けない(citation-policy §3)ため省略可。
    references: z.array(scenarioReferenceSchema).optional(),
    related_terms: uniqueArraySchema(termIdSchema).optional(),
    intro: introSchema,
    investigation_points: z.array(investigationPointSchema).min(1),
    cards: z.array(cardSchema).min(1),
    // 探索の背景シーン(#52・T037)。省略可能な表示層。省略時は一覧表示にフォールバックし、
    // superRefine の scenes 整合性チェックも行わない(docs/scenario_schema.md §2.5)。
    scenes: z.array(sceneSchema).optional(),
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

  // 旧「4. attack_identification.required_card_ids の実在・非ダミー確認」「5. countermeasure.
  // required_card_ids の実在・非ダミー・type='対策' 確認」(required_card_ids 方式)は、会話モード
  // (#42/T030)で選択肢が自由記述(questionChoiceSchema)になったことに伴い不要になった。
  // 「正解の選択肢がちょうど1つ」の検証は questionChoicesSchema の refine に移した
  // (docs/scenario_schema.md §7.1 の4/5・§2.4 参照)。

  // scenes(#52・T037、docs/scenario_schema.md §2.5)の整合性チェック。scenes 省略時(一覧表示
  // フォールバック)は行わない。
  if (data.scenes) {
    const collectCountByPointId = new Map<string, number>()
    for (const pointId of pointIds) collectCountByPointId.set(pointId, 0)

    data.scenes.forEach((scene, sceneIndex) => {
      scene.hotspots.forEach((hotspot, hotspotIndex) => {
        hotspot.actions.forEach((action, actionIndex) => {
          if (action.kind !== 'collect') return
          if (!pointIds.has(action.investigation_point_id)) {
            ctx.addIssue({
              code: 'custom',
              message: `scene '${scene.id}' の collect action が参照する investigation_point_id '${action.investigation_point_id}' が investigation_points に存在しません。`,
              path: [
                'scenes',
                sceneIndex,
                'hotspots',
                hotspotIndex,
                'actions',
                actionIndex,
                'investigation_point_id',
              ],
            })
            return
          }
          collectCountByPointId.set(
            action.investigation_point_id,
            (collectCountByPointId.get(action.investigation_point_id) ?? 0) + 1,
          )
        })
      })
    })

    data.investigation_points.forEach((point, index) => {
      const count = collectCountByPointId.get(point.id) ?? 0
      if (count !== 1) {
        ctx.addIssue({
          code: 'custom',
          message: `investigation_point '${point.id}' は scenes 内の collect action からちょうど1回参照される必要がありますが、${count}回参照されています。`,
          path: ['investigation_points', index],
        })
      }
    })
  }
})

export type Scenario = z.infer<typeof scenarioSchema>
