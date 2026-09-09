// src/ui/store/game-store.ts — T013: Zustand で core のシナリオ進行ステートマシンと UI を接続する。
//
// 設計方針(plan.md §2「ui→core の一方向依存」・advisor 承認条件①):
// - ゲームロジック(パート遷移・判定)は再実装せず、core/scenario の `scenarioReducer` に委譲する。
//   このストアは「reducer を呼び出し、結果を React に配信し、SaveStorage へ永続化する」配線役に徹する。
// - zustand は src/core から import 禁止(eslint no-restricted-imports で担保済み)のため、
//   ストア本体は src/ui/store に置く。
// - 永続化は zustand/persist の localStorage ではなく、T009 の SaveStorage(IndexedDB)経由で行う
//   (plan.md §6)。「クリア時」「探索でカードを獲得した等の重要進行時」に保存し、
//   起動時(hydrate)に読込む。
//
// シナリオデータの出典について: tasks.md には「npm run build:data の生成 JSON」を使う案も
// 記載されているが、`src/data/*.json` はビルド成果物で .gitignore 対象(src/data/README.md)であり、
// CI(.github/workflows/ci.yml)も「Test」ステップの後に build:data を実行する順序になっている。
// そのためテスト実行時点では `src/data/scenarios.json` が存在しない前提を置けない。
// `src/core/scenario/fixtures/s0-sample.fixture.ts` は s0-sample.yaml の内容を写した
// 純粋な TypeScript リテラル(常にビルド・テストの両方で参照可能)であるため、
// 本 PR ではこちらをプレイ用データの既定値として使う(README 更新は T015 以降、実データ接続時)。
import { create } from 'zustand'

import type { SaveData, Scenario } from '@/core/model'
import { IndexedDbSaveStorage, type SaveStorage } from '@/core/save'
import {
  createInitialScenarioState,
  scenarioReducer,
  type ScenarioEvent,
  type ScenarioProgressState,
} from '@/core/scenario'
import { s0SampleFixture } from '@/core/scenario/fixtures/s0-sample.fixture'

import {
  applyClearToSaveData,
  applyProgressToSaveData,
  createDefaultSaveData,
} from './save-integration'

export type SaveStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface GameStoreState {
  /** 現在プレイ中のシナリオ(マップ)。T015 以降、複数マップ対応時に差し替え可能にする。 */
  scenario: Scenario
  /** core のシナリオ進行ステートマシンの現在状態。 */
  progress: ScenarioProgressState
  /** 永続化されたプロフィールデータ(SaveStorage 経由)。未読込みは null。 */
  saveData: SaveData | null
  saveStatus: SaveStatus
  /**
   * core の scenarioReducer にイベントを渡し、状態を進める。
   * 戻り値は遷移後の ScenarioProgressState(呼び出し側が即座に画面遷移の判断に使えるようにする)。
   * 遷移が起きた場合は非同期で SaveStorage への保存も行う(fire-and-forget。失敗しても
   * ゲーム進行はブロックしない。結果は saveStatus で確認できる)。
   */
  dispatch: (event: ScenarioEvent) => ScenarioProgressState
  /** 起動時のセーブデータ読込(plan.md §6「起動時に読込」)。 */
  hydrate: () => Promise<void>
  /** シナリオを最初から遊び直す(マップ選択からの再挑戦・「初動をやり直す」以外の完全リセット用)。 */
  restartScenario: (scenario?: Scenario) => void
}

/** SaveStorage の実装差し替え口。既定は本番用の IndexedDbSaveStorage。 */
let activeSaveStorage: SaveStorage = new IndexedDbSaveStorage()

async function persistProgress(
  scenario: Scenario,
  progress: ScenarioProgressState,
  get: () => GameStoreState,
  set: (partial: Partial<GameStoreState>) => void,
): Promise<void> {
  try {
    const current = get().saveData ?? createDefaultSaveData()
    const updated =
      progress.part === 'clear'
        ? applyClearToSaveData(current, scenario.id, progress)
        : applyProgressToSaveData(current, progress)
    await activeSaveStorage.save(updated)
    set({ saveData: updated, saveStatus: 'ready' })
  } catch {
    // 保存に失敗してもプレイ自体は継続させる(spec の学習体験を止めない)。
    // 失敗は saveStatus 経由で結果画面等に伝える。
    set({ saveStatus: 'error' })
  }
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
  scenario: s0SampleFixture,
  progress: createInitialScenarioState(s0SampleFixture),
  saveData: null,
  saveStatus: 'idle',

  dispatch: (event) => {
    const { scenario, progress } = get()
    const next = scenarioReducer(scenario, progress, event)
    if (next !== progress) {
      set({ progress: next })
      void persistProgress(scenario, next, get, set)
    }
    return next
  },

  hydrate: async () => {
    if (get().saveStatus === 'loading') return
    set({ saveStatus: 'loading' })
    try {
      const loaded = await activeSaveStorage.load()
      set({ saveData: loaded ?? createDefaultSaveData(), saveStatus: 'ready' })
    } catch {
      set({ saveStatus: 'error' })
    }
  },

  restartScenario: (scenario) => {
    const nextScenario = scenario ?? get().scenario
    set({ scenario: nextScenario, progress: createInitialScenarioState(nextScenario) })
  },
}))

/**
 * テスト専用のリセットフック。
 *
 * 画面(src/ui/screens)は本番用シングルトン `useGameStore` を直接 import するため、
 * Testing Library で実画面を経由した結線テストを書く場合はこの関数でストアと
 * SaveStorage 実装を既知の状態に戻してから使う(zustand はモジュール単位のシングルトンで
 * Provider を介さないため、テスト間の状態漏れを防ぐにはこの明示リセットが必要)。
 */
export function resetGameStoreForTests(options?: {
  scenario?: Scenario
  storage?: SaveStorage
}): void {
  const scenario = options?.scenario ?? s0SampleFixture
  activeSaveStorage = options?.storage ?? new IndexedDbSaveStorage()
  // 部分マージ(既定)で呼ぶ: replace(第2引数 true)にすると dispatch/hydrate/restartScenario
  // 等のアクション関数まで消えてしまう(zustand の setState は replace 時に置換したオブジェクトが
  // 新しい state 全体になるため)。
  useGameStore.setState({
    scenario,
    progress: createInitialScenarioState(scenario),
    saveData: null,
    saveStatus: 'idle',
  })
}
