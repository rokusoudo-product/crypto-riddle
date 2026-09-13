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
//
// 2026-09-13(#103): S1データを台本v2.2へ移植したことに伴い、期待するline文言を更新した。
// intro.background削除・character_intros刷新に伴う導入まわりのアサーションは変更不要
// (SKIPで直行するため)。探索のcollect.dialogue[]化(多ターン・NPC直接発話)に伴い、
// 従来1回のskipCollectResultAndCloseで済んでいた箇所をターン数ぶん繰り返し呼ぶ形に変更した。
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SaveData } from '@/core/model'
import type { SaveStorage } from '@/core/save'
import { AppRoutes } from '@/ui/routes'
import { resetGameStoreForTests, useGameStore } from '@/ui/store/game-store'
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

// #64/T042: 会話フレーム(ConversationFrame)にタイプライター表示を追加したため、選択肢・相談・
// カードドロワー等の操作要素(children)は、会話文の全文表示(またはスキップ)後にしか描画されない
// (送り途中の誤タップ防止、DESIGN.md「タイプライター表示」節)。既存の「選択肢がすぐ押せる」
// 前提のテストは、スキップ操作を挟むよう更新する。
//
// タイプライター演出中、スキップ用ボタンは会話ウィンドウ内で最初(かつ唯一)のフォーカス可能要素
// になる(選択肢等はまだ非表示のため)。スキップするとchildren内の最初のフォーカス可能要素へ
// 自動的にフォーカスが移る(ConversationFrame側の仕様、#64/T042)ため、Tab+Enterで
// キーボードのみでスキップできる。
async function skipTypewriterByKeyboard(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.tab()
  await user.keyboard('{Enter}')
}

/**
 * タップ(クリック)でタイプライターをスキップする。ConversationFrame は演出中、sr-only の
 * 全文テキストをスキップボタンの accessible name にする(#64/T042)ため、会話文そのもので
 * `getByRole('button', { name: line })` として引ける。
 */
