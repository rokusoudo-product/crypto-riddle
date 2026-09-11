// src/ui/screens/explore-scene-no-noop.fixture.ts — アクションシートの中央オーバーレイ化・
// 選択肢ボタン半透明80%・「戻る」選択肢の必須化(#52 追補・代表FB 2026-09-11)の
// テスト専用フィクスチャ。
//
// 既存の explore-scene.fixture.ts / explore-scene-door.fixture.ts は多数の既存テストが
// 具体的な形状(ホットスポット数・investigation_points数)に依存しているため、書き換えると
// 既存テストが壊れる(各フィクスチャ冒頭コメント参照)。本ファイルは「データにnoop相当が無い
// 複数actionのホットスポット」を確認するための最小シナリオとして分離し、既存フィクスチャは
// 無改訂のまま維持する。
//
// 構成:
// - scene-x「資料室」の唯一のホットスポット(book・資料棚)は collect を2件持つが、
//   noop(「何もしない」相当)を意図的に含めない(実データにも同型の例がある:
//   scenarios/s1-targeted-email-intrusion.yaml の書籍ホットスポット等)。
//   UI側(scene-explorer.tsx の hasNoopAction)が「閉じる（何もしない）」を末尾に補うことを
//   確認するためのフィクスチャ。
// - resolution.questions は1問のみ(暗号なし)にして、探索→解決の結線テストを短く保つ。
import { scenarioSchema } from '@/core/model'
import type { Scenario } from '@/core/model'

const rawScenario: Scenario = {
  schema_version: '0.6.0',
  id: 's-test-scene-no-noop',
  title: 'アクションシート戻る補完テスト用マップ',
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
      id: 'ip-advisory',
      category: '文献を引く',
      label: '注意喚起情報',
      description: '業界団体の注意喚起を確認する。',
    },
    {
      id: 'ip-guideline',
      category: '文献を引く',
      label: '対応ガイドライン',
      description: 'インシデント対応ガイドラインを確認する。',
    },
  ],
  cards: [
    {
      id: 'card-advisory',
      type: '外部情報',
      source: '業界団体',
      investigation_point_id: 'ip-advisory',
      body: '同種の手口が直近で報告されている。',
      is_dummy: false,
    },
    {
      id: 'card-guideline',
      type: '対策',
      source: '社内規程',
      investigation_point_id: 'ip-guideline',
      body: '感染端末は電源を落とさずネットワークから隔離する。',
      is_dummy: false,
    },
  ],
  scenes: [
    {
      id: 'scene-x',
      title: '資料室',
      background: 'bg-test-no-noop',
      hotspots: [
        {
          // noopを意図的に含まない複数action(collect×2のみ)のホットスポット。
          object_type: 'book',
          position: [0.5, 0.5],
          label: '資料棚',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-advisory',
              label: '注意喚起情報を確認する',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-guideline',
              label: '対応ガイドラインを確認する',
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
export const exploreSceneNoNoopFixture: Scenario = scenarioSchema.parse(rawScenario)
