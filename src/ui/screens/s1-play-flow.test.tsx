/** @vitest-environment jsdom */
// T016 完了条件: 「ブラウザで S1 を最初から最後までプレイでき、クリア時に XP・分野習熟が保存される」。
// 実際の画面(AppRoutes)を Testing Library でレンダーし、タイトル→マップ選択→導入→探索→
// 解決(暗号なし: 攻撃特定→防衛)→結果まで、S1「標的型メールからの侵入」を1マップ通しでプレイできることを
// 確認する。s0-sample の暗号を含む正解ルート・誤答フォローの回帰は play-flow.test.tsx が担当するため、
// ここでは (1) 暗号なしシナリオの resolution が attack_identification から始まること、
// (2) FR-6(XP・分野習熟の加算保存)、(3) 教育的失敗の分岐(#5: 感染端末シャットダウン→揮発性メモリ
// 証拠消失→やり直し)の3点に焦点を当てる。
//
// useGameStore は zustand のモジュール単位シングルトンで Provider を経由しないため、
// テストごとに resetGameStoreForTests でストアと SaveStorage を既知の状態へ戻す
// (game-store.ts のコメント参照)。S1 は T015 以降の既定シナリオのため scenario を明示指定しない。
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SaveData } from '@/core/model'
import type { SaveStorage } from '@/core/save'
import { AppRoutes } from '@/ui/routes'
import { resetGameStoreForTests } from '@/ui/store/game-store'
import { CLEAR_XP_REWARD, MASTERY_POINTS_PER_TAG } from '@/ui/store/save-integration'

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

/** 探索を最後まで終え、解決パート(attack_identification)へ進める共通手順。 */
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
}

/** attack_identification ステージで正解の4枚をタップ配置して確定する。 */
async function submitCorrectAttackIdentification(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  expect(
    await screen.findByText(/攻撃手段の特定に必要なカードを選んで配置してください/),
  ).toBeInTheDocument()
  // 暗号なしシナリオ(S1)のため「暗号文:」は表示されない。
  expect(screen.queryByText(/暗号文:/)).not.toBeInTheDocument()

  for (const bodyFragment of [
    '実在する取引先名を騙り',
    'PowerShellプロセス',
    'ビーコン通信のパターン',
    '深く確認せずに開いてしまいました',
  ]) {
    const pool = screen.getByRole('list', { name: '手持ちカード' })
    await user.click(within(pool).getByRole('button', { name: new RegExp(bodyFragment) }))
    const emptySlot = screen.getAllByRole('button', { name: /\(空\)へ配置する/ })[0]
    await user.click(emptySlot)
  }
  await user.click(screen.getByRole('button', { name: '攻撃手段を特定する' }))
}

