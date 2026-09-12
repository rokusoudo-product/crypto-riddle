// src/core/model/scenario.ts — シナリオ(1マップ)の zod スキーマ。
//
// 旧 schemas/scenario.schema.json（JSON Schema, 手書き）を出発点に zod へ移行したもの（T005）。
// zod が正本、YAML はオーサリング用の入力形式（plan.md §1/§4）。JSON Schema は削除済み
// （#22/#24 対応 PR 本文に理由を記載）。
//
// 単一シナリオ内で完結する参照整合性（card id 重複禁止・investigation_point_id の実在・
// investigation_point に紐づく card の存在・scenes 内の collect action と investigation_point の
// 1対1対応・goto action の scene_id の実在と自シーン参照禁止（T046）は superRefine でここに集約し、旧 scripts/validate_scenarios.py の
// validate_scenario_semantics 相当を zod 側で担保する
// （会話モード（#42/T030）移行後は「問いの正解がちょうど1つ」は questionChoicesSchema の refine 側）。
// ファイル名と id の一致、legal_refs の実在（legal/*.yaml は別ファイルのため cross-file）等、
// 複数ファイルにまたがる整合性チェックは src/core/model/validate-collection.ts に分離する。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

import {
  characterSchema,
  dialogueLineSchema,
  legalRefIdSchema,
  npcDialogueLineSchema,
  termIdSchema,
} from './common.ts'
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
// 0.5.0（T043, 2026-09-11, #52 Phase4.7/#65）: scenes[].hotspots[].actions の collect action に
// 省略可能な line(台詞)・speaker(話者)を追加した後方互換な拡張(danger の feedback と対称)。
// 調査結果を解決パートと同じ会話フレームで台詞提示するための下地。省略時のフォールバック(既定の
// 導入文＋カード本文)の生成は UI 側(T044)の範囲であり、本バージョンは型の追加のみ。詳細は
// docs/scenario_schema.md §2.5。
// 0.6.0（T046, 2026-09-11, #52 Phase4.7 追補）: シーン移動のドアと、系統をまたぐ統合ホットスポットの
// ため、ホットスポットのアクション種別に goto(シーン移動、scene_id で移動先を指定。
// investigation_point は参照しない)を、object_type に door(不可視・ドア用の種別)を、ホットスポットに
// 省略可能な prompt(アクションシート見出し用の挨拶台詞)を追加した後方互換な拡張。goto.scene_id が
// scenes[] に実在し自シーンでないことを superRefine で検証する。データ本体(実際の goto/door/prompt
// の追加)は T046-ui-data の範囲であり、本バージョンは型の追加のみ。詳細は docs/scenario_schema.md §2.5。
// 0.7.0（#100/#101, 2026-09-12）: S1 会話フロー刷新（台本v2.2）に対応する7点の後方互換な拡張。
// (1) characterSchema を3値(霧島/橘/小鳥遊)に拡張(common.ts)。(2) 台詞に expression(表情、省略可)を
// 追加(common.ts)。(3) introSchema.background を省略可にする(ナレーション廃止)。(4) collect action に
// 多ターン dialogue(省略可)を追加。既存の line/speaker は後方互換で残すが、dialogue との併用は
// superRefine で拒否する。(5) NPC 直接発話(npc+line、common.ts の npcDialogueLineSchema)を新設し、
// collect.dialogue[] 限定で dialogueLineSchema との union(sceneDialogueLineSchema)として使う。
// (6) questions[].explanations を array(string | dialogueLineSchema) にする。(7) 小鳥遊は
// intro.character_intros / resolution.clear_explanation でのみ話者にでき、それ以外
// (collect.dialogue[]・questions[].speaker・questions[].explanations)への出現は superRefine で拒否する
// (探索・解決の会話フレームは2枠のままで描画先が無いため)。詳細は docs/scenario_schema.md §2.6。
export const scenarioSchemaVersionSchema = z.literal('0.7.0')

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
    // 0.7.0（#100/#101）でナレーション全廃・完全会話劇化(台本v2.2)に伴い省略可へ緩和。フィールド名は
    // 変えない(scenes[].background=背景アセットIDとは別フィールドであり、そちらは対象外＝引き続き必須)。
    // 省略時も victim_company/character_intros は引き続き必須(docs/scenario_schema.md §2.6)。
    background: z.string().min(1).optional(),
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

/**
 * ホットスポットの対象種別(spec §7.1・DESIGN.md「探索シーン」節でこの5種に固定)。
 * door(T046・0.6.0)はシーン移動用の種別(不可視・□マーカーは共通・aria-label は「〜への扉」)。
 */
export const hotspotObjectTypeSchema = z.enum(['pc', 'person', 'book', 'device', 'door'])
export type HotspotObjectType = z.infer<typeof hotspotObjectTypeSchema>

/** 背景画像に対する相対座標(0〜1)。[x, y] の2要素タプル。 */
export const hotspotPositionSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])
export type HotspotPosition = z.infer<typeof hotspotPositionSchema>

