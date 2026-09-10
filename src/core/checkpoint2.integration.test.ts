// src/core/checkpoint2.integration.test.ts — チェックポイント②の統合テスト(tasks.md)。
//
// 「UI なしで『シナリオを読み込み→判定→セーブ』が core 単体テストで一周する」ことを検証する。
// `scenarios/s0-sample.yaml` 由来のデータ(scenario/fixtures/s0-sample.fixture.ts。理由は
// フィクスチャファイルのコメント参照。要約: scripts/build-data.ts の runBuild を src/core/ の
// テストから import すると Node 専用コードが tsconfig.app.json のプログラムに取り込まれ
// `npm run typecheck` が壊れるため、内容を写した純粋 TypeScript リテラルを使う)を使い、
// 導入→探索(カード獲得)→解決(暗号解読→会話モードの問い列、判定)→クリア→セーブ→読込復元
// を一周させる(#42/T032 で会話モードへ改訂)。UI(src/ui/)は一切使わない。
import { describe, expect, it } from 'vitest'

import { judgeCipherStage } from './judge/index.ts'
import { SAVE_DATA_SCHEMA_VERSION, scenarioSchema, type SaveData } from './model/index.ts'
import { exportSaveData, importSaveData } from './save/export-import.ts'
import {
  canEnterResolution,
  createInitialScenarioState,
  scenarioReducer,
} from './scenario/index.ts'
import { s0SampleFixture } from './scenario/fixtures/s0-sample.fixture.ts'

describe('チェックポイント②: シナリオを読み込み→判定→セーブが一周する', () => {
  it('フィクスチャが実際の scenarioSchema(zod)の検証を通過する(s0-sample.yaml との整合性確認)', () => {
    expect(scenarioSchema.safeParse(s0SampleFixture).success).toBe(true)
  })

  it('s0-sample を導入→探索→解決→クリアまでプレイし、セーブ→読込で復元できる', () => {
    const scenario = s0SampleFixture

    // --- 導入 ---
    let state = createInitialScenarioState(scenario)
    expect(state.part).toBe('intro')
    state = scenarioReducer(scenario, state, { type: 'ADVANCE_INTRO' })
    expect(state.part).toBe('exploration')

    // --- 探索(カード獲得。ダミーカードを含め全ポイントを調査する) ---
    for (const point of scenario.investigation_points) {
      state = scenarioReducer(scenario, state, { type: 'INVESTIGATE', pointId: point.id })
    }
    expect(state.investigatedPointIds.length).toBe(scenario.investigation_points.length)
    expect(state.ownedCardIds.length).toBe(scenario.cards.length)
    expect(canEnterResolution(state, scenario)).toBe(true)

    // --- 解決: 暗号解読(判定エンジンで平文を事前確認したうえで正答を送る) ---
    state = scenarioReducer(scenario, state, { type: 'ENTER_RESOLUTION' })
    expect(state.resolutionStage).toBe('cipher')

    const [cipherStage] = scenario.resolution.cipher_stages
    expect(judgeCipherStage(cipherStage, cipherStage.plaintext)).toBe(true)

    // まず誤答しても選択肢(この場合は入力欄)は残り、cipher ステージに留まったまま
    // 再挑戦できることをここで一周させて確認する(会話モード, #42/T032)。
    const wrongCipher = scenarioReducer(scenario, state, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: 'これは不正解です',
    })
    expect(wrongCipher.part).toBe('resolution')
    expect(wrongCipher.resolutionStage).toBe('cipher')
    expect(wrongCipher.lastAnswerFeedback?.correct).toBe(false)

    state = scenarioReducer(scenario, wrongCipher, {
      type: 'SUBMIT_CIPHER_ANSWER',
      answer: cipherStage.plaintext,
    })
    expect(state.resolutionStage).toBe('question')
    expect(state.questionIndex).toBe(0)

    // --- 解決: 会話モードの問い列に順に正答する(#42/T032) ---
    for (let i = 0; i < scenario.resolution.questions.length; i++) {
      const question = scenario.resolution.questions[i]
      const correctIndex = question.choices.findIndex((c) => c.is_correct)
      expect(correctIndex).toBeGreaterThanOrEqual(0)
      state = scenarioReducer(scenario, state, {
        type: 'SUBMIT_QUESTION_ANSWER',
        choiceIndex: correctIndex,
      })
    }
    expect(state.part).toBe('clear')

    // --- セーブ ---
    const saveData: SaveData = {
      version: SAVE_DATA_SCHEMA_VERSION,
      xp: 100,
      scenario_progress: [{ scenario_id: scenario.id, cleared: true, no_hint_clear: false }],
      owned_card_ids: [...state.ownedCardIds],
      subject_mastery: Object.fromEntries(scenario.subject_tags.map((tag) => [tag, 10])),
      settings: { bgm_volume: 0.8, se_volume: 0.8, reduce_motion: false },
    }
    const json = exportSaveData(saveData)

    // --- 読込復元 ---
    const restored = importSaveData(json)
    expect(restored).toEqual(saveData)
    expect(restored.scenario_progress[0]).toEqual({
      scenario_id: 's0-sample',
      cleared: true,
      no_hint_clear: false,
    })
  })
})
