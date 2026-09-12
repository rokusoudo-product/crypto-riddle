// src/ui/screens/explore-scene-npc-dialogue.fixture.ts — 探索の多ターン送り・NPC直接発話
// (`collect.dialogue[]`、#100/#102)のテスト専用フィクスチャ。
//
// 既存の explore-scene.fixture.ts は多数の既存テストが具体的な形状(ホットスポット数・
// investigation_points数・「2/2件調査済み」等の文言)に依存しているため、書き換えると
// 既存テストが壊れる(explore-scene-no-noop.fixture.ts 冒頭コメントと同じ理由)。本ファイルは
// 「collect.dialogue[]による多ターンのやり取り・NPC直接発話」を確認するための最小シナリオとして
// 分離し、既存フィクスチャは無改訂のまま維持する。
//
// 構成:
// - scene-interview「面談室」の唯一のホットスポット(person・経理部長)は、collectのdialogue[]に
//   3ターン(霧島→NPC「中野」→橘)を持つ。dialogue内のNPC発話(docs/scenario_schema.md §2.6)を
//   確認するための最小データ。
import { scenarioSchema } from '@/core/model'
import type { Scenario } from '@/core/model'

const rawScenario: Scenario = {
  schema_version: '0.7.0',
  id: 's-test-scene-npc-dialogue',
  title: 'NPC発話・多ターン送りテスト用マップ',
  status: 'draft',
  subject_tags: ['攻撃手法'],
  difficulty: 1,
  estimated_minutes: 5,
  intro: {
    background: 'テスト用の導入文。',
    victim_company: {
      name: 'テスト株式会社',
      description: 'テスト用の被害企業。',
    },
    character_intros: [{ character: '霧島', line: 'まずは現場を確認しよう。' }],
  },
  investigation_points: [
    {
      id: 'ip-interview',
      category: '人に聞く',
      label: '経理部長への聞き取り',
      description: '経理部長に中野さんの様子を聞く。',
    },
  ],
  cards: [
    {
      id: 'card-interview',
      type: '証言',
      source: '経理部長',
      investigation_point_id: 'ip-interview',
      body: '中野さんは添付ファイルを開いた後、様子がおかしかった。',
      is_dummy: false,
    },
  ],
  scenes: [
    {
      id: 'scene-interview',
      title: '面談室',
      background: 'bg-test-interview',
      hotspots: [
        {
          object_type: 'person',
          position: [0.4, 0.6],
          label: '経理部長',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-interview',
              label: '話を聞く',
              dialogue: [
                {
                  character: '霧島',
                  line: '経理部長、中野さんが開いた添付ファイルについて教えてください。',
                },
                { npc: '中野', line: '取引先からの見積依頼だと思って、普通に開いてしまって……' },
                { character: '橘', line: '添付ファイルの拡張子は確認しましたか？' },
              ],
            },
          ],
        },
      ],
    },
  ],
  resolution: {
    cipher_stages: [],
    questions: [
      {
        id: 'q-only',
        subject_tag: '攻撃手法',
        speaker: '霧島',
        prompt: 'テスト用の問い。',
        choices: [
          { text: '正解の選択肢', is_correct: true },
          { text: '誤答の選択肢', is_correct: false, reply: 'テスト用の誤答返し。' },
        ],
        consult_hint: 'テスト用のヒント。',
      },
    ],
    clear_explanation: [{ character: '霧島', line: 'テスト用の解説。' }],
  },
}

/** scenarioSchema.parse を通すことでフィクスチャ自身の整合性を保証する(scenes整合性含む)。 */
export const exploreSceneNpcDialogueFixture: Scenario = scenarioSchema.parse(rawScenario)
