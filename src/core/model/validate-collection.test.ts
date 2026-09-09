import { describe, expect, it } from 'vitest'

import type { LawEntry } from './legal.ts'
import type { MisuseQuizItem } from './quiz-misuse.ts'
import type { Scenario } from './scenario.ts'
import type { TermCard } from './term-card.ts'
import {
  checkQuizItems,
  checkScenarioFilenames,
  checkScenarioLegalRefs,
  checkTermReferences,
  collectLawIds,
  collectTerms,
  warnScenariosMissingCountermeasureDummy,
} from './validate-collection.ts'

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    schema_version: '0.1.0',
    id: 's0-sample',
    title: 'サンプル',
    subject_tags: ['認証'],
    difficulty: 1,
    estimated_minutes: 10,
    source: { type: 'original' },
    intro: {
      background: 'x',
      victim_company: { name: 'x', description: 'x' },
      character_intros: [{ character: '霧島', line: 'x' }],
    },
    investigation_points: [{ id: 'ip-1', category: 'ログを見る', label: 'x', description: 'x' }],
    cards: [
      {
        id: 'card-1',
        type: 'ログ',
        source: 'x',
        investigation_point_id: 'ip-1',
        body: 'x',
        is_dummy: false,
      },
      {
        id: 'card-2',
        type: '対策',
        source: 'x',
        investigation_point_id: 'ip-1',
        body: 'x',
        is_dummy: false,
      },
    ],
    resolution: {
      cipher_stages: [
        { id: 'cs-1', method: 'caesar', ciphertext: 'x', key: '1', key_hint: 'x', plaintext: 'X' },
      ],
      attack_identification: {
        required_card_ids: ['card-1'],
        attack_name: 'x',
        attack_description: 'x',
      },
      countermeasure: { required_card_ids: ['card-2'], summary: 'x' },
      wrong_answer_follow_ups: [{ trigger: 'cipher', character: '霧島', line: 'x' }],
      clear_explanation: [{ character: '霧島', line: 'x' }],
    },
    ...overrides,
  }
}

describe('checkScenarioFilenames', () => {
  it('ファイル名(拡張子除く)と id が一致していればエラー無し', () => {
    const errors = checkScenarioFilenames([
      { filename: 'scenarios/s0-sample.yaml', data: baseScenario() },
    ])
    expect(errors).toEqual([])
  })

  it('ファイル名と id が異なる場合エラーを返す', () => {
    const errors = checkScenarioFilenames([
      { filename: 'scenarios/wrong-name.yaml', data: baseScenario() },
    ])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('wrong-name')
  })
})

describe('collectLawIds / checkScenarioLegalRefs', () => {
  const law: LawEntry = {
    id: 'LAW-APPI-BREACH-REPORT',
    law_name: 'x',
    article: 'x',
    title: 'x',
    report_deadline: 'x',
    summary: 'x',
    last_verified: '2026-08-07',
  }

  it('重複した law id を検出する', () => {
    const { ids, errors } = collectLawIds([
      { filename: 'legal/a.yaml', data: law },
      { filename: 'legal/b.yaml', data: law },
    ])
    expect(ids.size).toBe(1)
    expect(errors).toHaveLength(1)
  })

  it('legal_refs が既知の law id を参照していればエラー無し', () => {
    const scenario = baseScenario({
      resolution: { ...baseScenario().resolution, legal_refs: ['LAW-APPI-BREACH-REPORT'] },
    })
    const errors = checkScenarioLegalRefs(
      [{ filename: 'scenarios/s0-sample.yaml', data: scenario }],
      new Set(['LAW-APPI-BREACH-REPORT']),
    )
    expect(errors).toEqual([])
  })

  it('legal_refs が未知の law id を参照していればエラーを返す', () => {
    const scenario = baseScenario({
      resolution: { ...baseScenario().resolution, legal_refs: ['LAW-NOT-EXIST'] },
    })
    const errors = checkScenarioLegalRefs(
      [{ filename: 'scenarios/s0-sample.yaml', data: scenario }],
      new Set(),
    )
    expect(errors).toHaveLength(1)
  })
})

