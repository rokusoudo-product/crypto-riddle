// src/core/model/util.ts — zod スキーマ定義を横断して使う小さなヘルパー。
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import { z } from 'zod'

/**
 * JSON Schema の `uniqueItems: true` に相当する制約を持つ配列スキーマを作る。
 * 要素はプリミティブ値（文字列等）を想定し、JSON.stringify で比較する。
 */
export function uniqueArraySchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  opts?: { minItems?: number },
) {
  let schema = z.array(itemSchema)
  if (opts?.minItems !== undefined) {
    schema = schema.min(opts.minItems)
  }
  return schema.refine(
    (items) => new Set(items.map((item) => JSON.stringify(item))).size === items.length,
    {
      message: '配列内に重複した要素があります（uniqueItems 違反）。',
    },
  )
}
