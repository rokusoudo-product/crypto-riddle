// src/ui/screens/intro-screen.fixture.ts — 導入③の会話フレーム化(#100/#102)テスト専用フィクスチャ。
//
// intro-screen.test.tsx が使う。多ターン送り(character_intros 3行・霧島/橘/小鳥遊の3枠)と
// `intro.background`(ナレーション本文)省略時の分岐を確認するため、2種類のシナリオを用意する。
// explore-scene.fixture.ts と同じ方針で scenarioSchema.parse を通し、フィクスチャ自身の
// 整合性を保証する。
import { scenarioSchema } from '@/core/model'
import type { Scenario } from '@/core/model'

function buildRawScenario(id: string, background?: string) {
  return {
    schema_version: '0.7.0' as const,
    id,
    title: '導入UIテスト用マップ',
    status: 'draft' as const,
    subject_tags: ['攻撃手法'] as const,
    difficulty: 1,
    estimated_minutes: 5,
    intro: {
      ...(background ? { background } : {}),
      victim_company: {
        name: 'テスト株式会社',
        description: 'テスト用の被害企業。',
      },
      character_intros: [
        { character: '霧島' as const, line: '霧島の1行目のセリフです。' },
        { character: '橘' as const, line: '橘の2行目のセリフです。' },
        { character: '小鳥遊' as const, line: '小鳥遊の3行目のセリフです。' },
      ],
    },
    investigation_points: [
      {
        id: 'ip-only',
        category: '人に聞く' as const,
        label: 'テスト用調査ポイント',
        description: 'テスト用の調査ポイント。',
      },
    ],
    cards: [
      {
        id: 'card-only',
        type: '証言' as const,
        source: 'テスト用',
        investigation_point_id: 'ip-only',
        body: 'テスト用のカード本文。',
        is_dummy: false,
      },
    ],
    resolution: {
      cipher_stages: [],
      questions: [
        {
          id: 'q-only',
          subject_tag: '攻撃手法' as const,
          speaker: '霧島' as const,
          prompt: 'テスト用の問い。',
          choices: [
            { text: '正解の選択肢', is_correct: true as const },
            { text: '誤答の選択肢', is_correct: false as const, reply: 'テスト用の誤答返し。' },
          ],
          consult_hint: 'テスト用のヒント。',
        },
      ],
      clear_explanation: [{ character: '霧島' as const, line: 'テスト用の解説。' }],
    },
  }
}

/** intro.background あり・character_intros 3行(霧島/橘/小鳥遊)。多ターン送り・3枠レイアウトの確認用。 */
export const introMultiTurnFixture: Scenario = scenarioSchema.parse(
  buildRawScenario('s-test-intro-multiturn', 'テスト用の導入ナレーション文。'),
)

/** intro.background 省略。ナレーションブロックを描画せず会話へ直行することの確認用。 */
export const introNoBackgroundFixture: Scenario = scenarioSchema.parse(
  buildRawScenario('s-test-intro-no-background'),
)
