import { describe, expect, it } from 'vitest'

import { hasNoDummyCountermeasure, scenarioSchema, type Scenario } from './scenario.ts'

function validScenario(): Scenario {
  return {
    schema_version: '0.2.0',
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
      attack_identification: {
        required_card_ids: ['card-proxy-log', 'card-witness-tanaka'],
        attack_name: 'パスワードリスト攻撃',
        attack_description: '流出パスワードの使い回しを悪用する攻撃。',
      },
      countermeasure: {
        required_card_ids: ['card-countermeasure-mfa'],
        summary: '多要素認証の導入。',
      },
      wrong_answer_follow_ups: [
        { trigger: 'cipher', character: '霧島', line: 'ずれ幅は一定のはずだ。' },
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

  it('reject: attack_identification.required_card_ids がダミーカードを含む場合を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.attack_identification.required_card_ids = ['card-countermeasure-firewall']
    const result = scenarioSchema.safeParse(scenario)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('ダミーカード'))).toBe(true)
    }
  })

  it('reject: attack_identification.required_card_ids が実在しないcardを参照する場合を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.attack_identification.required_card_ids = ['card-not-exist']
    expect(scenarioSchema.safeParse(scenario).success).toBe(false)
  })

  it("reject: countermeasure.required_card_ids が type='対策' 以外を参照する場合を拒否する", () => {
    const scenario = validScenario()
    scenario.resolution.countermeasure.required_card_ids = ['card-proxy-log']
    const result = scenarioSchema.safeParse(scenario)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes("type='対策' ではありません")),
      ).toBe(true)
    }
  })

  it('reject: countermeasure.required_card_ids がダミーカードを参照する場合を拒否する', () => {
    const scenario = validScenario()
    scenario.resolution.countermeasure.required_card_ids = ['card-countermeasure-firewall']
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

describe('hasNoDummyCountermeasure', () => {
  it('type=対策 のダミーカードがあれば false を返す', () => {
    expect(hasNoDummyCountermeasure(validScenario())).toBe(false)
  })

  it('type=対策 のダミーカードが無ければ true を返す(警告対象)', () => {
    const scenario = validScenario()
    scenario.cards = scenario.cards.filter((card) => card.id !== 'card-countermeasure-firewall')
    expect(hasNoDummyCountermeasure(scenario)).toBe(true)
  })
})