describe('warnScenariosMissingCountermeasureDummy', () => {
  it('対策ダミーカードが無いシナリオのファイル名を返す', () => {
    const warnings = warnScenariosMissingCountermeasureDummy([
      { filename: 'scenarios/s0-sample.yaml', data: baseScenario() },
    ])
    expect(warnings).toEqual(['scenarios/s0-sample.yaml'])
  })

  it('対策ダミーカードがあれば警告しない', () => {
    const scenario = baseScenario()
    scenario.cards.push({
      id: 'card-3',
      type: '対策',
      source: 'x',
      investigation_point_id: 'ip-1',
      body: 'x',
      is_dummy: true,
    })
    const warnings = warnScenariosMissingCountermeasureDummy([{ filename: 'x', data: scenario }])
    expect(warnings).toEqual([])
  })
})

function baseTerm(overrides: Partial<TermCard> = {}): TermCard {
  return {
    id: 'term-a',
    term: 'A',
    reading: 'えー',
    definition: 'x',
    subject_tags: ['暗号'],
    syllabus: { domain: 'テクノロジ系', field: 'セキュリティ', exam_relevance: ['SC'] },
    source: { type: 'general_knowledge' },
    ...overrides,
  }
}

describe('collectTerms / checkTermReferences', () => {
  it('重複した用語カード id を検出する', () => {
    const { byId, errors } = collectTerms([
      { filename: 'terms/a.yaml', data: [baseTerm()] },
      { filename: 'terms/b.yaml', data: [baseTerm()] },
    ])
    expect(byId.size).toBe(1)
    expect(errors).toHaveLength(1)
  })

  it('related_terms が実在すればエラー無し', () => {
    const termA = baseTerm({ id: 'term-a', related_terms: ['term-b'] })
    const termB = baseTerm({ id: 'term-b' })
    const { byId } = collectTerms([{ filename: 'terms/a.yaml', data: [termA, termB] }])
    expect(checkTermReferences(byId)).toEqual([])
  })

  it('related_terms が自分自身を参照していればエラーを返す', () => {
    const term = baseTerm({ id: 'term-a', related_terms: ['term-a'] })
    const { byId } = collectTerms([{ filename: 'terms/a.yaml', data: [term] }])
    const errors = checkTermReferences(byId)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('自分自身')
  })

  it('related_terms が実在しない場合エラーを返す', () => {
    const term = baseTerm({ id: 'term-a', related_terms: ['term-not-exist'] })
    const { byId } = collectTerms([{ filename: 'terms/a.yaml', data: [term] }])
    expect(checkTermReferences(byId)).toHaveLength(1)
  })
})

describe('checkQuizItems', () => {
  const quiz: MisuseQuizItem = {
    id: 'quiz-misuse-a',
    term_id: 'term-a',
    context_text: 'x',
    is_misuse: false,
    correct_statement: 'x',
    explanation: 'x',
  }

  it('term_id が用語カードマスタに実在すればエラー無し', () => {
    const errors = checkQuizItems(
      [{ filename: 'terms/quiz.yaml', data: [quiz] }],
      new Set(['term-a']),
    )
    expect(errors).toEqual([])
  })

  it('term_id が用語カードマスタに無ければエラーを返す', () => {
    const errors = checkQuizItems([{ filename: 'terms/quiz.yaml', data: [quiz] }], new Set())
    expect(errors).toHaveLength(1)
  })

  it('confused_with_term_id が用語カードマスタに無ければエラーを返す', () => {
    const withConfusion: MisuseQuizItem = {
      ...quiz,
      misuse_type: 'term_confusion',
      confused_with_term_id: 'term-x',
    }
    const errors = checkQuizItems(
      [{ filename: 'terms/quiz.yaml', data: [withConfusion] }],
      new Set(['term-a']),
    )
    expect(errors).toHaveLength(1)
  })

  it('クイズ id が重複していればエラーを返す', () => {
    const errors = checkQuizItems(
      [
        { filename: 'terms/quiz-a.yaml', data: [quiz] },
        { filename: 'terms/quiz-b.yaml', data: [quiz] },
      ],
      new Set(['term-a']),
    )
    expect(errors.some((e) => e.includes('クイズ id 重複'))).toBe(true)
  })
})
