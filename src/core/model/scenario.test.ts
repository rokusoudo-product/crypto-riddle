import { describe, expect, it } from 'vitest'

import { scenarioSchema, type Scenario } from './scenario.ts'

function validScenario(): Scenario {
  return {
    schema_version: '0.3.0',
    id: 's0-sample',
    title: 'アルファテック社 顧客データ流出事件(テスト用)',
    status: 'sample',
    subject_tags: ['認証', '攻撃手法', 'インシデント対応', '法制度'],
    difficulty: 2,
    estimated_minutes: 12,
    references: [{ material_kind: '攻撃手口', note: 'テスト用フィクスチャ' }],
    related_terms: ['term-password-list-attack'],
    intro: {
      background: '深夜、管理画面に不審なアクセスが記録された。',
      victim_company: {
        name: '株式会社アルファテック',
        industry: 'EC',
        description: '中堅アパレルEC事業者。',
      },
      character_intros: [
        { character: '霧島', line: 'まずは事実を洗おう。' },
        { character: '橘', line: '報告義務の有無も確認します。' },
      ],
    },
    investigation_points: [
      {
        id: 'ip-proxy-log',
        category: 'ログを見る',
        label: 'プロキシログ',
        description: 'アクセスを確認する。',
      },
      {
        id: 'ip-witness-tanaka',
        category: '人に聞く',
        label: '田中への聞き取り',
        description: '話を聞く。',
      },
      {
        id: 'ip-itdept',
        category: '人に聞く',
        label: '情シスへの相談',
        description: '対策を相談する。',
      },
    ],
    cards: [
      {
        id: 'card-proxy-log',
        type: 'ログ',
        source: 'プロキシサーバ',
        investigation_point_id: 'ip-proxy-log',
        body: '深夜に大量ログイン試行の記録がある。',
        is_dummy: false,
      },
      {
        id: 'card-witness-tanaka',
        type: '証言',
        source: '経理部 田中',
        investigation_point_id: 'ip-witness-tanaka',
        body: 'パスワードを使い回していたと証言。',
        is_dummy: false,
      },
      {
        id: 'card-countermeasure-mfa',
        type: '対策',
        source: '情報システム部',
        investigation_point_id: 'ip-itdept',
        body: '多要素認証を導入する。',
        is_dummy: false,
      },
      {
        id: 'card-countermeasure-firewall',
        type: '対策',
        source: '情報システム部',
        investigation_point_id: 'ip-itdept',
        body: 'ファイアウォールを追加導入する。',
        is_dummy: true,
      },
    ],
    resolution: {
      cipher_stages: [
        {
          id: 'cs-1',
          method: 'caesar',
          ciphertext: 'SDVVZRUG OLVW DWWDFN',
          key: '3',
          key_hint: 'A→D の換字。',
          plaintext: 'PASSWORD LIST ATTACK',
          card_ref: 'card-proxy-log',
        },
      ],
      questions: [
        {
          id: 'q-attack',
          subject_tag: '攻撃手法',
          speaker: '霧島',
          prompt: 'この攻撃は何か？',
          choices: [
            { text: 'パスワードリスト攻撃', is_correct: true },
            {
              text: '標的型メール攻撃',
              is_correct: false,
              reply: 'その場合だとマクロ実行の痕跡が残るはずだが見当たらない。',
            },
          ],
          explanations: ['流出パスワードとの一致に注目しよう。'],
          consult_hint: '認証ログとパスワードの使い回しを整理して提示',
        },
        {
          id: 'q-countermeasure',
          subject_tag: '認証',
          speaker: '橘',
          prompt: '有効な対策は？',
          choices: [
            { text: '多要素認証の導入', is_correct: true, reply: 'それで防げます。' },
            {
              text: 'ファイアウォールの追加導入',
              is_correct: false,
              reply: '境界を固めるだけでは今回の原因は防げません。',
            },
          ],
          consult_hint: '対策カードから本質的な対策を整理して提示',
        },
      ],
      clear_explanation: [{ character: '霧島', line: '侵入経路はパスワードの使い回しだ。' }],
      legal_refs: ['LAW-APPI-BREACH-REPORT'],
    },
  }
}

