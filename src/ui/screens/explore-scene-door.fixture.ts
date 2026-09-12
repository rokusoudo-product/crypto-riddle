// src/ui/screens/explore-scene-door.fixture.ts — ドア移動UI・prompt見出し・系統をまたぐ
// 統合ホットスポット(#78・T046-ui-data)のテスト専用フィクスチャ。
//
// 既存の explore-scene.fixture.ts(#56/T038)は多数の既存テストが具体的な形状(ホットスポット数・
// investigation_points数=2)に依存しているため、goto/door/prompt検証のために書き換えると
// 既存テストが壊れる。本ファイルは新規テスト専用の別シナリオとして分離し、既存フィクスチャは
// 無改訂のまま維持する(Issue #78「既存のe2e/vitestを壊さない」)。
//
// 構成:
// - investigation_points 2件(ip-log・ip-witness): いずれも scene-a の統合ホットスポット
//   「サーバ管理者」の2つのcollectアクションから参照する(#78のS1データと同じ形=
//   系統をまたぐ統合ホットスポット。ログ→霧島／証言→橘)。
// - scene-a: 統合ホットスポット(person・prompt付き・collect×2+noop) と、scene-bへの
//   door(goto・単一action)。
// - scene-b: scene-aへ戻るdoor(goto・単一action)のみ(door単独でもhotspots.min(1)を満たす)。
// - resolution.questions は1問のみ(暗号なし)にして、探索→解決の結線テストを短く保つ。
import { scenarioSchema } from '@/core/model'
import type { Scenario } from '@/core/model'

const rawScenario: Scenario = {
  schema_version: '0.7.0',
  id: 's-test-scene-door',
  title: 'ドア移動UIテスト用マップ',
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
      id: 'ip-log',
      category: 'ログを見る',
      label: '運用端末のログ',
      description: '運用端末のログを確認する。',
    },
    {
      id: 'ip-witness',
      category: '人に聞く',
      label: 'サーバ管理者への聞き取り',
      description: 'サーバ管理者に話を聞く。',
    },
  ],
  cards: [
    {
      id: 'card-log',
      type: 'ログ',
      source: '運用端末',
      investigation_point_id: 'ip-log',
      body: '定期ジョブのログに異常は見られなかった。',
      is_dummy: false,
    },
    {
      id: 'card-witness',
      type: '証言',
      source: 'サーバ管理者',
      investigation_point_id: 'ip-witness',
      body: '「昨夜からアラートが増えている」とサーバ管理者は証言した。',
      is_dummy: false,
    },
  ],
  scenes: [
    {
      id: 'scene-a',
      title: 'サーバ室',
      background: 'bg-test-scene-a',
      hotspots: [
        {
          // 系統をまたぐ統合ホットスポット(#78・T046-ui-data): 人物(証言)＋機器(ログ)を
          // 1つに束ね、prompt(挨拶台詞)をアクションシート見出しに表示する。
          object_type: 'person',
          position: [0.5, 0.4],
          label: 'サーバ管理者',
          prompt: 'サーバ管理者「どうしましたか？」',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness',
              label: '話を聞く',
              speaker: '橘',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-log',
              label: 'PCを確認する',
              speaker: '霧島',
            },
            { kind: 'noop', label: '何でもない' },
          ],
        },
        {
          // ドア(#78・T046-ui-data): 通常不可視・単一goto action=即座に移動する。
          object_type: 'door',
          position: [0.92, 0.5],
          label: '執務室への扉',
          actions: [{ kind: 'goto', scene_id: 'scene-b', label: '執務室へ移動する' }],
        },
      ],
    },
    {
      id: 'scene-b',
      title: '執務室',
      background: 'bg-test-scene-b',
      hotspots: [
        {
          object_type: 'door',
          position: [0.08, 0.5],
          label: 'サーバ室への扉',
          actions: [{ kind: 'goto', scene_id: 'scene-a', label: 'サーバ室へ移動する' }],
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

/** scenarioSchema.parse を通すことでフィクスチャ自身の整合性を保証する(goto/scenes整合性含む)。 */
export const exploreSceneDoorFixture: Scenario = scenarioSchema.parse(rawScenario)
