import { describe, expect, it } from 'vitest'

import { misuseQuizItemSchema, quizMisuseFileSchema, type MisuseQuizItem } from './quiz-misuse.ts'

function validQuizItem(): MisuseQuizItem {
  return {
    id: 'quiz-misuse-hash-vs-encryption',
    term_id: 'term-hash-function',
    speaker: '霧島',
    context_text: 'ハッシュ関数で暗号化しているので復号できる、という発言。',
    is_misuse: true,
    misuse_type: 'definition_confusion',
    correct_statement: 'ハッシュ関数は一方向関数であり復号できない。',
    explanation: '暗号化とハッシュ関数は混同されやすいが本質的に異なる。',
    difficulty: 2,
  }
}

describe('misuseQuizItemSchema', () => {
  it('正常系: 妥当なクイズ問題を受理する', () => {
    expect(misuseQuizItemSchema.safeParse(validQuizItem()).success).toBe(true)
  })

  it('正常系: is_misuse=false は misuse_type 無しでも受理する', () => {
    const item = validQuizItem()
    item.is_misuse = false
    item.misuse_type = undefined
    expect(misuseQuizItemSchema.safeParse(item).success).toBe(true)
  })

  it('reject: is_misuse=true で misuse_type が無い場合を拒否する', () => {
    const item = validQuizItem()
    item.misuse_type = undefined
    expect(misuseQuizItemSchema.safeParse(item).success).toBe(false)
  })

  it("reject: misuse_type='term_confusion' で confused_with_term_id が無い場合を拒否する", () => {
    const item = validQuizItem()
    item.misuse_type = 'term_confusion'
    expect(misuseQuizItemSchema.safeParse(item).success).toBe(false)
  })

  it("正常系: misuse_type='term_confusion' で confused_with_term_id がある場合は受理する", () => {
    const item = validQuizItem()
    item.misuse_type = 'term_confusion'
    item.confused_with_term_id = 'term-encryption'
    expect(misuseQuizItemSchema.safeParse(item).success).toBe(true)
  })

  it('reject: confused_with_term_id が term_id と同一の場合を拒否する', () => {
    const item = validQuizItem()
    item.misuse_type = 'term_confusion'
    item.confused_with_term_id = item.term_id
    expect(misuseQuizItemSchema.safeParse(item).success).toBe(false)
  })

  it('reject: id がパターンに合わない場合を拒否する', () => {
    const item = validQuizItem()
    item.id = 'invalid-id'
    expect(misuseQuizItemSchema.safeParse(item).success).toBe(false)
  })
})

describe('quizMisuseFileSchema', () => {
  it('正常系: schema_version + quiz_items 配列を受理する', () => {
    const file = { schema_version: '0.1.0', quiz_items: [validQuizItem()] }
    expect(quizMisuseFileSchema.safeParse(file).success).toBe(true)
  })

  it('reject: quiz_items が空配列の場合を拒否する', () => {
    expect(
      quizMisuseFileSchema.safeParse({ schema_version: '0.1.0', quiz_items: [] }).success,
    ).toBe(false)
  })
})