async function skipTypewriterByClick(
  user: ReturnType<typeof userEvent.setup>,
  line: string,
): Promise<void> {
  await user.click(screen.getByRole('button', { name: line }))
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

  await user.click(screen.getByRole('button', { name: 'SKIP' }))
  expect(await screen.findByRole('heading', { name: '探索' })).toBeInTheDocument()

  // S1は背景シーン(#57/T040)を持つため、「調査ポイント一覧」はトグルを開くまで表示されない
  // (#66→T047でトグル化)。
  await user.click(screen.getByRole('button', { name: '調査ポイント一覧' }))
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
      // (会話モード, spec §8.2)。タイプライター演出中でも、問い文の全文は支援技術向けに
      // sr-only で一度に渡されているため(#64/T042)、この時点で getByText は見つかる。
      expect(screen.getAllByText('霧島').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('この侵入、どこから入られたと見る？')).toBeInTheDocument()

      // 選択肢はタイプライターの全文表示(またはスキップ)後にしか出ない(#64/T042)ため、
      // まずキーボード(Tab→Enter)でスキップする。スキップすると children 内の最初の
      // フォーカス可能要素(=choice[0])へ自動的にフォーカスが移る。
      await skipTypewriterByKeyboard(user)
      expect(document.activeElement).toHaveTextContent('取引先を装った請求書メールの添付ファイル')

      // --- q-entry-point: キーボードで誤答を選ぶ(choices[1] = 公開サーバーの脆弱性〜) ---
      await user.tab() // choice[1](誤答。直前のスキップでchoice[0]へフォーカス済みのため1回で足りる)
      expect(document.activeElement).toHaveTextContent('公開サーバーの脆弱性を突かれた侵入')
      await user.keyboard('{Enter}')

      // 誤答フォロー: 選択肢は残ったまま reply + 段階解説が表示される(aria-live, role=alertではない)。
      expect(
        await screen.findByText(
          /その場合は境界の通信記録に、外から内への不審なアクセスが残るはずだ/,
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/「怪しく見える」ことと「今回の侵入を裏付ける証拠」は違う/),
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

      // q-initial-response(橘)へ進む。line(問い文)が変わったのでタイプライターは先頭から
      // 再生され、選択肢は再び全文表示(またはスキップ)後まで非表示になる(#64/T042)。
      // 旧版(タイプライター導入前)は選択肢ボタンが同じkeyで再利用されフォーカスが移り続けたが、
      // 現在は children ごと一旦消えるため、ここでも改めてスキップが必要。
      expect(await screen.findByText('感染が疑われる端末への初動対応は？')).toBeInTheDocument()
      await skipTypewriterByKeyboard(user)
      expect(document.activeElement).toHaveTextContent('ネットワークから論理的に隔離し')
      await user.keyboard('{Enter}')

      // クリア → ⑦結果画面へ遷移する。
      expect(await screen.findByRole('heading', { name: '結果' })).toBeInTheDocument()

      // 最後の問い(q-initial-response)の正解 reply は解決画面では表示する間がないため、
      // 結果画面側で progress.lastAnswerFeedback を参照して表示する。
      expect(
        screen.getByText(
          'それが正しい初動です、あなた。IoCを抽出して被害範囲の特定へ進みましょう。この保全が、後の報告と説明責任の裏付けになります。',
        ),
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

    // 選択肢はタイプライターの全文表示(またはスキップ)後にしか出ない(#64/T042)。
    await skipTypewriterByClick(user, 'この侵入、どこから入られたと見る？')
    await user.click(
      screen.getByRole('button', {
        name: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
      }),
    )
    expect(await screen.findByText('感染が疑われる端末への初動対応は？')).toBeInTheDocument()
    await skipTypewriterByClick(user, '感染が疑われる端末への初動対応は？')
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

// Issue #57/T041: S1 に投入した実データの scenes(執務室／サーバ室)を、一覧ではなく
// 背景シーンのホットスポット経由だけで探索できることを確認する(データ投入(#57/T040)と
// 探索UI(#56/T038)の結線)。既存の「S1 通しプレイ」(上記 describe)は一覧側の「調査する」
// ボタンのみを使うため、scenes 実データの結線はこのテストでしか確認できない。
describe('S1「標的型メールからの侵入」背景シーン経由の探索(#57/T041)', () => {
  let storage: InMemorySaveStorage

  beforeEach(() => {
    storage = new InMemorySaveStorage()
    resetGameStoreForTests({ storage })
  })

  /**
   * 調査結果の会話ウィンドウ(#52 Phase4.7/#66・T044)を、指定した台詞(line)でスキップして
   * 閉じる共通手順。会話ウィンドウは専用の「閉じる」ボタンを持たず、ウィンドウ全体が
   * 1つの操作領域になる(T048)。accessible nameは会話文(line)のまま変わらないため、
   * 同じ`getByRole('button', {name: line})`を1回目=スキップ・2回目=閉じるに使い回す。
   */
  async function skipCollectResultAndClose(
    user: ReturnType<typeof userEvent.setup>,
    line: string,
  ): Promise<void> {
    expect(await screen.findByText(line)).toBeInTheDocument()
    await skipTypewriterByClick(user, line)
    await user.click(screen.getByRole('button', { name: line }))
  }

  it(
    '背景シーンのホットスポットのみで全9ポイントを調査でき、調査結果が会話フレームで台詞提示され' +
      '(#66)、PCのdangerは教育的FBのみ(XP減算なし・ペナルティ無し)・電源を落とした後も操作継続できる(詰み防止・spec §8.4)',
    async () => {
      const user = userEvent.setup()
      renderApp()

      await user.click(screen.getByRole('link', { name: 'つづきから' }))
      await user.click(await screen.findByRole('button', { name: 'マップを選ぶ' }))
      await user.click(await screen.findByRole('button', { name: 'SKIP' }))
      expect(await screen.findByRole('heading', { name: '探索' })).toBeInTheDocument()

      // 執務室／サーバ室の2シーンタブが表示される(既定は執務室)。
      expect(screen.getByRole('tab', { name: '執務室' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: 'サーバ室' })).toBeInTheDocument()

      // --- 執務室: PC(経理部 中野の端末。collect/danger/noopの3action=アクションシート) ---
      // 会話オーバーレイが開くたびにホットスポットは一度アンマウント→再マウントされる(T047)ため、
      // 変数を使い回さずその都度クエリし直す(取得済みの参照は古いDOMノードを指したままになる)。
      // 名前の完全一致ではなく前方一致(正規表現)にする: 調査済みになると
      // aria-labelに「・調査済み」が付与され、完全一致では引けなくなるため。
      const getPcHotspot = () => screen.getByRole('button', { name: /^経理部 中野の端末（PC）/ })
      await user.click(getPcHotspot())
      expect(
        await screen.findByRole('group', { name: '経理部 中野の端末の操作' }),
      ).toBeInTheDocument()

      // dangerを先に選ぶ: アクションシートは閉じ、会話オーバーレイ(橘の台詞)で教育的
      // フィードバックが提示される(T047。旧: シート内テキスト表示のまま維持)。探索では
      // ペナルティにならない(詰み防止・spec §8.4)。coreのprogressは参照レベルで完全に
      // 不変(=XP等への影響が一切無い)ことも確認する。
      const progressBeforeDanger = useGameStore.getState().progress
      await user.click(screen.getByRole('button', { name: '感染端末の電源を落とす' }))
      expect(
        screen.queryByRole('group', { name: '経理部 中野の端末の操作' }),
      ).not.toBeInTheDocument()
      const dangerLine =
        '待って、あなた。ここで電源を落とすと、動作中のプロセスや通信先が乗った揮発性メモリの証拠が消えます。まずネットワークから論理的に隔離し、メモリ→ディスクの順で保全を。'
      expect(await screen.findByText(dangerLine)).toBeInTheDocument()
      expect(useGameStore.getState().progress).toBe(progressBeforeDanger)

      // 会話ウィンドウをクリックで閉じると探索状態に戻り、同じホットスポットを再度開いて
      // 他のactionを選べる(電源を落とした後も操作継続可=詰み防止)。会話ウィンドウには専用の
      // 「閉じる」ボタンは無いため、同じaccessible name(line)の要素を1回目=スキップ・
      // 2回目=閉じるに使い回す(T048)。EDRログをcollectすると、シートは閉じ、調査結果が
      // 会話オーバーレイで台詞提示される(#66/T044、話者=霧島=ログ系の既定)。
      await skipTypewriterByClick(user, dangerLine)
      await user.click(screen.getByRole('button', { name: dangerLine }))
      await user.click(getPcHotspot())
      expect(
        await screen.findByRole('group', { name: '経理部 中野の端末の操作' }),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'EDRアラートを確認する' }))
      await waitFor(() => {
        expect(
          screen.queryByRole('group', { name: '経理部 中野の端末の操作' }),
        ).not.toBeInTheDocument()
      })
      expect(await screen.findAllByText('霧島')).not.toHaveLength(0)
      // EDRアラート確認は霧島の2ターン(問いかけ→答え合わせ、#100/#103台本v2.2)。
      const edrLine1 = '新人、このプロセス名――どう見る？'
      const edrLine2 =
        'Excelのマクロ実行に続いて、見慣れないPowerShellが起動した記録がある。正規の業務でこの並びは出ない。侵入の起点はここだ。'
      await skipCollectResultAndClose(user, edrLine1)
      await skipCollectResultAndClose(user, edrLine2)
      expect(getPcHotspot()).toHaveAccessibleName('経理部 中野の端末（PC）・調査済み')

      // --- 執務室: person(中野。単一action=即実行)。NPC直接発話(中野)→橘の要約の2ターン
      //     (台本v2.2/#100/#103)。NPCターンでは霧島・橘の立ち絵がグレーアウトし、名札に
      //     「中野」がそのまま表示される。 ---
      await user.click(screen.getByRole('button', { name: '中野（人物）' }))
      const nakanoLine1 =
        'すみません……月末で請求処理が立て込んでて。取引先からの「請求書送付のご連絡」ってメールで、疑いもせず添付を開いてしまって……。「マクロを有効にしますか」って出たのも、いつも通りだと思って押しちゃったんです。'
      expect(await screen.findAllByText('中野')).not.toHaveLength(0)
      expect(screen.queryByAltText(/（発話中）/)).not.toBeInTheDocument()
      const nakanoLine2 =
        '……ご本人も認めています。件名の巧妙さと、月末の油断が重なった。よくある入口です。'
      await skipCollectResultAndClose(user, nakanoLine1)
      expect(await screen.findAllByText('橘')).not.toHaveLength(0)
      await skipCollectResultAndClose(user, nakanoLine2)

      // --- 執務室: person(経理部長。単一action=即実行)。NPC「経理部長 夏目」→橘の2ターン。 ---
      await user.click(screen.getByRole('button', { name: '経理部長（人物）' }))
      const buchoLine1 =
        '今月は取引先の請求サイクルが集中していてね。多少雑な件名でも、本物と思い込みやすい状況だった。……マクロ実行に関する社内規程も、正直、周知が徹底できていなかった。私の責任だ。'
      const buchoLine2 =
        '規程はあっても、現場に届いていなければ機能しません。ここは後の再発防止と説明責任に効いてくる論点です。覚えておいて。'
      expect(await screen.findAllByText('経理部長 夏目')).not.toHaveLength(0)
      await skipCollectResultAndClose(user, buchoLine1)
      await skipCollectResultAndClose(user, buchoLine2)

      // --- 執務室: book(資料棚。collectを2件持つ=1件選ぶたびにシートが閉じるため、
      //     2回に分けて開き直して両方collectする)。文献系はCVE等の技術文献なら霧島、
      //     それ以外は橘が既定だが、本シナリオはどちらもspeakerを明示している。 ---
      await user.click(screen.getByRole('button', { name: '資料棚（書籍）' }))
      expect(await screen.findByRole('group', { name: '資料棚の操作' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'セキュリティ注意喚起情報を確認する' }))
      await waitFor(() => {
        expect(screen.queryByRole('group', { name: '資料棚の操作' })).not.toBeInTheDocument()
      })
      const advisoryLine =
        '業界団体の注意喚起だ。取引先を装った請求書メールにマクロ付きファイルを添付し、開封後にC2サーバへ接続させる手口が、直近で全国的に報告されている。今回の型と一致する。'
      await skipCollectResultAndClose(user, advisoryLine)

      await user.click(screen.getByRole('button', { name: '資料棚（書籍）' }))
      expect(await screen.findByRole('group', { name: '資料棚の操作' })).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'インシデント対応ガイドラインを確認する' }),
      )
      await waitFor(() => {
        expect(screen.queryByRole('group', { name: '資料棚の操作' })).not.toBeInTheDocument()
      })
      const guidelineLine =
        'インシデント対応ガイドライン。感染が疑われる端末は、まずネットワークから論理的に隔離し、電源は落とさないこと。揮発性メモリの証拠を失わないためです。'
      await skipCollectResultAndClose(user, guidelineLine)
      expect(screen.getByRole('button', { name: '資料棚（書籍）・調査済み' })).toBeInTheDocument()

      // --- サーバ室へシーンタブを切り替える。 ---
      await user.click(screen.getByRole('tab', { name: 'サーバ室' }))
      expect(screen.getByRole('tab', { name: 'サーバ室' })).toHaveAttribute('aria-selected', 'true')

      // device(プロキシサーバ・メールサーバ。単一action=即実行)。ログ系=話者は霧島の既定。
      // プロキシサーバは霧島の2ターン(問いかけ→答え合わせ、台本v2.2)。
      await user.click(screen.getByRole('button', { name: 'プロキシサーバ（機器）' }))
      const proxyLine1 = '新人、この通信の“間隔”に注目しろ。何か気づかないか？'
      const proxyLine2 =
        '深夜帯、中野のPCから見覚えのない海外IPへ、約30分間隔できっちり通信が続いている。人間の操作ではありえない規則正しさ――典型的なビーコンだ。'
      await skipCollectResultAndClose(user, proxyLine1)
      await skipCollectResultAndClose(user, proxyLine2)
      expect(
        screen.getByRole('button', { name: 'プロキシサーバ（機器）・調査済み' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'メールサーバ（機器）' }))
      const mailLine =
        '問題のメールを確認した。取引先名を騙った件名で、送信元は正規ドメインによく似た別ドメイン。手口は典型的だが、手が込んでいる。'
      await skipCollectResultAndClose(user, mailLine)
      expect(
        screen.getByRole('button', { name: 'メールサーバ（機器）・調査済み' }),
      ).toBeInTheDocument()

      // person(サーバ管理者。旧・解析用端末(pc)＋旧・情シス担当(person)を統合したホットスポット、
      // #78・T046-ui-data)。複数collect＋noopのためアクションシート経由になり、見出しには
      // promptの挨拶台詞が出る。
      // 名前の完全一致ではなく前方一致(正規表現)にする: 調査済みになると
      // aria-labelに「・調査済み」が付与され、完全一致では引けなくなるため。
      const getAdminHotspot = () => screen.getByRole('button', { name: /^サーバ管理者（人物）/ })
      await user.click(getAdminHotspot())
      expect(await screen.findByRole('group', { name: 'サーバ管理者の操作' })).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'サーバ管理者「どうしましたか？」' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'PCを確認する' }))
      await waitFor(() => {
        expect(screen.queryByRole('group', { name: 'サーバ管理者の操作' })).not.toBeInTheDocument()
      })
      // 「PCを確認する」は霧島→橘(用語クッション・IoC)→霧島の3ターン(台本v2.2/#100/#103)。
      const sandboxLine1 =
        '回収した添付ファイルをサンドボックスで動かした。マクロが外部URLから追加プログラムを取得し、プロキシログと同じ宛先へビーコンを送っている。この宛先はIoC――侵害の痕跡として、他端末の調査にも使える。'
      const sandboxLine2 = 'そのIoCというのは、具体的には何を指すの？'
      const sandboxLine3 =
        '「この通信先が出たら感染を疑え」という手掛かりの一覧だ。今回はビーコンの宛先がそれにあたる。一つ掴めば他端末への横展開調査が早くなる。'
      await skipCollectResultAndClose(user, sandboxLine1)
      await skipCollectResultAndClose(user, sandboxLine2)
      await skipCollectResultAndClose(user, sandboxLine3)

      // ip-witness-itstaff には証言カードのほか対策カード2枚(正誤の別)も同時に紐づくが、
      // lineはYAMLで明示した証言ベースの台詞のみを提示する(#66でpickTestimonyCard=非ダミー
      // 優先の経路を廃止したため、対策カードの本文が誤って表示される不具合=#62は再現しない)。
      // 「話を聞く」はNPC「サーバ管理者」の直接発話→橘の要約の2ターン(台本v2.2/#100/#103)。
      await user.click(getAdminHotspot())
      expect(await screen.findByRole('group', { name: 'サーバ管理者の操作' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '話を聞く' }))
      const itStaffLine1 =
        '発覚した直後、正直、反射的に経理部PCの電源ケーブルに手をかけたんです。でも……抜いていいのか判断がつかなくて。結局ためらって、対策室の到着を待ちました。'
      const itStaffLine2 =
        'その判断、結果的に正解です。抜かずに待ったから、私たちはまだメモリの証拠を取れる。初動の“ためらい”が保全に効くこともあります。'
      expect(await screen.findAllByText('サーバ管理者')).not.toHaveLength(0)
      await skipCollectResultAndClose(user, itStaffLine1)
      await skipCollectResultAndClose(user, itStaffLine2)

      // これが9件目(最後)の調査のため、ここで「解決へ」の活性条件を満たし、探索完了への誘導
      // (#71・T045)の会話オーバーレイが入れ替わりで自動的に開く(conversationSlotが会話状態を
      // 引き継ぐ)。
      const wrapUpLine = '材料は揃いました。そろそろ問題を整理しましょうか、あなた。'
      expect(await screen.findByText(wrapUpLine)).toBeInTheDocument()
      await skipTypewriterByClick(user, wrapUpLine)

      // 「調査ポイント一覧」トグルは探索状態・会話状態のどちらでも常時表示されるため、
      // 「わかった」を押す(=解決画面へ遷移する)前に一覧側でも9/9件が調査済みとして
      // 共有されていることを確認できる(#66→T047でトグル化。scenes・一覧は同じ状態を共有)。
      await user.click(screen.getByRole('button', { name: '調査ポイント一覧' }))
      expect(screen.getByText('9/9 件調査済み')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '調査する' })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '調査ポイント一覧' }))

      // 「わかった」は探索状態へは戻らず、「解決へ進む」ボタンと同じ遷移で解決画面へ直接進む
      // (#52 追補: 誘導会話からの直接遷移、DESIGN.md「探索シーン」節)。
      await user.click(screen.getByRole('button', { name: 'わかった' }))
      expect(await screen.findByRole('heading', { name: '解決' })).toBeInTheDocument()
    },
  )

  it(
    '情シス担当への聞き取り(ip-witness-itstaff)は証言ベースの台詞のみを提示し、' +
      '同時に紐づく対策カードの本文が誤って表示されない(#62回帰・#66で構造的に解消)',
    async () => {
      const user = userEvent.setup()
      renderApp()

      await user.click(screen.getByRole('link', { name: 'つづきから' }))
      await user.click(await screen.findByRole('button', { name: 'マップを選ぶ' }))
      await user.click(await screen.findByRole('button', { name: 'SKIP' }))
      await user.click(screen.getByRole('tab', { name: 'サーバ室' }))

      // #78・T046-ui-dataで「サーバ管理者」に統合されたホットスポット経由(複数action=シート)。
      // 「話を聞く」はNPC「サーバ管理者」の直接発話(1ターン目)。
      await user.click(screen.getByRole('button', { name: 'サーバ管理者（人物）' }))
      await user.click(screen.getByRole('button', { name: '話を聞く' }))
      const itStaffLine1 =
        '発覚した直後、正直、反射的に経理部PCの電源ケーブルに手をかけたんです。でも……抜いていいのか判断がつかなくて。結局ためらって、対策室の到着を待ちました。'
      expect(await screen.findByText(itStaffLine1)).toBeInTheDocument()
      // #62の症状(対策カードの本文が証言として表示される)が再現しないことを確認する。
      expect(
        screen.queryByText(/感染が疑われる端末をネットワークから論理的に隔離する/),
      ).not.toBeInTheDocument()
      expect(screen.queryByText(/感染が疑われる端末の電源を直ちに落とし/)).not.toBeInTheDocument()
    },
  )
})
