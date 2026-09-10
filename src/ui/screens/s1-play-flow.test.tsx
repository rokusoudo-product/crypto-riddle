/** @vitest-environment jsdom */
// T016/T033 完了条件: 「ブラウザで S1 を最初から最後までプレイでき、クリア時に XP・分野習熟が保存される」
// (T016)、「キーボードのみで回答・相談・カード閲覧・クリアまで完遂できる結線テストが通る」(T033)。
// 実際の画面(AppRoutes)を Testing Library でレンダーし、タイトル→マップ選択→導入→探索→
// 解決(会話モード。暗号なし: 起点→初動の2問)→結果まで、S1「標的型メールからの侵入」を
// 1マップ通しでプレイできることを確認する。
//
// 2026-09-10(#42/#45/T033): 解決パートがカード配置(required_card_ids方式)から会話モード
// (questions[]・選択肢ボタン)へ刷新されたため、旧版(カード配置UI・attack_identification/
// countermeasure ステージ)を前提にしていた本ファイルの内容は全面的に書き直した。
// マップ選択→導入→探索は既存UIのまま(クリック操作)なので変更せず、解決パートのみ
// 会話モードUI(ConversationFrame・選択肢ボタン・相談・カードドロワー)に合わせて書き直し、
// キーボード操作(Tab/Enter)で完遂できることを重点的に確認する。
//
// useGameStore は zustand のモジュール単位シングルトンで Provider を経由しないため、
// テストごとに resetGameStoreForTests でストアと SaveStorage を既知の状態へ戻す
// (game-store.ts のコメント参照)。S1 は T015 以降の既定シナリオのため scenario を明示指定しない。
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SaveData } from '@/core/model'
import type { SaveStorage } from '@/core/save'
import { AppRoutes } from '@/ui/routes'
import { resetGameStoreForTests } from '@/ui/store/game-store'
import {
  CLEAR_XP_REWARD,
  CONSULT_XP_PENALTY,
  MASTERY_POINTS_PER_TAG,
  WRONG_ANSWER_XP_PENALTY,
} from '@/ui/store/save-integration'

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

/** 探索を最後まで終え、解決パート(会話モード, q-entry-point)へ進める共通手順。クリック操作。 */
async function playThroughExplorationToResolution(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByRole('link', { name: 'つづきから' }))
  expect(await screen.findByRole('heading', { name: 'マップ選択' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'マップを選ぶ' }))
  expect(await screen.findByRole('heading', { name: '導入' })).toBeInTheDocument()
  expect(screen.getByText('株式会社浜通商事')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'タップで進行' }))
  expect(await screen.findByRole('heading', { name: '探索' })).toBeInTheDocument()
  expect(screen.getByText('プロキシログ')).toBeInTheDocument()

  for (const button of screen.getAllByRole('button', { name: '調査する' })) {
    await user.click(button)
  }
  expect(screen.queryByRole('button', { name: '調査する' })).not.toBeInTheDocument()

  const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
  expect(enterResolution).toBeEnabled()
  await user.click(enterResolution)
  expect(await screen.findByRole('heading', { name: '解決' })).toBeInTheDocument()
}

