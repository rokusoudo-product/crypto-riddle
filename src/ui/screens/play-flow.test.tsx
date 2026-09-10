/** @vitest-environment jsdom */
// T013 完了条件: 「画面操作でステートマシンが遷移する結線テスト」。
// 実際の画面(AppRoutes)を Testing Library でレンダーし、タイトル→マップ選択→導入→探索→解決
// (暗号→攻撃特定→防衛)→結果まで、s0-sample を1マップ通しでプレイできることを確認する。
// 誤答時に follow_up(失敗解説)へ遷移し、RESUME_FROM_FOLLOW_UP で解決パートへ復帰できることも確認する。
//
// T015 で既定シナリオが S1(暗号なし)に差し替わったため、本ファイルは s0-sample を明示的に
// resetGameStoreForTests へ渡し、暗号ステージを含む正解ルート・誤答フォローの回帰確認を維持する
// (S1 の通しプレイは src/ui/screens/s1-play-flow.test.tsx を参照)。
//
// useGameStore は zustand のモジュール単位シングルトンで Provider を経由しないため、
// テストごとに resetGameStoreForTests でストアと SaveStorage を既知の状態へ戻す
// (game-store.ts のコメント参照)。
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SaveData } from '@/core/model'
import type { SaveStorage } from '@/core/save'
import { s0SampleFixture } from '@/core/scenario/fixtures/s0-sample.fixture'
import { AppRoutes } from '@/ui/routes'
import { resetGameStoreForTests } from '@/ui/store/game-store'

class InMemorySaveStorage implements SaveStorage {
  private record: SaveData | null = null
  async load(): Promise<SaveData | null> {
    return this.record
  }
  async save(data: SaveData): Promise<void> {
    this.record = data
  }
  async clear(): Promise<void> {
    this.record = null
  }
  peek(): SaveData | null {
    return this.record
  }
}

