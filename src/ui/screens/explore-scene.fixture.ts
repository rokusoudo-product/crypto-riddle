// src/ui/screens/explore-scene.fixture.ts — 探索の背景シーンUI(#56/T038、調査結果の会話
// フレーム化は#52 Phase4.7/#66・T044)のテスト専用フィクスチャ。
//
// Issue #56 の指示により、実データの `scenarios/*.yaml` に `scenes` を追加しない
// (scenes の実データ投入は別 Issue #57/T040 の範囲。二重実装防止)。そのため本ファイルで
// `scenes` を持つ最小のシナリオを組み立て、UI コンポーネント(SceneExplorer・ExploreScreen)の
// テストだけに使う。scenarioSchema.parse を通すことで、docs/scenario_schema.md §2.5 の
// scenes 整合性ルール(各 investigation_point がちょうど1つの collect action から
// 参照される、等)を満たす形になっていることをフィクスチャ自身で保証する。
//
// 構成:
// - investigation_points 2件: ip-pc-log(ログを見る・PCホットスポット経由)、
//   ip-witness(人に聞く・personホットスポット経由で調査結果=会話フレーム表示を確認する用)。
// - scenes 2件: scene-office(PC・person の2ホットスポット。PCはcollect/danger/noopの
//   3action=アクションシート確認用、personはcollect1件のみ=単一actionの即時実行確認用)、
//   scene-server(collectを持たないdeviceホットスポットのみ=シーンタブ切替の確認用。
//   investigation_point を増やさないためcollectは置かない)。
// - resolution.questions は1問のみ(暗号なし)にして、探索→解決の結線テストを短く保つ。
// - PCのcollect actionには line/speaker を明示し(#66/T044)、明示経路を確認する。personの
//   collect actionは意図的に line/speaker を省略し、既定の導入文＋カード本文へのフォールバック
//   経路(scene-explorer.tsx の resolveCollectPresentation)を確認する。
import { scenarioSchema } from '@/core/model'
import type { Scenario } from '@/core/model'

const rawScenario: Scenario = {
  schema_version: '0.6.0',
  id: 's-test-scene-explore',
  title: '探索シーンUIテスト用マップ',
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
      id: 'ip-pc-log',
      category: 'ログを見る',
      label: '経理担当PCのログ',
      description: '経理担当PCのログを確認する。',
    },
    {
      id: 'ip-witness',
      category: '人に聞く',
      label: '田中さんへの聞き取り',
      description: '現場にいた田中さんに話を聞く。',
    },
  ],
  cards: [
    {
      id: 'card-pc-log',
      type: 'ログ',
      source: '経理担当PC',
      investigation_point_id: 'ip-pc-log',
      body: '不審なプロセスの起動ログが残っていた。',
      is_dummy: false,
    },
    {
      id: 'card-witness',
      type: '証言',
      source: '田中さん',
      investigation_point_id: 'ip-witness',
      body: '「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。',
      is_dummy: false,
    },
  ],
  scenes: [
    {
      id: 'scene-office',
      title: '執務室',
      background: 'bg-test-office',
      hotspots: [
        {
          object_type: 'pc',
          position: [0.3, 0.4],
          label: '経理担当のPC',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-pc-log',
              label: 'ログを取る',
              line: '不審なプロセスの起動ログが残っている。マルウェア感染の可能性が高い。',
              speaker: '霧島',
            },
            {
              kind: 'danger',
              label: '電源を落とす',
              feedback: '橘「ここで電源を落とすと揮発性メモリの証拠が消えます。」',
            },
            { kind: 'noop', label: '今は触らない' },
          ],
        },
        {
          object_type: 'person',
          position: [0.7, 0.5],
          label: '田中さん',
          actions: [{ kind: 'collect', investigation_point_id: 'ip-witness', label: '話を聞く' }],
        },
      ],
    },
    {
      id: 'scene-server',
      title: 'サーバ室',
      background: 'bg-test-server',
      hotspots: [
        {
          object_type: 'device',
          position: [0.5, 0.5],
          label: 'サーバ機器',
          actions: [{ kind: 'noop', label: '今は触らない' }],
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
export const exploreSceneFixture: Scenario = scenarioSchema.parse(rawScenario)
