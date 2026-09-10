// src/core/model/save-data.ts — SaveData(セーブデータ)の zod スキーマ。
// plan.md §5(データモデル概要)・§6(セーブ設計)に対応する。実際の SaveStorage 実装(IndexedDB・
// マイグレーション関数本体)は T009 で行う。ここでは「version を持つ自己完結 JSON」というスキーマの
// 骨格のみを定義し、T009 のマイグレーション関数が拠り所にする型を提供する。
// 分野習熟(subject_mastery)は src/core/model/tags.ts の SUBJECT_TAGS を単一の正本として参照する
// （Issue #22 により7種に統一）。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

import { scenarioIdSchema } from './scenario.ts'
import { subjectTagSchema } from './tags.ts'
import { uniqueArraySchema } from './util.ts'

/** 現行のセーブデータスキーマバージョン。破壊的変更時にインクリメントし、T009 でマイグレーションする。 */
export const SAVE_DATA_SCHEMA_VERSION = 1

const cardIdSchema = z.string().regex(/^[a-z0-9_-]+$/)

export const scenarioProgressSchema = z
  .object({
    scenario_id: scenarioIdSchema,
    cleared: z.boolean(),
    cleared_at: z.iso.datetime().optional(),
    no_hint_clear: z.boolean().optional(),
    // 2026-09-10(#45/T034): 会話モード(spec §8.4)の誤答・相談回数を記録する。
    // 追加フィールドのみ(strict object へ optional 追加)のため SAVE_DATA_SCHEMA_VERSION は
    // 据え置く(旧セーブデータにフィールドが無くても optional のため検証を通る、後方互換)。
    /** クリア時点までの誤答回数の合計(questions 全体, spec §8.4「誤答1回ごとにXP減算」)。 */
    wrong_answer_count: z.number().int().min(0).optional(),
    /** クリア時点までの相談使用回数(マップ単位, MAX_CONSULTS=3, spec §8.4)。 */
    consult_count: z.number().int().min(0).optional(),
  })
  .strict()
export type ScenarioProgress = z.infer<typeof scenarioProgressSchema>

/** 分野別習熟度(spec §9)。キーは7種の分野タグ、値は蓄積ポイント。未記録分野は0扱いのため partial。 */
export const subjectMasterySchema = z.partialRecord(subjectTagSchema, z.number().int().min(0))
export type SubjectMastery = z.infer<typeof subjectMasterySchema>

export const saveDataSettingsSchema = z
  .object({
    bgm_volume: z.number().min(0).max(1),
    se_volume: z.number().min(0).max(1),
    reduce_motion: z.boolean(),
  })
  .strict()
export type SaveDataSettings = z.infer<typeof saveDataSettingsSchema>

export const saveDataSchema = z
  .object({
    version: z.literal(SAVE_DATA_SCHEMA_VERSION),
    xp: z.number().int().min(0),
    scenario_progress: z.array(scenarioProgressSchema),
    owned_card_ids: uniqueArraySchema(cardIdSchema),
    subject_mastery: subjectMasterySchema,
    settings: saveDataSettingsSchema,
  })
  .strict()
export type SaveData = z.infer<typeof saveDataSchema>