afterEach(() => cleanup())

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('1マップ通しプレイの結線(T013)', () => {
  let storage: InMemorySaveStorage

  beforeEach(() => {
    storage = new InMemorySaveStorage()
    resetGameStoreForTests({ storage, scenario: s0SampleFixture })
  })

  it('タイトル→マップ選択→導入→探索→解決(正解ルート)→結果まで進行できる', async () => {
    const user = userEvent.setup()
    renderApp()

    // ①タイトル → ②マップ選択
    await user.click(screen.getByRole('link', { name: 'つづきから' }))
    expect(await screen.findByRole('heading', { name: 'マップ選択' })).toBeInTheDocument()

    // ②マップ選択 → ③導入(実データのタイトルが表示される)
    await user.click(screen.getByRole('button', { name: 'マップを選ぶ' }))
    expect(await screen.findByRole('heading', { name: '導入' })).toBeInTheDocument()
    expect(screen.getByText('株式会社アルファテック')).toBeInTheDocument()

    // ③導入 → ④探索(タップで進行。ステートマシンが intro→exploration へ遷移する)
    await user.click(screen.getByRole('button', { name: 'タップで進行' }))
    expect(await screen.findByRole('heading', { name: '探索' })).toBeInTheDocument()
    expect(screen.getByText('プロキシログ')).toBeInTheDocument()

    // 「解決へ進む」は全ポイント調査済みになるまで無効(canEnterResolution)。
    expect(screen.getByRole('button', { name: '解決へ進む' })).toBeDisabled()

    // 全調査ポイントを調査する。
    const investigateButtons = screen.getAllByRole('button', { name: '調査する' })
    for (const button of investigateButtons) {
      await user.click(button)
    }
    expect(screen.queryByRole('button', { name: '調査する' })).not.toBeInTheDocument()
    expect(screen.getAllByText('調査済み')).toHaveLength(investigateButtons.length)

    // ④探索 → ⑤解決(暗号ステージ)
    const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
    expect(enterResolution).toBeEnabled()
    await user.click(enterResolution)
    expect(await screen.findByRole('heading', { name: '解決' })).toBeInTheDocument()
    expect(screen.getByText(/暗号文:/)).toBeInTheDocument()

    // 暗号ステージ: 正しい平文を入力して解答する(正規化により大文字・小文字は問わない)。
    await user.type(screen.getByLabelText('復号した平文を入力してください'), 'password list attack')
    await user.click(screen.getByRole('button', { name: '解答する' }))

    // 暗号正解 → attack_identification ステージ(カード配置UI)へ進む(同じ /resolve のまま)。
    expect(
      await screen.findByText(/攻撃手段の特定に必要なカードを選んで配置してください/),
    ).toBeInTheDocument()

    // 攻撃特定の正解カード4枚をタップ配置で選ぶ(T014 のタップ配置と接続)。
    // 「プロキシサーバ」はダミーカード(card-proxy-log-noise)と同じ source 表記のため、
    // 本文の一意な文言でカードを特定する。
    for (const bodyFragment of [
      '深夜2時台',
      'パスワードリストに含まれる文字列',
      '経理部 田中',
      'セキュリティ注意喚起',
    ]) {
      const pool = screen.getByRole('list', { name: '手持ちカード' })
      await user.click(within(pool).getByRole('button', { name: new RegExp(bodyFragment) }))
      const emptySlot = screen.getAllByRole('button', { name: /\(空\)へ配置する/ })[0]
      await user.click(emptySlot)
    }
    await user.click(screen.getByRole('button', { name: '攻撃手段を特定する' }))

    // 特定成功 → countermeasure ステージへ進む。
    expect(await screen.findByText(/への有効な対策カードを配置してください/)).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('list', { name: '手持ちカード' })).getByRole('button', {
        name: /多要素認証/,
      }),
    )
    await user.click(screen.getByRole('button', { name: /\(空\)へ配置する/ }))
    await user.click(screen.getByRole('button', { name: '対策を選ぶ' }))

    // 防衛策成功 → clear → ⑦結果画面(実データの解説・出典が表示される)。
    expect(await screen.findByRole('heading', { name: '結果' })).toBeInTheDocument()
    expect(screen.getAllByText(/パスワードリスト攻撃/).length).toBeGreaterThan(0)
    expect(screen.getByText(/個人情報保護法に基づく報告義務/)).toBeInTheDocument()

    // クリア時に SaveStorage(IndexedDB 相当)へ保存されている(plan.md §6)。
    await waitFor(() => {
      const saved = storage.peek()
      expect(saved?.scenario_progress).toEqual([
        expect.objectContaining({ scenario_id: 's0-sample', cleared: true }),
      ])
    })
  })

  it('誤答すると失敗解説(follow_up)へ遷移し、やり直すと解決パートへ復帰できる', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: 'つづきから' }))
    await user.click(screen.getByRole('button', { name: 'マップを選ぶ' }))
    await user.click(screen.getByRole('button', { name: 'タップで進行' }))
    for (const button of screen.getAllByRole('button', { name: '調査する' })) {
      await user.click(button)
    }
    await user.click(screen.getByRole('button', { name: '解決へ進む' }))

    // わざと誤った平文を送信する。
    await user.type(screen.getByLabelText('復号した平文を入力してください'), 'wrong answer')
    await user.click(screen.getByRole('button', { name: '解答する' }))

    // follow_up へ遷移し、失敗解説画面へ自動遷移する(scenarioReducer の遷移結果に基づく navigate)。
    expect(await screen.findByRole('heading', { name: '失敗解説' })).toBeInTheDocument()
    expect(screen.getByText('霧島')).toBeInTheDocument()
    expect(
      screen.getByText('急ぐな。まずアルファベットの並びをよく見ろ。ずれ幅は一定のはずだ。', {
        exact: false,
      }),
    ).toBeInTheDocument()

    // 「初動をやり直す」は確認ダイアログを経由する(DESIGN.md)。
    await user.click(screen.getByRole('button', { name: '初動をやり直す' }))
    expect(screen.getByRole('alertdialog', { name: '初動をやり直す確認' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'やり直す' }))

    // RESUME_FROM_FOLLOW_UP で cipher ステージに復帰し、/resolve へ戻る。
    expect(await screen.findByRole('heading', { name: '解決' })).toBeInTheDocument()
    expect(screen.getByText(/暗号文:/)).toBeInTheDocument()

    // 復帰後、正しい答えを送れば通常どおり次のステージに進める。
    await user.type(screen.getByLabelText('復号した平文を入力してください'), 'PASSWORD LIST ATTACK')
    await user.click(screen.getByRole('button', { name: '解答する' }))
    expect(
      await screen.findByText(/攻撃手段の特定に必要なカードを選んで配置してください/),
    ).toBeInTheDocument()
  })
})