// 探索の collect アクション限定で使う会話行の union(0.7.0・#100/#101、docs/scenario_schema.md §2.6)。
// dialogueLineSchema(character=霧島/橘/小鳥遊のいずれか)と npcDialogueLineSchema(npc=自由記述)の
// どちらかを許容する。intro.character_intros / resolution.clear_explanation / questions[].explanations
// は従来どおり dialogueLineSchema のみ(NPC が出ない型を維持)であり、この union はここでしか使わない。
// 小鳥遊ガード(collect.dialogue[] への小鳥遊出現の禁止)は scenarioSchema の superRefine で検証する
// (union の型だけでは character 別の場所ごとの許可/禁止を表現できないため)。
export const sceneDialogueLineSchema = z.union([dialogueLineSchema, npcDialogueLineSchema])
export type SceneDialogueLine = z.infer<typeof sceneDialogueLineSchema>

// ホットスポットのアクションは kind を判別子とする discriminated union にする(docs/scenario_schema.md §2.5)。
// - collect: investigation_point_id を参照してカードを獲得する(1オブジェクトが複数ポイントを
//   束ねられる。hotspot→point は 1:N。例: 1台のPCにメールログとEDRの2点)。省略可能な
//   line(台詞)・speaker(話者)を持てる(#52 Phase4.7/T043, 0.5.0。danger の feedback と対称)。
//   省略時は既定の導入文＋カード本文へのフォールバック(UI側T044の範囲)。
//   0.7.0（#100/#101）: 多ターンのやり取りを表現する dialogue(省略可・1件以上)を追加。
//   line/speaker は後方互換で残すが、dialogue との併用は superRefine で拒否する(相互排他)。
// - danger: 電源を落とす等の危険な選択肢。feedback は教育的な台詞のみを返し、ペナルティなし・
//   操作継続可(詰み防止, spec §8.4)。
// - noop: 何も起きない選択肢。
// - goto: シーン移動(T046・0.6.0)。scene_id で移動先の scene を指定する。investigation_point は
//   参照しない(カードの出所は investigation_points/collect のみが正)。scene_id の実在・自シーン
//   参照禁止は scenarioSchema の superRefine で検証する(単体の action からは他 scene の情報が
//   見えないため)。
const collectHotspotActionSchema = z
  .object({
    kind: z.literal('collect'),
    investigation_point_id: investigationPointIdSchema,
    label: z.string().min(1),
    // 調査結果を会話フレームで台詞提示するための任意フィールド(#52 Phase4.7/T043)。
    // line: キャラの台詞。speaker: 既存の会話フレームの話者型(characterSchema=霧島/橘/小鳥遊)。
    // 両者は独立して省略可能(line のみ・speaker のみ・両方・両省略のいずれも許容)。
    line: z.string().min(1).optional(),
    speaker: characterSchema.optional(),
    // 多ターンのやり取り(短い「問いかけ」＋間)を表現する任意フィールド(0.7.0・#100/#101)。
    // line/speaker との併用は scenarioSchema の superRefine で拒否する(単体の action の型では
    // フィールド単体の可否しか表現できないため、相関チェックは superRefine 側の責務とする)。
    dialogue: z.array(sceneDialogueLineSchema).min(1).optional(),
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
const gotoHotspotActionSchema = z
  .object({
    kind: z.literal('goto'),
    // 移動先の scene id(sceneIdSchema は本ファイル冒頭側で定義済み)。実在チェック・自シーン参照
    // 禁止は、単体の action からは他 scene の情報が見えないため scenarioSchema の superRefine で行う。
    scene_id: sceneIdSchema,
    label: z.string().min(1),
  })
  .strict()
export const hotspotActionSchema = z.discriminatedUnion('kind', [
  collectHotspotActionSchema,
  dangerHotspotActionSchema,
  noopHotspotActionSchema,
  gotoHotspotActionSchema,
])
export type HotspotAction = z.infer<typeof hotspotActionSchema>

export const sceneHotspotSchema = z
  .object({
    object_type: hotspotObjectTypeSchema,
    position: hotspotPositionSchema,
    label: z.string().min(1),
    // 省略可能な挨拶台詞(T046・0.6.0)。アクションシートの見出しに出す。省略時はラベルのみ。
    // 系統をまたぐ統合ホットスポット(人＋機器を1つに束ねる場合)で使う想定。
    prompt: z.string().min(1).optional(),
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
    // 0.7.0（#100/#101）: 文字列(従来どおり questions[].speaker が話す)と、話者付きオブジェクト
    // (dialogueLineSchema。character は霧島/橘/小鳥遊のいずれかだが、小鳥遊は superRefine で拒否
    // ＝この問い枠で使えるのは霧島/橘のみ)の union 配列にする。S2/S3/SL の既存の文字列配列は
    // 移行不要でそのまま有効。
    explanations: z.array(z.union([z.string().min(1), dialogueLineSchema])).optional(),
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
    const sceneIds = new Set(data.scenes.map((scene) => scene.id))

    data.scenes.forEach((scene, sceneIndex) => {
      scene.hotspots.forEach((hotspot, hotspotIndex) => {
        hotspot.actions.forEach((action, actionIndex) => {
          if (action.kind === 'goto') {
            // goto.scene_id(T046・0.6.0)は scenes[] に実在し、かつ自シーン(移動元と同じ)を
            // 指してはならない(docs/scenario_schema.md §2.5)。
            if (!sceneIds.has(action.scene_id)) {
              ctx.addIssue({
                code: 'custom',
                message: `scene '${scene.id}' の goto action が参照する scene_id '${action.scene_id}' が scenes に存在しません。`,
                path: [
                  'scenes',
                  sceneIndex,
                  'hotspots',
                  hotspotIndex,
                  'actions',
                  actionIndex,
                  'scene_id',
                ],
              })
            } else if (action.scene_id === scene.id) {
              ctx.addIssue({
                code: 'custom',
                message: `scene '${scene.id}' の goto action が自シーン('${action.scene_id}')を参照しています。`,
                path: [
                  'scenes',
                  sceneIndex,
                  'hotspots',
                  hotspotIndex,
                  'actions',
                  actionIndex,
                  'scene_id',
                ],
              })
            }
            return
          }
          if (action.kind !== 'collect') return
          // 0.7.0（#100/#101）: dialogue と line/speaker の併用を拒否する(相互排他)。
          if (action.dialogue && (action.line !== undefined || action.speaker !== undefined)) {
            ctx.addIssue({
              code: 'custom',
              message: `scene '${scene.id}' の collect action で dialogue と line/speaker を併用することはできません(どちらか一方のみ)。`,
              path: [
                'scenes',
                sceneIndex,
                'hotspots',
                hotspotIndex,
                'actions',
                actionIndex,
                'dialogue',
              ],
            })
          }
          // 小鳥遊ガード(docs/scenario_schema.md §2.6): 後方互換の collect.speaker(単発台詞)にも
          // 小鳥遊は使えない。dialogue[] だけを塞いでも、旧形式の speaker 経由で探索に小鳥遊が
          // 入れてしまうため(探索の会話フレームは2枠のままで描画先が無い)。
          if (action.speaker === '小鳥遊') {
            ctx.addIssue({
              code: 'custom',
              message: `scene '${scene.id}' の collect.speaker に小鳥遊は使用できません(探索の会話フレームは2枠のまま)。`,
              path: [
                'scenes',
                sceneIndex,
                'hotspots',
                hotspotIndex,
                'actions',
                actionIndex,
                'speaker',
              ],
            })
          }
          // 小鳥遊ガード(docs/scenario_schema.md §2.6): 探索の collect.dialogue[] に小鳥遊は使えない
          // (character/npc いずれの行としても不可。探索の会話フレームは2枠のままで描画先が無いため)。
          // npc は自由記述だが、npc: '小鳥遊' のように名乗らせるすり抜けも同様に拒否する。
          action.dialogue?.forEach((line, lineIndex) => {
            const isForbiddenCharacterLine = 'character' in line && line.character === '小鳥遊'
            const isForbiddenNpcLine = 'npc' in line && line.npc === '小鳥遊'
            if (isForbiddenCharacterLine || isForbiddenNpcLine) {
              ctx.addIssue({
                code: 'custom',
                message: `scene '${scene.id}' の collect.dialogue に小鳥遊は使用できません(探索の会話フレームは2枠のまま)。`,
                path: [
                  'scenes',
                  sceneIndex,
                  'hotspots',
                  hotspotIndex,
                  'actions',
                  actionIndex,
                  'dialogue',
                  lineIndex,
                  isForbiddenCharacterLine ? 'character' : 'npc',
                ],
              })
            }
          })
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

  // 小鳥遊ガード(docs/scenario_schema.md §2.6): resolution.questions[].speaker /
  // resolution.questions[].explanations には小鳥遊を使えない(intro.character_intros /
  // resolution.clear_explanation の2箇所限定)。
  data.resolution.questions.forEach((question, questionIndex) => {
    if (question.speaker === '小鳥遊') {
      ctx.addIssue({
        code: 'custom',
        message: `question '${question.id}' の speaker に小鳥遊は使用できません(小鳥遊は intro.character_intros と resolution.clear_explanation でのみ話者になれます)。`,
        path: ['resolution', 'questions', questionIndex, 'speaker'],
      })
    }
    question.explanations?.forEach((explanation, explanationIndex) => {
      if (typeof explanation !== 'string' && explanation.character === '小鳥遊') {
        ctx.addIssue({
          code: 'custom',
          message: `question '${question.id}' の explanations に小鳥遊は使用できません(小鳥遊は intro.character_intros と resolution.clear_explanation でのみ話者になれます)。`,
          path: [
            'resolution',
            'questions',
            questionIndex,
            'explanations',
            explanationIndex,
            'character',
          ],
        })
      }
    })
  })
})

export type Scenario = z.infer<typeof scenarioSchema>
