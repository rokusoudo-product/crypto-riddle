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
// `src/core/scenario/fixtures/*.fixture.ts` は各シナリオ YAML の内容を写した純粋な TypeScript
// リテラル(常にビルド・テストの両方で参照可能)であるため、本 PR (T015/T016)でもこちらを
// プレイ用データとして使う(README 更新は複数マップが実データで揃う T019〜T021 以降を想定)。
//
// T015(Issue #5)で S1「標的型メールからの侵入」が実データとして揃ったため、T013 時点の
// s0-sample(スキーマ演習用サンプル。暗号を含む点も含めて S1 とは意図的に別内容)から
// 既定シナリオを S1 に差し替えた。`scenarios` は「マップ選択に表示する選択可能なシナリオ一覧」
// (T016: マップ選択に S1 を出す)を持たせるための配列で、S2〜S3 が実装される Phase 5 以降で
// 要素が増える想定。
//
// Issue #74(#6量産1本目)で S2「VPN装置の脆弱性放置とランサムウェア感染」が実データとして
// 揃ったため、`scenarios` に追加した(マップ選択で両方選べる)。DEFAULT_SCENARIO(初回起動時の
// 既定プレイ対象)は引き続き S1 のまま変更しない(#74 の実装範囲はマップ追加のみ)。
//
// Issue #75(#6量産2本目)で S3「ECサイトのカード情報漏洩」が実データとして揃ったため、
// 同様に `scenarios` に追加した(マップ選択で3件とも選べる)。DEFAULT_SCENARIO は変更しない。
//
// Issue #76(#6量産4本目・法務新規シナリオ)で SL「委託先クラウドストレージからの個人データ漏えい」が
// 実データとして揃ったため、同様に `scenarios` に追加した(マップ選択で4件とも選べる)。
// DEFAULT_SCENARIO は変更しない。
import { create } from 'zustand'

import type { SaveData, Scenario } from '@/core/model'
import { IndexedDbSaveStorage, type SaveStorage } from '@/core/save'
import {
  createInitialScenarioState,
  scenarioReducer,
  type ScenarioEvent,
  type ScenarioProgressState,
} from '@/core/scenario'
import { s1TargetedEmailIntrusionFixture } from '@/core/scenario/fixtures/s1-targeted-email-intrusion.fixture'
import { s2VpnRansomwareFixture } from '@/core/scenario/fixtures/s2-vpn-ransomware.fixture'
import { s3EcCardLeakFixture } from '@/core/scenario/fixtures/s3-ec-card-leak.fixture'
import { slConsignmentBreachFixture } from '@/core/scenario/fixtures/sl-consignment-breach.fixture'

import {
  applyClearToSaveData,
  applyProgressToSaveData,
  createDefaultSaveData,
} from './save-integration'

export type SaveStatus = 'idle' | 'loading' | 'ready' | 'error'

const DEFAULT_SCENARIO = s1TargetedEmailIntrusionFixture

export interface GameStoreState {
  /** マップ選択画面に表示する、選択可能なシナリオ一覧(T016)。 */
  scenarios: Scenario[]
  /** 現在プレイ中のシナリオ(マップ)。 */
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
        ? applyClearToSaveData(current, scenario, progress)
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
  scenarios: [DEFAULT_SCENARIO, s2VpnRansomwareFixture, s3EcCardLeakFixture, slConsignmentBreachFixture],
  scenario: DEFAULT_SCENARIO,
  progress: createInitialScenarioState(DEFAULT_SCENARIO),
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
  /** マップ選択に表示するシナリオ一覧。省略時は `scenario`(またはその既定値)の1件のみ。 */
  scenarios?: Scenario[]
  storage?: SaveStorage
}): void {
  const scenario = options?.scenario ?? DEFAULT_SCENARIO
  const scenarios = options?.scenarios ?? [scenario]
  activeSaveStorage = options?.storage ?? new IndexedDbSaveStorage()
  // 部分マージ(既定)で呼ぶ: replace(第2引数 true)にすると dispatch/hydrate/restartScenario
  // 等のアクション関数まで消えてしまう(zustand の setState は replace 時に置換したオブジェクトが
  // 新しい state 全体になるため)。
  useGameStore.setState({
    scenarios,
    scenario,
    progress: createInitialScenarioState(scenario),
    saveData: null,
    saveStatus: 'idle',
  })
}
