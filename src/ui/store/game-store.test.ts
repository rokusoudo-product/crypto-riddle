// game-store の単体テスト(dispatch/hydrate/永続化タイミング)。
// 画面を経由した結線テストは src/ui/screens/play-flow.test.tsx(Testing Library)で行う。
// ここでは「reducer への委譲」「SaveStorage への保存タイミング」というストア固有の配線ロジックのみを検証する。
import { beforeEach, describe, expect, it } from 'vitest'

import type { SaveData } from '@/core/model'
import type { SaveStorage } from '@/core/save'
import { s0SampleFixture } from '@/core/scenario/fixtures/s0-sample.fixture'

import { resetGameStoreForTests, useGameStore } from './game-store'

/** テスト用の SaveStorage フェイク(IndexedDB を介さず即座に読み書きできる)。 */
class FakeSaveStorage implements SaveStorage {
  private record: SaveData | null = null
  saveCallCount = 0

  async load(): Promise<SaveData | null> {
    return this.record
  }
  async save(data: SaveData): Promise<void> {
    this.saveCallCount += 1
    this.record = data
  }
  async clear(): Promise<void> {
    this.record = null
  }
}

/** save() のたびに例外を投げるフェイク(保存失敗時のフォールバック確認用)。 */
class FailingSaveStorage implements SaveStorage {
  async load(): Promise<SaveData | null> {
    return null
  }
  async save(): Promise<void> {
    throw new Error('保存失敗(テスト用)')
  }
  async clear(): Promise<void> {}
}

function waitForMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('useGameStore', () => {
  let storage: FakeSaveStorage

  beforeEach(() => {
    storage = new FakeSaveStorage()
    resetGameStoreForTests({ scenario: s0SampleFixture, storage })
  })

  it('初期状態は intro パートで開始する', () => {
    expect(useGameStore.getState().progress.part).toBe('intro')
    expect(useGameStore.getState().saveStatus).toBe('idle')
  })

  it('dispatch は core の scenarioReducer に委譲して進行させる', () => {
    const next = useGameStore.getState().dispatch({ type: 'ADVANCE_INTRO' })
    expect(next.part).toBe('exploration')
    expect(useGameStore.getState().progress.part).toBe('exploration')
  })

  it('不正なイベント(状態が変化しない遷移)では SaveStorage への保存が発生しない', async () => {
    // intro 中に INVESTIGATE を送っても reducer は同一参照を返す(state.test.ts で確認済み)。
    useGameStore.getState().dispatch({ type: 'INVESTIGATE', pointId: 'ip-proxy-log' })
    await waitForMicrotasks()
    expect(storage.saveCallCount).toBe(0)
  })

  it('探索でカードを獲得すると(重要進行)非同期に SaveStorage へ保存される', async () => {
    useGameStore.getState().dispatch({ type: 'ADVANCE_INTRO' })
    useGameStore.getState().dispatch({ type: 'INVESTIGATE', pointId: 'ip-proxy-log' })
    await waitForMicrotasks()
    expect(storage.saveCallCount).toBeGreaterThan(0)
    expect(useGameStore.getState().saveData?.owned_card_ids).toContain('card-proxy-log')
    expect(useGameStore.getState().saveStatus).toBe('ready')
  })

  it('hydrate は SaveStorage.load() の結果を saveData に反映する', async () => {
    await storage.save({
      version: 1,
      xp: 42,
      scenario_progress: [],
      owned_card_ids: ['card-a'],
      subject_mastery: {},
      settings: { bgm_volume: 1, se_volume: 1, reduce_motion: false },
    })
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().saveData?.xp).toBe(42)
    expect(useGameStore.getState().saveStatus).toBe('ready')
  })

  it('未保存(初回起動)時の hydrate は既定の空セーブデータを作る', async () => {
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().saveData?.owned_card_ids).toEqual([])
    expect(useGameStore.getState().saveStatus).toBe('ready')
  })

  it('保存に失敗しても進行状態(progress)自体は更新され、saveStatus が error になる', async () => {
    resetGameStoreForTests({ scenario: s0SampleFixture, storage: new FailingSaveStorage() })
    const next = useGameStore.getState().dispatch({ type: 'ADVANCE_INTRO' })
    expect(next.part).toBe('exploration')
    await waitForMicrotasks()
    expect(useGameStore.getState().progress.part).toBe('exploration')
    expect(useGameStore.getState().saveStatus).toBe('error')
  })

  it('restartScenario で進行状態を intro に戻す', () => {
    useGameStore.getState().dispatch({ type: 'ADVANCE_INTRO' })
    expect(useGameStore.getState().progress.part).toBe('exploration')
    useGameStore.getState().restartScenario()
    expect(useGameStore.getState().progress.part).toBe('intro')
  })
})