describe('S1「標的型メールからの侵入」通しプレイ(T016/T033)', () => {
  let storage: InMemorySaveStorage

  beforeEach(() => {
    storage = new InMemorySaveStorage()
    resetGameStoreForTests({ storage })
  })

  it(
    'キーボードのみで、誤答→相談→カード閲覧→正答→次の問い→正答→クリアまで完遂でき、' +
      '誤答・相談ぶんXPが減算されて保存される(T033完了条件・FR-11)',
    async () => {
      const user = userEvent.setup()
      renderApp()

      await playThroughExplorationToResolution(user)

      // 会話フレーム: 発話者=霧島(立ち絵の名札+会話ウィンドウのピルの2箇所に表示)、問い文が表示される
      // (会話モード, spec §8.2)。
      expect(screen.getAllByText('霧島').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('この侵入、どこから入られたと見る？')).toBeInTheDocument()

      // --- q-entry-point: キーボードで誤答を選ぶ(choices[1] = ウイルス対策ソフト〜) ---
      await user.tab() // choice[0](正解)
      await user.tab() // choice[1](誤答)
      expect(document.activeElement).toHaveTextContent('ウイルス対策ソフトの定義ファイル更新エラー')
      await user.keyboard('{Enter}')

      // 誤答フォロー: 選択肢は残ったまま reply + 段階解説が表示される(aria-live, role=alertではない)。
      expect(
        await screen.findByText(/怪しく見えるものと、この侵入を直接裏付けるものは別だ/),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/「怪しく見える」ことと「今回の侵入を裏付ける証拠であること」は違う/),
      ).toBeInTheDocument()
      // 問い文(line)は誤答後も変わらず表示され続ける(プレイヤーが問いを見失わない)。
      expect(screen.getByText('この侵入、どこから入られたと見る？')).toBeInTheDocument()

      // --- 相談(コストあり)をキーボードで使う ---
      await user.tab() // choice[2]
      await user.tab() // 相談ボタン
      expect(document.activeElement).toHaveTextContent('相談する')
      expect(document.activeElement).toHaveTextContent('残り3回')
      await user.keyboard('{Enter}')
      expect(
        await screen.findByText(
          'フィッシングメールの実在・マクロ実行の記録・C2通信の痕跡・中野の証言を分野で整理して提示する。',
        ),
      ).toBeInTheDocument()

      // --- 手持ちカードをキーボードで無料閲覧する(相談との違いをラベルで明示) ---
      await user.tab() // カードドロワーの開閉ボタン
      expect(document.activeElement).toHaveTextContent('手持ちカードを見る（無料')
      await user.keyboard('{Enter}')
      expect(await screen.findByRole('heading', { name: '手持ちカード' })).toBeInTheDocument()
      // 探索で獲得したカード(is_dummy含む)が並ぶ。
      expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)

      await user.tab() // 閉じるボタン
      expect(document.activeElement).toHaveAccessibleName('手持ちカードを閉じる')
      await user.keyboard('{Enter}')
      expect(screen.queryByRole('heading', { name: '手持ちカード' })).not.toBeInTheDocument()

      // --- q-entry-point: 正解を選ぶ(ドロワーを閉じてフォーカスが失われたので Tab から選び直す) ---
      await user.tab() // choice[0](正解)
      expect(document.activeElement).toHaveTextContent('取引先を装った請求書メールの添付ファイル')
      await user.keyboard('{Enter}')

      // q-initial-response(橘)へ進む。選択肢ボタンが再利用され、choice[0]がそのままフォーカスされ続ける
      // (React が同じ key のノードを再利用するため)。念のため内容を確認してから決定する。
      expect(await screen.findByText('感染が疑われる端末への初動対応は？')).toBeInTheDocument()
      expect(document.activeElement).toHaveTextContent('ネットワークから論理的に隔離し')
      await user.keyboard('{Enter}')

      // クリア → ⑦結果画面へ遷移する。
      expect(await screen.findByRole('heading', { name: '結果' })).toBeInTheDocument()

      // 最後の問い(q-initial-response)の正解 reply は解決画面では表示する間がないため、
      // 結果画面側で progress.lastAnswerFeedback を参照して表示する。
      expect(
        screen.getByText('それが正しい初動です。IoCを抽出して被害範囲の特定を進めましょう。'),
      ).toBeInTheDocument()

      // FR-11(spec §8.4): 誤答1回・相談1回ぶんXPが減算される。
      const expectedXp = CLEAR_XP_REWARD - 1 * WRONG_ANSWER_XP_PENALTY - 1 * CONSULT_XP_PENALTY
      expect(screen.getByText('誤答: 1回 / 相談: 1回')).toBeInTheDocument()
      expect(await screen.findByText(`獲得XP: +${expectedXp}`)).toBeInTheDocument()
      expect(await screen.findByText(`累計XP: ${expectedXp}`)).toBeInTheDocument()

      await waitFor(() => {
        const saved = storage.peek()
        expect(saved?.xp).toBe(expectedXp)
        expect(saved?.scenario_progress).toEqual([
          expect.objectContaining({
            scenario_id: 's1-targeted-email-intrusion',
            cleared: true,
            wrong_answer_count: 1,
            consult_count: 1,
            no_hint_clear: false,
          }),
        ])
      })
    },
  )

  it('誤答・相談なしでクリアするとXP減算なし・no_hint_clear:trueで保存される(FR-6・FR-11回帰)', async () => {
    const user = userEvent.setup()
    renderApp()

    await playThroughExplorationToResolution(user)

    await user.click(
      screen.getByRole('button', {
        name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
      }),
    )
    expect(await screen.findByText('感染が疑われる端末への初動対応は？')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'ネットワークから論理的に隔離し(LANケーブル抜線・Wi-Fi無効化)、電源は落とさず揮発性メモリとディスクの証拠を保全する',
      }),
    )

    expect(await screen.findByRole('heading', { name: '結果' })).toBeInTheDocument()
    expect(screen.getByText('誤答: 0回 / 相談: 0回')).toBeInTheDocument()
    expect(await screen.findByText(`獲得XP: +${CLEAR_XP_REWARD}`)).toBeInTheDocument()
    expect(await screen.findByText(`累計XP: ${CLEAR_XP_REWARD}`)).toBeInTheDocument()

    await waitFor(() => {
      const saved = storage.peek()
      expect(saved?.xp).toBe(CLEAR_XP_REWARD)
      expect(saved?.scenario_progress).toEqual([
        expect.objectContaining({
          scenario_id: 's1-targeted-email-intrusion',
          cleared: true,
          wrong_answer_count: 0,
          consult_count: 0,
          no_hint_clear: true,
        }),
      ])
      for (const tag of ['攻撃手法', 'インシデント対応', '法制度', 'ネットワーク基盤'] as const) {
        expect(saved?.subject_mastery[tag]).toBe(MASTERY_POINTS_PER_TAG)
      }
    })
  })
})
