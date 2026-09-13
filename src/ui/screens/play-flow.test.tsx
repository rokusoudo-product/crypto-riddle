/** @vitest-environment jsdom */
// T013 完了条件: 「画面操作でステートマシンが遷移する結線テスト」。
// 実際の画面(AppRoutes)を Testing Library でレンダーし、タイトル→マップ選択→導入→探索→解決
// (暗号→会話モードの問い列)→結果まで、s0-sample を1マップ通しでプレイできることを確認する。
//
// 2026-09-10(#42/#45/T033): 解決パートがカード配置(required_card_ids方式)から会話モード
// (questions[]・選択肢ボタン)へ刷新されたため、旧版(カード配置UI・follow_up失敗解説画面への
// 遷移)を前提にしていた本ファイルの内容は全面的に書き直した。s0-sample は暗号ステージを含む
// 唯一のフィクスチャのため、本ファイルは主に「暗号ステージの正解・誤答」の回帰確認を担当する
// (S1の会話モード通しプレイ・キーボード完遂は s1-play-flow.test.tsx が担当)。
//
// useGameStore は zustand のモジュール単位シングルトンで Provider を経由しないため、
// テストごとに resetGameStoreForTests でストアと SaveStorage を既知の状態へ戻す
// (game-store.ts のコメント参照)。
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

describe('1マップ通しプレイの結線(T013/T033) — s0-sample(暗号ステージを含む)', () => {
  let storage: InMemorySaveStorage

  beforeEach(() => {
    storage = new InMemorySaveStorage()
    resetGameStoreForTests({ storage, scenario: s0SampleFixture })
  })

  it('タイトル→マップ選択→導入→探索→解決(暗号→会話モードの2問)→結果まで進行できる', async () => {
    const user = userEvent.setup()
    renderApp()

    // ①タイトル: 作成時点の注意書き(#81)が表示される。
    expect(screen.getByText(/2026年9月時点の情報に基づく学習用の創作です。/)).toBeInTheDocument()

    // ①タイトル → ②マップ選択
    await user.click(screen.getByRole('link', { name: 'つづきから' }))
    expect(await screen.findByRole('heading', { name: 'マップ選択' })).toBeInTheDocument()

    // ②マップ選択 → ③導入(実データのタイトルが表示される)
    await user.click(screen.getByRole('button', { name: 'マップを選ぶ' }))
    expect(await screen.findByRole('heading', { name: '導入' })).toBeInTheDocument()
    expect(screen.getByText('株式会社アルファテック')).toBeInTheDocument()

    // ③導入 → ④探索(SKIPで即座に進む。ステートマシンが intro→exploration へ遷移する。
    // #100/#102で導入が会話フレーム化され「タップで進行」は1行ずつの送りになったため、
    // 導入の内容を確認しない本テストではSKIPで一気に抜ける)
    await user.click(screen.getByRole('button', { name: 'SKIP' }))
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

    // 暗号ステージ: わざと誤った平文を送信すると、暗号ステージのまま留まる
    // (#42/T032: 会話モードは誤答しても follow_up 画面へ遷移しない)。
    await user.type(screen.getByLabelText('復号した平文を入力してください'), 'wrong answer')
    await user.click(screen.getByRole('button', { name: '解答する' }))
    expect(await screen.findByText('不正解です。もう一度考えてみてください。')).toBeInTheDocument()
    expect(screen.getByText(/暗号文:/)).toBeInTheDocument()

    // 正しい平文を入力して解答する(正規化により大文字・小文字は問わない)。
    await user.clear(screen.getByLabelText('復号した平文を入力してください'))
    await user.type(screen.getByLabelText('復号した平文を入力してください'), 'password list attack')
    await user.click(screen.getByRole('button', { name: '解答する' }))

    // 暗号正解 → 会話モードの q-attack-method(霧島)へ進む。
    // 選択肢はConversationFrameのタイプライターが全文表示(またはスキップ)を終えるまで出ない
    // (#64/T042)ため、タップでスキップする(会話文そのものがスキップボタンのaccessible name)。
    expect(await screen.findByText('この侵入の手口は何だと見る？')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'この侵入の手口は何だと見る？' }))
    await user.click(
      screen.getByRole('button', { name: 'パスワードリスト攻撃(流出パスワードの使い回し)' }),
    )

    // q-countermeasure(橘)へ進む。
    expect(await screen.findByText('有効な再発防止策は？')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '有効な再発防止策は？' }))
    await user.click(
      screen.getByRole('button', {
        name: '多要素認証(MFA)の導入とパスワード使い回し禁止の周知',
      }),
    )

    // 防衛策成功 → clear → ⑦結果画面(実データの解説・出典が表示される)。
    expect(await screen.findByRole('heading', { name: '結果' })).toBeInTheDocument()
    expect(screen.getAllByText(/パスワードリスト攻撃/).length).toBeGreaterThan(0)
    expect(screen.getByText(/個人情報保護法に基づく報告義務/)).toBeInTheDocument()
    // FR-7: 出典表記(citation-policy §4 の主表示位置=結果画面)。
    expect(
      screen.getByText('本シナリオは以下を参考に作成したオリジナルの創作です。'),
    ).toBeInTheDocument()

    // クリア時に SaveStorage(IndexedDB 相当)へ保存されている(plan.md §6)。
    // 暗号ステージの誤答は core の wrongAttemptsByQuestionId(questions専用)には計上されない
    // (spec §8.2: 自由記述の暗号は choice 単位の reply/explanation を持たない設計、state.ts 参照)。
    await waitFor(() => {
      const saved = storage.peek()
      expect(saved?.scenario_progress).toEqual([
        expect.objectContaining({
          scenario_id: 's0-sample',
          cleared: true,
          wrong_answer_count: 0,
          consult_count: 0,
        }),
      ])
    })
  })
})
