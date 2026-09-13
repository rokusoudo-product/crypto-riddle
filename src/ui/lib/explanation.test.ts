/** @vitest-environment node */
// src/ui/lib/explanation.test.ts — questions[].explanations の話者付き表示(#100/#102)。
//
// resolveExplanation単体の正規化(string→question.speaker、DialogueLineオブジェクト→そのまま、
// 段階解説のインデックスclamp)に加え、resolve-screen.tsxが使う
// `priorWrongAttempts = (wrongAttemptsByQuestionId[question.id] ?? 1) - 1` という式が
// coreのpickExplanation(src/core/scenario/state.ts、非公開関数のためscenarioReducer経由で
// 間接的に確認する)と同じ要素を選んでいることを回帰確認する(advisor指摘: 二重実装した
// インデックス式がcoreとズレたまま気づかれないことを防ぐ)。
import { scenarioReducer } from '@/core/scenario'
import type { Question, Scenario } from '@/core/model'
import type { ScenarioProgressState } from '@/core/scenario'
import { scenarioSchema } from '@/core/model'
import { describe, expect, it } from 'vitest'

import { resolveExplanation } from './explanation'

const question: Question = {
  id: 'q-1',
  subject_tag: '攻撃手法',
  speaker: '霧島',
  prompt: 'テスト用の問い。',
  choices: [
    { text: '正解の選択肢', is_correct: true },
    { text: '誤答の選択肢', is_correct: false, reply: 'テスト用の誤答返し。' },
  ],
  explanations: [
    '1段目の解説(文字列。question.speakerである霧島が話す)。',
    { character: '橘', line: '2段目の解説(橘が話者として明示されている)。' },
    { character: '霧島', line: '3段目以降の解説(霧島が話す)。' },
  ],
  consult_hint: 'テスト用のヒント。',
}

describe('resolveExplanation(#100/#102 explanationsの話者正規化)', () => {
  it('文字列要素はquestion.speakerが話者になる', () => {
    expect(resolveExplanation(question, 0)).toEqual({
      character: '霧島',
      line: '1段目の解説(文字列。question.speakerである霧島が話す)。',
    })
  })

  it('オブジェクト要素は明示されたcharacterをそのまま話者にする', () => {
    expect(resolveExplanation(question, 1)).toEqual({
      character: '橘',
      line: '2段目の解説(橘が話者として明示されている)。',
    })
  })

  it('誤答回数がexplanations.lengthを超えたら最後の要素に留まる(段階的に深まるが増え続けない)', () => {
    expect(resolveExplanation(question, 2)).toEqual({
      character: '霧島',
      line: '3段目以降の解説(霧島が話す)。',
    })
    expect(resolveExplanation(question, 99)).toEqual({
      character: '霧島',
      line: '3段目以降の解説(霧島が話す)。',
    })
  })

  it('explanationsが無い/空ならnullを返す', () => {
    const withoutExplanations: Question = { ...question, explanations: undefined }
    expect(resolveExplanation(withoutExplanations, 0)).toBeNull()
    const withEmptyExplanations: Question = { ...question, explanations: [] }
    expect(resolveExplanation(withEmptyExplanations, 0)).toBeNull()
  })
})

describe('resolveExplanationのインデックス式とcore(pickExplanation)の整合性回帰確認', () => {
  // pickExplanationはsrc/core/scenario/state.tsの非公開関数のため、scenarioReducerを通して
  // 間接的にAnswerFeedback.explanation(string|null)を得て、resolveExplanationが選ぶ.lineと
  // 一致することを確認する(#100/#102、resolveExplanationのJSDoc参照)。
  const rawScenario: Scenario = {
    schema_version: '0.7.0',
    id: 's-test-explanation-parity',
    title: 'explanations整合性テスト用マップ',
    status: 'draft',
    subject_tags: ['攻撃手法'],
    difficulty: 1,
    estimated_minutes: 5,
    intro: {
      background: 'テスト用の導入文。',
      victim_company: { name: 'テスト株式会社', description: 'テスト用の被害企業。' },
      character_intros: [{ character: '霧島', line: 'テスト用の導入台詞。' }],
    },
    investigation_points: [
      {
        id: 'ip-only',
        category: '人に聞く',
        label: 'テスト用調査ポイント',
        description: 'テスト用の調査ポイント。',
      },
    ],
    cards: [
      {
        id: 'card-only',
        type: '証言',
        source: 'テスト用',
        investigation_point_id: 'ip-only',
        body: 'テスト用のカード本文。',
        is_dummy: false,
      },
    ],
    resolution: {
      cipher_stages: [],
      questions: [question],
      clear_explanation: [{ character: '霧島', line: 'テスト用の解説。' }],
    },
  }
  const scenario: Scenario = scenarioSchema.parse(rawScenario)

  const baseState: ScenarioProgressState = {
    scenarioId: scenario.id,
    part: 'resolution',
    resolutionStage: 'question',
    investigatedPointIds: ['ip-only'],
    ownedCardIds: ['card-only'],
    questionIndex: 0,
    wrongAttemptsByQuestionId: {},
    consultsUsed: 0,
    lastAnswerFeedback: null,
  }

  it('誤答を重ねるたび、UI側のresolveExplanationがcoreのAnswerFeedback.explanationと同じ本文を選ぶ', () => {
    let state = baseState
    for (let attempt = 0; attempt < 4; attempt += 1) {
      state = scenarioReducer(scenario, state, { type: 'SUBMIT_QUESTION_ANSWER', choiceIndex: 1 })
      expect(state.lastAnswerFeedback?.correct).toBe(false)

      // resolve-screen.tsxと同じ式(dispatch後は既に+1されているため1引く)。
      const priorWrongAttempts = (state.wrongAttemptsByQuestionId[question.id] ?? 1) - 1
      const resolved = resolveExplanation(question, priorWrongAttempts)

      expect(resolved?.line).toBe(state.lastAnswerFeedback?.explanation)
    }
  })
})