// 2026-09-10(#42/#44): 解決パートがカード配置(required_card_ids方式)から会話モード
// (questions[]・選択肢ボタン)へ刷新されたため、本ファイルが前提とするカード配置UI・
// follow_up(失敗解説)画面への遷移は core のステートマシンから撤去された。
// 本PRのスコープは core(T030-032)のため、結線テストの会話モードへの更新は #45(T036)で行う。
describe.skip('S1「標的型メールからの侵入」通しプレイ(T016) — #45(T036)で会話モードへ更新', () => {
  let storage: InMemorySaveStorage

  beforeEach(() => {
    storage = new InMemorySaveStorage()
    resetGameStoreForTests({ storage })
  })

  it('タイトル→マップ選択→導入→探索→解決(暗号なし: 攻撃特定→防衛)→結果まで進行し、XP・分野習熟が保存される', async () => {
    const user = userEvent.setup()
    renderApp()

    await playThroughExplorationToResolution(user)
    await submitCorrectAttackIdentification(user)

    // 特定成功 → countermeasure ステージへ進む(暗号ステージを飛ばしているので直接ここに来る)。
    expect(await screen.findByText(/への有効な対策カードを配置してください/)).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('list', { name: '手持ちカード' })).getByRole('button', {
        name: /ネットワークから論理的に隔離する/,
      }),
    )
    await user.click(screen.getByRole('button', { name: /\(空\)へ配置する/ }))
    await user.click(screen.getByRole('button', { name: '対策を選ぶ' }))

    // 防衛策成功 → clear → ⑦結果画面。
    expect(await screen.findByRole('heading', { name: '結果' })).toBeInTheDocument()
    expect(screen.getAllByText(/標的型メール攻撃/).length).toBeGreaterThan(0)
    expect(screen.getByText(/個人情報保護法に基づく報告要否/)).toBeInTheDocument()

    // FR-7: 出典表記(citation-policy §4 の主表示位置=結果画面)。
    expect(
      screen.getByText('本シナリオは以下を参考に作成したオリジナルの創作です。'),
    ).toBeInTheDocument()
    expect(screen.getByText(/攻撃手口/)).toBeInTheDocument()

    // FR-6: 事件クリアで XP・分野習熟が加算・保存される(前回の実機確認で xp:0 のままだった不具合の回帰確認)。
    // 累計XP(saveData.xp)は SaveStorage への非同期保存が完了してから store に反映されるため、
    // 同期の getByText ではなく findByText(再試行あり)で待つ。
    expect(await screen.findByText(`獲得XP: +${CLEAR_XP_REWARD}`)).toBeInTheDocument()
    expect(await screen.findByText(`累計XP: ${CLEAR_XP_REWARD}`)).toBeInTheDocument()

    await waitFor(() => {
      const saved = storage.peek()
      expect(saved?.xp).toBe(CLEAR_XP_REWARD)
      expect(saved?.scenario_progress).toEqual([
        expect.objectContaining({
          scenario_id: 's1-targeted-email-intrusion',
          cleared: true,
        }),
      ])
      for (const tag of ['攻撃手法', 'インシデント対応', '法制度', 'ネットワーク基盤'] as const) {
        expect(saved?.subject_mastery[tag]).toBe(MASTERY_POINTS_PER_TAG)
      }
    })
  })

  it('教育的失敗の分岐(#5): 感染端末をシャットダウンすると失敗解説へ進み、やり直すと正しい初動でクリアできる', async () => {
    const user = userEvent.setup()
    renderApp()

    await playThroughExplorationToResolution(user)
    await submitCorrectAttackIdentification(user)

    expect(await screen.findByText(/への有効な対策カードを配置してください/)).toBeInTheDocument()

    // わざと「電源を直ちに落とす」対策(教育的失敗の分岐)を選ぶ。
    await user.click(
      within(screen.getByRole('list', { name: '手持ちカード' })).getByRole('button', {
        name: /電源を直ちに落とし/,
      }),
    )
    await user.click(screen.getByRole('button', { name: /\(空\)へ配置する/ }))
    await user.click(screen.getByRole('button', { name: '対策を選ぶ' }))

    // follow_up(失敗解説)へ遷移し、「なぜ誤りか」(揮発性メモリの証拠消失)が解説される。
    expect(await screen.findByRole('heading', { name: '失敗解説' })).toBeInTheDocument()
    expect(screen.getByText('橘')).toBeInTheDocument()
    expect(screen.getByText(/揮発性メモリの情報が失われます/)).toBeInTheDocument()

    // 「初動をやり直す」は確認ダイアログを経由する(DESIGN.md)。
    await user.click(screen.getByRole('button', { name: '初動をやり直す' }))
    expect(screen.getByRole('alertdialog', { name: '初動をやり直す確認' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'やり直す' }))

    // RESUME_FROM_FOLLOW_UP で countermeasure ステージに復帰する(暗号なしのため cipher には戻らない)。
    expect(await screen.findByRole('heading', { name: '解決' })).toBeInTheDocument()
    expect(await screen.findByText(/への有効な対策カードを配置してください/)).toBeInTheDocument()

    // 復帰後、正しい初動(論理的隔離)を選べば通常どおりクリアできる。
    await user.click(
      within(screen.getByRole('list', { name: '手持ちカード' })).getByRole('button', {
        name: /ネットワークから論理的に隔離する/,
      }),
    )
    await user.click(screen.getByRole('button', { name: /\(空\)へ配置する/ }))
    await user.click(screen.getByRole('button', { name: '対策を選ぶ' }))
    expect(await screen.findByRole('heading', { name: '結果' })).toBeInTheDocument()
  })
})
