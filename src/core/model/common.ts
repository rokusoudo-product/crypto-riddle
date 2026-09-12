// src/core/model/common.ts — シナリオ・用語カード・法制度データが共通で参照する zod スキーマ。
// schemas/*.json（削除済み。#22/#24 PR 参照）の $defs のうち、複数ファイルで共有されていたものを移した。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

/**
 * サポート役キャラの短縮表記。霧島=霧島悠(技術)、橘=橘澪(法務)、小鳥遊=小鳥遊(庶務)。
 * docs/characters.md が正本。小鳥遊は #97 で先行反映済み、zod 側の enum 拡張は #100/#101 で実装
 * （schema_version 0.7.0）。小鳥遊を話者として使える箇所は intro.character_intros と
 * resolution.clear_explanation のみに制限される（探索・解決の会話フレームは2枠のまま。
 * scenario.ts の superRefine による「小鳥遊ガード」参照）。
 */
export const characterSchema = z.enum(['霧島', '橘', '小鳥遊'])
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

/**
 * 台詞の表情差分(DESIGN.md「表情差分の定義表」#97 の5種と一致させる)。schema_version 0.7.0 で新設。
 * 表情差分の絵が未生成でもデータには先に書ける(表示側のフォールバックは DESIGN.md「会話フレーム」節
 * §表情フォールバック参照)。
 */
export const expressionSchema = z.enum(['neutral', 'serious', 'confident', 'smile', 'thinking'])
export type Expression = z.infer<typeof expressionSchema>

/** サポート役キャラの台詞1行。expression(表情、省略可)は schema_version 0.7.0 で追加。 */
export const dialogueLineSchema = z
  .object({
    character: characterSchema,
    line: z.string().min(1),
    expression: expressionSchema.optional(),
  })
  .strict()
export type DialogueLine = z.infer<typeof dialogueLineSchema>

/**
 * NPC(中野・経理部長・サーバ管理者など立ち絵を持たない人物)の直接発話1行。schema_version 0.7.0 で新設。
 * npc は自由記述の名前文字列(characterSchema のような固定 enum ではない)。
 * `collect.dialogue[]` 限定で dialogueLineSchema との union（sceneDialogueLineSchema、scenario.ts）として使う。
 */
export const npcDialogueLineSchema = z
  .object({
    npc: z.string().min(1),
    line: z.string().min(1),
  })
  .strict()
export type NpcDialogueLine = z.infer<typeof npcDialogueLineSchema>

/** 制作ステータス共通スキーマ。省略時は draft 扱い（呼び出し側で .default('draft') する）。 */
export const productionStatusSchema = z.enum(['draft', 'reviewed', 'published'])
export type ProductionStatus = z.infer<typeof productionStatusSchema>