describe('scenarioSchema', () => {
  it('正常系: 妥当なシナリオを受理する', () => {
    const result = scenarioSchema.safeParse(validScenario())
    expect(result.success).toBe(true)
  })

  it('境界: subject_tags に7種目(ネットワーク基盤)を含めても受理する(Issue #22)', () => {
    const scenario = validScenario()
    scenario.subject_tags = ['ネットワーク基盤']
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('境界: difficulty=1, estimated_minutes=1 の最小値を受理する', () => {
    const scenario = validScenario()
    scenario.difficulty = 1
    scenario.estimated_minutes = 1
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('reject: 未知のプロパティを拒否する(additionalProperties: false 相当)', () => {
    const scenario = { ...validScenario(), unknown_field: 'x' }
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: 未知の subject_tag を拒否する', () => {
    const scenario = validScenario()
    // @ts-expect-error 意図的に不正な値を渡す
    scenario.subject_tags = ['未知分野']
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: difficulty が範囲外(0)を拒否する', () => {
    const scenario = validScenario()
    scenario.difficulty = 0
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: estimated_minutes が範囲外(61)を拒否する', () => {
    const scenario = validScenario()
    scenario.estimated_minutes = 61
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('境界: cipher_stages が0件(暗号なしシナリオ, Issue #5)を受理する', () => {
    const scenario = validScenario()
    scenario.resolution.cipher_stages = []
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('reject: cipher_stages が2件を拒否する(MVPは最大1要素)', () => {
    const scenario = validScenario()
    scenario.resolution.cipher_stages.push({ ...scenario.resolution.cipher_stages[0], id: 'cs-2' })
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: cipher_stages の method が未知の値を拒否する(discriminated union)', () => {
    const scenario = validScenario()
    // @ts-expect-error 意図的に未対応の method を渡す(caesar のみ実装済み)
    scenario.resolution.cipher_stages[0].method = 'base64'
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: card id が重複している場合を拒否する', () => {
    const scenario = validScenario()
    scenario.cards.push({ ...scenario.cards[0] })
    const result = scenarioSchema.safeParse(scenario)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('card id 重複'))).toBe(true)
    }
  })

  it('reject: investigation_point id が重複している場合を拒否する', () => {
    const scenario = validScenario()
    scenario.investigation_points.push({ ...scenario.investigation_points[0] })
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: card.investigation_point_id が実在しない場合を拒否する', () => {
    const scenario = validScenario()
    scenario.cards[0].investigation_point_id = 'ip-not-exist'
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: investigation_point に紐づく card が1件も無い場合を拒否する', () => {
    const scenario = validScenario()
    scenario.investigation_points.push({
      id: 'ip-orphan',
      category: '文献を引く',
      label: '孤立ポイント',
      description: 'どのカードも参照しない。',
    })
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })
})

describe('resolution.questions(会話モード, #42/T030)', () => {
  it('reject: questions が空配列を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.questions = []
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: questions の id が重複している場合を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.questions[1] = { ...scenario.resolution.questions[1], id: 'q-attack' }
    const result = scenarioSchema.safeParse(scenario)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes('questions の id が重複')),
      ).toBe(true)
    }
  })

  it('reject: choices が1個以下(2択未満)を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.questions[0].choices = [{ text: '唯一の選択肢', is_correct: true }]
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: choices が4個以上(3択超)を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.questions[0].choices = [
      { text: 'A', is_correct: true },
      { text: 'B', is_correct: false, reply: 'x' },
      { text: 'C', is_correct: false, reply: 'x' },
      { text: 'D', is_correct: false, reply: 'x' },
    ]
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: 正解(is_correct: true)の選択肢が0個の場合を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.questions[0].choices = [
      { text: 'A', is_correct: false, reply: 'x' },
      { text: 'B', is_correct: false, reply: 'y' },
    ]
    const result = scenarioSchema.safeParse(scenario)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes('ちょうど1つ')),
      ).toBe(true)
    }
  })

  it('reject: 正解の選択肢が2個以上の場合を拒否する(単一解・厳密一致)', () => {
    const scenario = validScenario()
    scenario.resolution.questions[0].choices = [
      { text: 'A', is_correct: true },
      { text: 'B', is_correct: true },
    ]
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('reject: 誤答の選択肢に reply が無い場合を拒否する(discriminated union)', () => {
    const scenario = validScenario()
    scenario.resolution.questions[0].choices = [
      { text: 'A', is_correct: true },
      // @ts-expect-error 意図的に reply を欠落させる
      { text: 'B', is_correct: false },
    ]
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it('正常系: 正解の選択肢は reply を省略できる', () => {
    const scenario = validScenario()
    scenario.resolution.questions[0].choices = [
      { text: 'A', is_correct: true },
      { text: 'B', is_correct: false, reply: 'x' },
    ]
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('正常系: explanations を省略できる(任意項目)', () => {
    const scenario = validScenario()
    delete scenario.resolution.questions[0].explanations
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('reject: consult_hint が無い場合を拒否する(必須)', () => {
    const scenario = validScenario()
    // @ts-expect-error 意図的に必須フィールドを欠落させる
    delete scenario.resolution.questions[0].consult_hint
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })
})

describe('references(出典表記, docs/citation-policy.md §5)', () => {
  it('references を省略しても受理する(参照元が無い完全オリジナル)', () => {
    const scenario = validScenario()
    delete scenario.references
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('material_kind のみ(テーマ参考のみ、exam/year_jp等を捏造しない)でも受理する', () => {
    const scenario = validScenario()
    scenario.references = [{ material_kind: '攻撃手口' }]
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('exam/year_jp/season/division/question を伴う完全な形式も受理する', () => {
    const scenario = validScenario()
    scenario.references = [
      {
        exam: 'SC',
        year_jp: '令和6年度',
        season: '春期',
        division: '午後',
        question: '問2',
        material_kind: '攻撃手口',
      },
    ]
    expect(scenarioSchema.safeParse(scenario).success).toBe(true)
  })

  it('reject: material_kind を欠くと拒否する', () => {
    const scenario = validScenario()
    // @ts-expect-error 意図的に必須フィールドを欠落させる
    scenario.references = [{ note: 'x' }]
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })
})
