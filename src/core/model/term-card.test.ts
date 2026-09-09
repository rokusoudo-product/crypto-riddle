import { describe, expect, it } from 'vitest'

import { termCardSchema, termsFileSchema, type TermCard } from './term-card.ts'

function validTermCard(): TermCard {
  return {
    id: 'term-caesar-cipher',
    term: 'シーザー暗号',
    reading: 'シーザーあんごう',
    aliases: ['シフト暗号'],
    definition: '平文の各文字を一定数ずらして暗号化する換字式暗号。',
    subject_tags: ['暗号'],
    syllabus: { domain: 'テクノロジ系', field: 'セキュリティ', exam_relevance: ['SC', 'NW'] },
    related_terms: [],
    source: { type: 'general_knowledge' },
    status: 'reviewed',
  }
}

describe('termCardSchema', () => {
  it('正常系: 妥当な用語カードを受理する', () => {
    expect(termCardSchema.safeParse(validTermCard()).success).toBe(true)
  })

  it('境界: subject_tags に7種目(ネットワーク基盤)を受理する(Issue #22)', () => {
    const term = validTermCard()
    term.subject_tags = ['ネットワーク基盤']
    expect(termCardSchema.safeParse(term).success).toBe(true)
  })

  it('reject: id がパターンに合わない場合を拒否する', () => {
    const term = validTermCard()
    term.id = 'invalid-id'
    expect(termCardSchema.safeParse(term).success).toBe(false)
  })

  it('reject: definition が401字を超える場合を拒否する', () => {
    const term = validTermCard()
    term.definition = 'あ'.repeat(401)
    expect(termCardSchema.safeParse(term).success).toBe(false)
  })

  it('reject: subject_tags が空配列の場合を拒否する', () => {
    const term = validTermCard()
    term.subject_tags = []
    expect(termCardSchema.safeParse(term).success).toBe(false)
  })

  it('reject: 未知の subject_tag を拒否する', () => {
    const term = validTermCard()
    // @ts-expect-error 意図的に不正な値を渡す
    term.subject_tags = ['未知分野']
    expect(termCardSchema.safeParse(term).success).toBe(false)
  })

  it("reject: source.type='ipa_exam' で exam_period/question_no が無い場合を拒否する", () => {
    const term = validTermCard()
    term.source = { type: 'ipa_exam' }
    const result = termCardSchema.safeParse(term)
    expect(result.success).toBe(false)
  })

  it("正常系: source.type='ipa_exam' で exam_period/question_no がある場合は受理する", () => {
    const term = validTermCard()
    term.source = { type: 'ipa_exam', exam_period: '2025年 秋期', question_no: '問17' }
    expect(termCardSchema.safeParse(term).success).toBe(true)
  })

  it("reject: source.type='other' で note が無い場合を拒否する", () => {
    const term = validTermCard()
    term.source = { type: 'other' }
    expect(termCardSchema.safeParse(term).success).toBe(false)
  })

  it('reject: syllabus.exam_relevance が空配列の場合を拒否する', () => {
    const term = validTermCard()
    term.syllabus = { ...term.syllabus, exam_relevance: [] }
    expect(termCardSchema.safeParse(term).success).toBe(false)
  })
})

describe('termsFileSchema', () => {
  it('正常系: schema_version + terms 配列を受理する', () => {
    const file = { schema_version: '0.1.0', terms: [validTermCard()] }
    expect(termsFileSchema.safeParse(file).success).toBe(true)
  })

  it('reject: terms キーが無い場合を拒否する', () => {
    expect(termsFileSchema.safeParse({ schema_version: '0.1.0' }).success).toBe(false)
  })

  it('reject: terms が空配列の場合を拒否する', () => {
    expect(termsFileSchema.safeParse({ schema_version: '0.1.0', terms: [] }).success).toBe(false)
  })
})
