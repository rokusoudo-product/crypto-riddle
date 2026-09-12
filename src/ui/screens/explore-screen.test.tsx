/** @vitest-environment jsdom */
// src/ui/screens/explore-screen.test.tsx — 探索④の背景シーンUI(#52/#56・T038、
// 会話オーバーレイ化(2状態)・調査ポイント一覧のトグル化は#52 Phase4.7 追補/T047、
// 会話ウィンドウのクリック/タップ閉じ・右上ボタン群の不透明化とヒント確認の移設は
// #52 Phase4.7 追補/T048)の結線テスト。
//
// Issue #56 完了条件: 「背景・一覧の両方で、キーボードのみで全ポイント調査→解決へ進める結線
// テストが通る」「4状態(通常/ローディング=判定中/空=未調査/エラー)を満たす」。
// T047完了条件: 「探索状態(背景+ホットスポットのみ)/会話状態(立ち絵+会話ウィンドウのオーバーレイ)
// の2状態が切り替わる」「調査ポイント一覧はトグルで開閉し、キーボードのみで一覧経由の
// 全ポイント調査→解決へ進められる」。
// T048完了条件: 「会話ウィンドウ内の専用の『閉じる』ボタンが無く、会話ウィンドウ自体の
// クリック/タップ(タイプライター中はスキップ→全文表示後は閉じる、の2段階)で閉じられる」
// 「右上に『ヒント確認』『調査ポイント一覧』が探索・会話状態とも不透明な背景で常時表示される」。
// 会話ウィンドウのaccessible nameは会話文そのもの(line)で固定なので、スキップ前後で
// 同じ`getByRole('button', {name: line})`をそのまま使い回せる(1回目=スキップ、2回目=閉じる)。
//
// 実データの scenarios/*.yaml には scenes を追加しない(#57/T040 の範囲・二重実装防止)ため、
// scenes を持つ最小フィクスチャ(explore-scene.fixture.ts、このブランチ内のテスト専用)を使う。
// scenario.scenes が無い場合の一覧のみのフォールバック(既存動作)は
// play-flow.test.tsx / s1-play-flow.test.tsx が既に回帰確認しているため、本ファイルは
// scenes ありのケースを中心に確認する(scenesなしの非表示だけ軽く追加で確認する)。
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import type { Scenario } from '@/core/model'
import { s0SampleFixture } from '@/core/scenario/fixtures/s0-sample.fixture'

import { exploreSceneDoorFixture } from './explore-scene-door.fixture'
import { exploreSceneNoNoopFixture } from './explore-scene-no-noop.fixture'
import { exploreSceneNpcDialogueFixture } from './explore-scene-npc-dialogue.fixture'
import { exploreSceneFixture } from './explore-scene.fixture'
import { ExploreScreen } from './explore-screen'
import { resetGameStoreForTests, useGameStore } from '@/ui/store/game-store'

afterEach(() => cleanup())

/** 探索パート(exploration)まで進めた状態で ExploreScreen だけをレンダーする。 */
function renderExplore(scenario: Scenario, initialEntry = '/explore') {
  resetGameStoreForTests({ scenario })
  useGameStore.getState().dispatch({ type: 'ADVANCE_INTRO' })
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ExploreScreen />
    </MemoryRouter>,
  )
}

/** 「調査ポイント一覧」トグルを開く(#66→T047でトグル化。scenesがある場合のみ存在する)。 */
async function openInvestigationList(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '調査ポイント一覧' }))
}

describe('探索④ 背景シーン＋ホットスポット(#52/#56・T038)', () => {
  it('scenesが無いシナリオでは背景シーンUIを表示せず、一覧のみになる(既存動作の回帰)', () => {
    renderExplore(s0SampleFixture)
    expect(screen.queryByRole('tablist', { name: '探索シーンの切替' })).not.toBeInTheDocument()
    // scenesが無い場合はトグルも無く、一覧は常時表示のまま(#66→T047の変更対象外)。
    expect(screen.queryByRole('button', { name: '調査ポイント一覧' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '調査ポイント一覧' })).toBeInTheDocument()
  })

  it('scenesがあるシナリオでは背景シーンが表示され、一覧は「調査ポイント一覧」トグルを開くまで表示されない(#66→T047でトグル化)', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)
    // 背景シーン(プレースホルダ、T039待ち)は探索状態で常時表示。
    expect(screen.getByRole('img', { name: /執務室の背景（画像は準備中/ })).toBeInTheDocument()

    // 一覧はトグルボタン自体の常時表示で発見性を担保し、中身は開くまで出さない。
    const toggle = screen.getByRole('button', { name: '調査ポイント一覧' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('heading', { name: '調査ポイント一覧' })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: '調査ポイント一覧' })).toBeInTheDocument()
    expect(screen.getByText('経理担当PCのログ')).toBeInTheDocument()
    expect(screen.getByText('田中さんへの聞き取り')).toBeInTheDocument()
  })

  it('ホットスポットは48px以上の実<button>で、通常は不可視(可視テキスト無し)・aria-labelは常時保持する(#66)', () => {
    renderExplore(exploreSceneFixture)
    const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
    expect(pcHotspot.tagName).toBe('BUTTON')
    expect(pcHotspot).toHaveClass('min-h-12', 'min-w-12')
    // 通常はアイコンも名前ラベルも表示しない(DESIGN.md「探索シーン」節・T018''代表決定)。
    // 種別・調査済みかは aria-label(getByRoleのname)だけで常に保持する(WCAG 2.4.7)。
    expect(pcHotspot).toHaveTextContent('')
    // ホバー/キーボードフォーカス時に□マーカー(枠線)を出すクラスを持つ(jsdomは疑似クラスを
    // 評価しないため、クラス文字列の存在で確認する)。枠線は赤系のhotspot-highlightトークン
    // (危険操作系のdestructive/warningとは別トークン、#71・T045)。
    expect(pcHotspot.className).toMatch(/hover:border-hotspot-highlight/)
    expect(pcHotspot.className).toMatch(/focus-visible:border-hotspot-highlight/)
    const personHotspot = screen.getByRole('button', { name: /田中さん（人物）/ })
    expect(personHotspot).toHaveClass('min-h-12', 'min-w-12')
    expect(personHotspot).toHaveTextContent('')
  })

  it(
    '背景シーン経由で、キーボードのみで全ポイント調査→解決へ進められる' +
      '(danger操作は会話オーバーレイの教育的フィードバックのみでペナルティ無し・操作継続可、' +
      '調査結果も会話オーバーレイで台詞提示される#66・T047)',
    async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)
      const getPcHotspot = () => screen.getByRole('button', { name: /経理担当のPC（PC）/ })

      // PCホットスポットへフォーカスして開く(actionsが3件=アクションシート)。
      // 開いたシート内の最初のactionへ自動的にフォーカスが移る(ダイアログ的なフォーカス管理)。
      getPcHotspot().focus()
      await user.keyboard('{Enter}')
      expect(await screen.findByRole('group', { name: '経理担当のPCの操作' })).toBeInTheDocument()
      expect(document.activeElement).toHaveTextContent('ログを取る')

      // 「電源を落とす」(danger)へ1つ進んで選ぶ: アクションシートは閉じ、会話オーバーレイ
      // (橘の台詞)で教育的フィードバックが提示される(T047。旧: シート内テキスト表示)。
      // 探索ではペナルティにならない(詰み防止・spec §8.4)。
      const progressBeforeDanger = useGameStore.getState().progress
      await user.keyboard('{Tab}')
      expect(document.activeElement).toHaveTextContent('電源を落とす')
      await user.keyboard('{Enter}')
      expect(screen.queryByRole('group', { name: '経理担当のPCの操作' })).not.toBeInTheDocument()
      // 会話状態ではホットスポットをDOMごと描画しない(誤操作防止、T047)。
      expect(screen.queryByRole('button', { name: /経理担当のPC（PC）/ })).not.toBeInTheDocument()
      const dangerLine = 'ここで電源を落とすと揮発性メモリの証拠が消えます。'
      expect(await screen.findByText(dangerLine)).toBeInTheDocument()
      expect(screen.getAllByText('橘').length).toBeGreaterThan(0)
      // dangerはdispatchを一切呼ばない(coreのprogressが参照レベルで完全に不変=XP等への影響皆無)。
      expect(useGameStore.getState().progress).toBe(progressBeforeDanger)

      // 会話ウィンドウには専用の「閉じる」ボタンは無く、ウィンドウ全体が1つの操作領域になる
      // (T048)。accessible nameは会話文そのもの(line)で固定なので同じ要素にEnterを2回:
      // 1回目はタイプライターのスキップ(ここでは既に全文表示済みのため実質no-op)、
      // 2回目で閉じる。閉じると探索状態に戻り、フォーカスは元のホットスポットへ復帰する
      // (電源を落とした後も同じホットスポットを再度開いて他のactionを選べる=詰み防止)。
      const dangerWindow = screen.getByRole('button', { name: dangerLine })
      dangerWindow.focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toBe(dangerWindow)
      await user.keyboard('{Enter}')
      expect(screen.queryByText(dangerLine)).not.toBeInTheDocument()
      expect(document.activeElement).toBe(getPcHotspot())

      // 同じホットスポットを再度開き(フォーカス済みなのでEnterのみ)、「ログを取る」(collect)で
      // カードを獲得する。会話オーバーレイに切り替わる。
      await user.keyboard('{Enter}')
      expect(await screen.findByRole('group', { name: '経理担当のPCの操作' })).toBeInTheDocument()
      expect(document.activeElement).toHaveTextContent('ログを取る')
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.queryByRole('group', { name: '経理担当のPCの操作' })).not.toBeInTheDocument()
      })
      expect(screen.getAllByText('霧島').length).toBeGreaterThan(0)
      const pcLine = '不審なプロセスの起動ログが残っている。マルウェア感染の可能性が高い。'
      expect(screen.getByText(pcLine)).toBeInTheDocument()

      // 会話ウィンドウ全体が1つの操作領域(T048。台詞そのものがaccessible nameになるので
      // スキップ前後で同じ要素をそのまま使い回せる)。フォーカスしてEnterを2回押す:
      // 1回目はタイプライターのスキップ(全文表示)、2回目で閉じる
      // (専用の「閉じる」ボタンは廃止した)。
      const pcWindow = screen.getByRole('button', { name: pcLine })
      pcWindow.focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toBe(pcWindow)
      await user.keyboard('{Enter}')
      expect(screen.queryByText(pcLine)).not.toBeInTheDocument()
      expect(document.activeElement).toBe(getPcHotspot())
      expect(getPcHotspot()).toHaveAccessibleName(/・調査済み/)

      // 人物ホットスポット(person・単一action)。line/speakerを省略しているため、既定の
      // 導入文＋カード本文へのフォールバックで会話オーバーレイに表示される(話者既定=橘、#66)。
      const personHotspot = screen.getByRole('button', { name: /田中さん（人物）/ })
      personHotspot.focus()
      await user.keyboard('{Enter}')
      expect(await screen.findAllByText('橘')).not.toHaveLength(0)
      const tanakaLine =
        '田中さんに話を聞いた。「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'
      expect(screen.getByText(tanakaLine)).toBeInTheDocument()

      const tanakaWindow = screen.getByRole('button', { name: tanakaLine })
      tanakaWindow.focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toBe(tanakaWindow)
      await user.keyboard('{Enter}')
      expect(screen.queryByText(tanakaLine)).not.toBeInTheDocument()

      // この2件目の調査で「解決へ」の活性条件を満たすため、探索完了への誘導(#71・T045)の
      // 会話オーバーレイが入れ替わりで自動的に開く(conversationSlotが会話状態を引き継ぐため、
      // 探索状態には戻らずホットスポットはまだ現れない)。入れ替わった瞬間、その最初の操作
      // 可能要素(タイプライターのスキップボタン)へ自動的にフォーカスが移る(advisor指摘の
      // 修正: 直前にホットスポットへ戻ったフォーカスが、この入れ替わりでホットスポットが
      // 再アンマウントされて迷子にならないようにするため)。
      const wrapUpLine = '材料は揃いました。そろそろ問題を整理しましょうか、あなた。'
      await screen.findByText(wrapUpLine)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: wrapUpLine }))
      await user.keyboard('{Enter}')
      expect(document.activeElement).toHaveTextContent('わかった')

      // 右上の「調査ポイント一覧」トグルは探索状態・会話状態のどちらでも常時表示されるため、
      // 「わかった」を押す前に一覧側でも両方調査済みになっていること・「解決へ進む」が
      // 活性化していることを確認できる(scenes・一覧は同じ状態を共有する)。
      await openInvestigationList(user)
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()
      const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
      await waitFor(() => expect(enterResolution).toBeEnabled())

      // 「わかった」は探索状態には戻さず、「解決へ進む」ボタンと同じ遷移(handleEnterResolution)
      // で解決パートへ直接進む(#52 追補、DESIGN.md「探索シーン」節)。
      await user.click(screen.getByRole('button', { name: 'わかった' }))
      expect(useGameStore.getState().progress.part).toBe('resolution')
    },
  )

  it('右上の「ヒント確認」ボタンで、獲得済みの手持ちカードをいつでも無料で閲覧できる(#66→T048で右上へ移設)', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)

    // 「ヒント確認」は右上のボタン群の一員として探索状態・会話状態のどちらでも常時表示される
    // (T048。旧: 会話ウィンドウ内の?ボタンは全文表示後にしか出なかったが、右上移設により
    // タイプライター中でも押せる)。aria-labelは移設前と同じ固定文言を維持する。
    const cardDrawerButton = screen.getByRole('button', { name: '手持ちカードを見る（無料）' })
    expect(cardDrawerButton).toHaveTextContent('ヒント確認')

    const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
    pcHotspot.focus()
    await user.keyboard('{Enter}')
    // PCはcollect/danger/noopの3action=シート経由。最初のaction(collect)をそのまま実行する。
    await user.keyboard('{Enter}')

    const pcLine = '不審なプロセスの起動ログが残っている。マルウェア感染の可能性が高い。'
    expect(await screen.findByText(pcLine)).toBeInTheDocument()

    // タイプライターが進行中(スキップ前)でも「ヒント確認」は押せる(会話ウィンドウ内の
    // 操作要素と違い、右上ボタン群はisComplete状態に依存しない)。
    await user.click(cardDrawerButton)
    expect(await screen.findByRole('heading', { name: '手持ちカード' })).toBeInTheDocument()
    // ip-pc-logのcollectで獲得したカード(card-pc-log)が並ぶ(is_dummyの有無に関わらず全件)。
    expect(screen.getByText('不審なプロセスの起動ログが残っていた。')).toBeInTheDocument()
  })

  it('シーンタブは矢印キーで切り替えられ、切替後は別シーンのホットスポットが操作できる', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)

    const officeTab = screen.getByRole('tab', { name: '執務室' })
    const serverTab = screen.getByRole('tab', { name: 'サーバ室' })
    expect(officeTab).toHaveAttribute('aria-selected', 'true')
    expect(serverTab).toHaveAttribute('aria-selected', 'false')

    officeTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(serverTab)
    expect(serverTab).toHaveAttribute('aria-selected', 'true')

    // サーバ室シーンのホットスポットが表示され、執務室のホットスポットは表示されない。
    expect(screen.getByRole('button', { name: /サーバ機器（機器）/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /経理担当のPC（PC）/ })).not.toBeInTheDocument()
  })

  it('一覧フォールバックだけでも、背景に頼らずキーボードのみで全ポイント調査→解決へ進められる(#66→T047でトグル化)', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)

    // 「調査ポイント一覧」トグルをキーボードで開く。
    const toggle = screen.getByRole('button', { name: '調査ポイント一覧' })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const list = screen.getByRole('list', { name: '調査ポイント一覧' })
    const investigateButtons = within(list).getAllByRole('button', { name: '調査する' })
    expect(investigateButtons).toHaveLength(2)

    for (const button of investigateButtons) {
      button.focus()
      await user.keyboard('{Enter}')
    }

    expect(within(list).queryByRole('button', { name: '調査する' })).not.toBeInTheDocument()
    const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
    expect(enterResolution).toBeEnabled()
  })

  describe('探索状態/会話状態の2状態切り替え(#52・T047)', () => {
    it('会話ウィンドウを開いている間はホットスポットを描画せず、クリックで閉じると探索状態に戻る(立ち絵・会話ウィンドウも連動して消える、T048)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)
      const tanakaLine =
        '田中さんに話を聞いた。「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'

      // 探索状態(既定): 立ち絵も会話ウィンドウも無く、ホットスポットのみ操作できる。
      expect(screen.queryByText(tanakaLine)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /経理担当のPC（PC）/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /田中さん（人物）/ })).toBeInTheDocument()

      // 田中さん(単一action)を調べて会話状態にする。
      await user.click(screen.getByRole('button', { name: /田中さん（人物）/ }))
      await screen.findByRole('button', { name: tanakaLine })

      // 会話状態: ホットスポットはDOMに存在せず、立ち絵(名札)と会話ウィンドウが出る。
      // 会話ウィンドウには専用の「閉じる」ボタンは無い(T048。ウィンドウ自体が
      // クリック/タップ可能な1つの操作領域になっている)。
      expect(screen.queryByRole('button', { name: /経理担当のPC（PC）/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /田中さん（人物）/ })).not.toBeInTheDocument()
      expect(screen.getAllByText('霧島').length).toBeGreaterThan(0)
      expect(screen.getAllByText('橘').length).toBeGreaterThan(0)
      // 右上のボタン群(「ヒント確認」「調査ポイント一覧」)は探索・会話のどちらでも常時表示される
      // (発見性の担保。T048で不透明化・「ヒント確認」を会話ウィンドウ内から移設した)。
      expect(screen.getByRole('button', { name: '調査ポイント一覧' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '手持ちカードを見る（無料）' })).toBeInTheDocument()

      // 1回目のクリックはタイプライターのスキップ、2回目のクリックで閉じる(2段階、T048)。
      // accessible nameは会話文(line)のまま変わらないため、都度getByRoleし直せる。
      await user.click(screen.getByRole('button', { name: tanakaLine }))
      if (screen.queryByRole('button', { name: tanakaLine })) {
        await user.click(screen.getByRole('button', { name: tanakaLine }))
      }

      // 探索状態に戻り、ホットスポットが再び現れ、立ち絵・会話ウィンドウは消える。
      expect(screen.queryByText(tanakaLine)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /経理担当のPC（PC）/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /田中さん（人物）/ })).toBeInTheDocument()
    })

    it('会話オーバーレイを開いたままシーンタブを切り替えても、別シーンの無関係なホットスポットへフォーカスが誤って移らない', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneDoorFixture)

      // scene-a(サーバ室)の先頭ホットスポット(index 0=サーバ管理者)で会話オーバーレイを開く。
      await user.click(screen.getByRole('button', { name: /サーバ管理者（人物）/ }))
      await user.click(screen.getByRole('button', { name: '話を聞く' }))
      const witnessLine =
        'サーバ管理者に話を聞いた。「昨夜からアラートが増えている」とサーバ管理者は証言した。'
      expect(await screen.findByText(witnessLine)).toBeInTheDocument()
      // 会話ウィンドウ自体をクリックしてタイプライターをスキップする(T048。専用の
      // 「閉じる」ボタンは無い)。全文表示(<p>タグ)になったことを確認してから次へ進む。
      await user.click(screen.getByRole('button', { name: witnessLine }))
      expect(screen.getByText(witnessLine).tagName).toBe('P')

      // 会話オーバーレイを開いたまま、シーンタブで執務室(scene-b)へ切り替える。scene-bの
      // 先頭ホットスポット(index 0)はサーバ室へ戻るドアで、サーバ管理者(index 0)とは無関係。
      // 戻り先indexが index という数値だけで管理されているため、シーン切替時に破棄しないと
      // 無関係な要素へフォーカスが移ってしまう(scene-explorer.tsxのcloseOverlays参照)。
      const officeTab = screen.getByRole('tab', { name: '執務室' })
      await user.click(officeTab)

      // 会話オーバーレイは閉じ、シーン切替自体は完了する。フォーカスはタブに残り、
      // 執務室側の無関係なドアへ誤って移らない。
      expect(screen.queryByText(witnessLine)).not.toBeInTheDocument()
      expect(officeTab).toHaveAttribute('aria-selected', 'true')
      expect(document.activeElement).toBe(officeTab)
    })
  })

  describe('探索完了→解決への誘導(#52 Phase4.7/#71・T045、T047で会話オーバーレイに統合)', () => {
    const wrapUpLine = '材料は揃いました。そろそろ問題を整理しましょうか、あなた。'

    /** 「調査ポイント一覧」トグルを開き、一覧側から全ポイントを調査して「解決へ」の活性条件を満たす。 */
    async function investigateAllViaList(user: ReturnType<typeof userEvent.setup>) {
      await openInvestigationList(user)
      const list = screen.getByRole('list', { name: '調査ポイント一覧' })
      const investigateButtons = within(list).getAllByRole('button', { name: '調査する' })
      for (const button of investigateButtons) {
        await user.click(button)
      }
    }

    it('「解決へ」の活性条件を満たした時点で、会話オーバーレイで橘が「材料は揃いました。そろそろ問題を整理しましょうか、あなた。」と促す', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // 活性条件を満たす前は促しが出ない。
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      await investigateAllViaList(user)

      // 会話フレーム(タイプライター)のsr-only全文は演出の進行に関わらず常に存在するため、
      // getByTextでそのまま検証できる(他の会話オーバーレイテストと同じ挙動)。
      expect(await screen.findByText(wrapUpLine)).toBeInTheDocument()
      // 話者の既定は橘(司令塔、DESIGN.md「探索シーン」節)。
      expect(screen.getAllByText('橘').length).toBeGreaterThan(0)
      // 促し後も「解決へ進む」自体は活性のまま(誘導が導線を隠さない)。
      expect(screen.getByRole('button', { name: '解決へ進む' })).toBeEnabled()
    })

    it('促しは全文表示(またはスキップ)後、「わかった」を押すと探索状態には戻らず解決パートへ直接進む(#52 追補)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      await investigateAllViaList(user)
      await screen.findByText(wrapUpLine)

      // タイプライターをスキップ(台詞そのものがスキップボタンのaccessible name、#64/T042)。
      // ボタン文言は意図的に「わかった」(SceneExplorer側の会話オーバーレイの「閉じる」との
      // アクセシブルネーム衝突を避けるため、#71・T045)。
      await user.click(screen.getByRole('button', { name: wrapUpLine }))
      expect(useGameStore.getState().progress.part).toBe('exploration')

      // 「わかった」は探索状態へ戻す表示切替(旧wrapUpPromptDismissed)ではなく、
      // 「解決へ進む」ボタンと同じ遷移(handleEnterResolution)をそのまま呼ぶ
      // (DESIGN.md「探索シーン」節「探索完了→解決への誘導」)。押すとdispatchで
      // progress.partが'resolution'になり、探索画面自体が表示されなくなる。
      await user.click(screen.getByRole('button', { name: 'わかった' }))
      expect(useGameStore.getState().progress.part).toBe('resolution')
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()
      expect(screen.getByText('まだ探索パートではありません。')).toBeInTheDocument()
    })

    it('最後の1件をホットスポット経由で調べ終えても、調査結果の会話ウィンドウが開いている間は促しを同時に出さず、閉じてから出す', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // 1件目(PC・3action=アクションシート)を先に調べて閉じておく。会話ウィンドウは
      // 専用の「閉じる」ボタンを持たないため、同じ要素(accessible name=line)を
      // 1回目=スキップ・2回目=閉じるに使い回す(T048)。
      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      await user.keyboard('{Enter}')
      const pcLine = '不審なプロセスの起動ログが残っている。マルウェア感染の可能性が高い。'
      await screen.findByText(pcLine)
      await user.click(screen.getByRole('button', { name: pcLine }))
      await user.click(screen.getByRole('button', { name: pcLine }))
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      // 2件目(person・単一action)を調べ終えた瞬間、「解決へ」の活性条件を満たすが、
      // 調査結果の会話ウィンドウが開いている間は促しを表示しない(会話オーバーレイの
      // 2重表示を避けるため、#71・T045)。
      const personHotspot = screen.getByRole('button', { name: /田中さん（人物）/ })
      await user.click(personHotspot)
      const tanakaLine =
        '田中さんに話を聞いた。「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'
      await screen.findByText(tanakaLine)
      await user.click(screen.getByRole('button', { name: tanakaLine }))
      expect(screen.getByText(tanakaLine).tagName).toBe('P')
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      // 会話ウィンドウをもう一度クリックして閉じると、入れ替わりで促しが表示される。
      await user.click(screen.getByRole('button', { name: tanakaLine }))
      expect(await screen.findByText(wrapUpLine)).toBeInTheDocument()
    })

    it(
      '会話ウィンドウの外側(背景の見えている部分)をクリックすると、誘導会話を閉じて探索状態に' +
        '戻れ(ホットスポットが再び操作できる)、閉じた後は自動的に再表示されない。' +
        '「解決へ進む」はそのまま活性のまま使える(PR#92追補・代表FB「ロックしない」)',
      async () => {
        const user = userEvent.setup()
        renderExplore(exploreSceneFixture)

        await investigateAllViaList(user)
        await screen.findByText(wrapUpLine)
        // 会話状態のためホットスポットはDOMごと描画されない(T047)。
        expect(screen.queryByRole('button', { name: /経理担当のPC（PC）/ })).not.toBeInTheDocument()

        // 会話ウィンドウ自体や「わかった」ボタンではなく、外側(onOutsideDismiss、
        // conversation-frame.tsxのdata-testid)をクリックする。
        await user.click(screen.getByTestId('conversation-overlay-backdrop'))
        expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

        // 探索状態に戻り、ホットスポットが再び操作できる(=ロックしない)。
        expect(screen.getByRole('button', { name: /経理担当のPC（PC）/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /田中さん（人物）/ })).toBeInTheDocument()

        // 「解決へ進む」は誘導会話の表示状態と無関係に、canProceed成立中は活性のまま。
        expect(screen.getByRole('button', { name: '解決へ進む' })).toBeEnabled()

        // 再探索してもナグ防止のため誘導会話は自動的には再表示されない(dangerの教育的
        // フィードバックを開いて閉じる、無関係な会話状態の出入りを経由させて確認する)。
        const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
        pcHotspot.focus()
        await user.keyboard('{Enter}')
        await user.keyboard('{Tab}')
        expect(document.activeElement).toHaveTextContent('電源を落とす')
        await user.keyboard('{Enter}')
        const dangerLine = 'ここで電源を落とすと揮発性メモリの証拠が消えます。'
        await screen.findByText(dangerLine)
        await user.click(screen.getByRole('button', { name: dangerLine }))
        await user.click(screen.getByRole('button', { name: dangerLine }))
        expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

        // 「解決へ進む」から直接解決パートへ進める(閉じた後もロックしない)。
        await user.click(screen.getByRole('button', { name: '解決へ進む' }))
        expect(useGameStore.getState().progress.part).toBe('resolution')
      },
    )

    it('Escapeキーでも誘導会話を閉じて探索状態に戻れる(会話ウィンドウ自体やわかったボタンでの遷移とは独立、PR#92追補)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      await investigateAllViaList(user)
      await screen.findByText(wrapUpLine)
      // 表示された瞬間、内部の最初の操作可能要素(タイプライターのスキップ)へフォーカスが
      // 自動的に移る(scene-explorer.tsxのisWrapUpVisible effect)。
      expect(document.activeElement).toBe(screen.getByRole('button', { name: wrapUpLine }))

      await user.keyboard('{Escape}')
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /経理担当のPC（PC）/ })).toBeInTheDocument()
      expect(useGameStore.getState().progress.part).toBe('exploration')
    })
  })

  it('4状態(ローディング/空/エラー)をURLクエリで切り替えられる', () => {
    renderExplore(exploreSceneFixture, '/explore?state=loading')
    expect(screen.getByRole('status')).toHaveTextContent('判定しています')
    cleanup()

    renderExplore(exploreSceneFixture, '/explore?state=empty')
    expect(
      screen.getByText('まだ調査していません。調査ポイントをタップしよう。'),
    ).toBeInTheDocument()
    cleanup()

    renderExplore(exploreSceneFixture, '/explore?state=error')
    expect(screen.getByRole('alert')).toHaveTextContent('エラーが発生しました。')
  })

  describe('ドア移動UI・アクションシート見出しのprompt・統合ホットスポット(#78・T046-ui-data)', () => {
    it('promptが無いホットスポットは、従来どおりアクションシートの見出しにラベルのみを表示する(回帰確認)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // 経理担当のPC(exploreSceneFixture)はpromptを持たないため、見出しはラベルのまま。
      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      const sheet = await screen.findByRole('group', { name: '経理担当のPCの操作' })
      expect(within(sheet).getByRole('heading', { name: '経理担当のPC' })).toBeInTheDocument()
    })

    it('object_type: door のホットスポットは通常のホットスポットと同じく不可視で、aria-labelを常時保持する', () => {
      renderExplore(exploreSceneDoorFixture)
      const door = screen.getByRole('button', { name: /執務室への扉（扉）/ })
      expect(door.tagName).toBe('BUTTON')
      expect(door).toHaveClass('min-h-12', 'min-w-12')
      expect(door).toHaveTextContent('')
      // フォーカス可視の□マーカーは他object_typeと共通のtoken(hotspot-highlight)を流用する。
      expect(door.className).toMatch(/hover:border-hotspot-highlight/)
      expect(door.className).toMatch(/focus-visible:border-hotspot-highlight/)
    })

    it('ドア(door・単一gotoアクション)をキーボードで操作すると、アクションシートを経由せず即座に別シーンへ移動し、移動先のシーンタブへフォーカスが移る', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneDoorFixture)

      expect(screen.getByRole('tab', { name: 'サーバ室' })).toHaveAttribute('aria-selected', 'true')
      const door = screen.getByRole('button', { name: /執務室への扉（扉）/ })
      door.focus()
      await user.keyboard('{Enter}')

      // アクションシートは経由しない(単一goto=1択のため即座に実行、#78)。
      expect(screen.queryByRole('group')).not.toBeInTheDocument()
      const officeTab = screen.getByRole('tab', { name: '執務室' })
      expect(officeTab).toHaveAttribute('aria-selected', 'true')
      expect(document.activeElement).toBe(officeTab)
      // 移動先シーンのホットスポット(戻り用のドア)が表示される。
      expect(screen.getByRole('button', { name: /サーバ室への扉（扉）/ })).toBeInTheDocument()
    })

    it('シーンタブでも同じ行き来ができる(ドアとタブは併用可能)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneDoorFixture)

      await user.click(screen.getByRole('tab', { name: '執務室' }))
      expect(screen.getByRole('tab', { name: '執務室' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('button', { name: /サーバ室への扉（扉）/ })).toBeInTheDocument()

      // タブで戻ってから、今度はドアで再度執務室へ移動できる(併用の確認)。
      await user.click(screen.getByRole('tab', { name: 'サーバ室' }))
      const door = screen.getByRole('button', { name: /執務室への扉（扉）/ })
      await user.click(door)
      expect(screen.getByRole('tab', { name: '執務室' })).toHaveAttribute('aria-selected', 'true')
    })

    it('promptを持つ統合ホットスポット(複数collect＋noop)は、アクションシート見出しにpromptを表示し、各collectが独立して機能する', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneDoorFixture)

      // 会話オーバーレイが開くたびにホットスポットは一度アンマウント→再マウントされる(T047)ため、
      // 変数を使い回さずその都度クエリし直す(取得済みの参照は古いDOMノードを指したままになる)。
      const getAdmin = () => screen.getByRole('button', { name: /サーバ管理者（人物）/ })

      getAdmin().focus()
      await user.keyboard('{Enter}')
      const sheet = await screen.findByRole('group', { name: 'サーバ管理者の操作' })
      // 見出し=prompt(ラベルではない)。
      expect(
        within(sheet).getByRole('heading', { name: 'サーバ管理者「どうしましたか？」' }),
      ).toBeInTheDocument()
      expect(within(sheet).queryByRole('heading', { name: 'サーバ管理者' })).not.toBeInTheDocument()

      // 「何でもない」(noop)はシートを閉じるだけで何も獲得しない。このフィクスチャの解決条件
      // (ip-log・ip-witness)は下記の2つのcollectで満たされ、満たした瞬間に探索完了への誘導
      // (#71・T045)が自動的に開いてホットスポットが操作できなくなるため、noopは両collectより
      // 前に確認しておく。
      await user.click(within(sheet).getByRole('button', { name: '何でもない' }))
      expect(screen.queryByRole('group', { name: 'サーバ管理者の操作' })).not.toBeInTheDocument()

      // 1つ目のcollect(話を聞く・証言・橘)を実行する。
      getAdmin().focus()
      await user.keyboard('{Enter}')
      const sheet1 = await screen.findByRole('group', { name: 'サーバ管理者の操作' })
      await user.click(within(sheet1).getByRole('button', { name: '話を聞く' }))
      const witnessLine =
        'サーバ管理者に話を聞いた。「昨夜からアラートが増えている」とサーバ管理者は証言した。'
      expect(await screen.findByText(witnessLine)).toBeInTheDocument()
      expect(screen.getAllByText('橘').length).toBeGreaterThan(0)
      // 会話ウィンドウには専用の「閉じる」ボタンは無いため、同じaccessible name(line)の
      // 要素を1回目=スキップ・2回目=閉じるに使い回す(T048)。
      await user.click(screen.getByRole('button', { name: witnessLine }))
      await user.click(screen.getByRole('button', { name: witnessLine }))
      // 統合ホットスポットは束ねた全collectが調査済みになるまで「調査済み」を出さない
      // (isHotspotInvestigated=collect対象の全件一致、scene-explorer.tsx)。
      expect(getAdmin()).not.toHaveAccessibleName(/・調査済み/)

      // 2つ目のcollect(PCを確認する・ログ・霧島)も独立して機能する。
      getAdmin().focus()
      await user.keyboard('{Enter}')
      const sheet2 = await screen.findByRole('group', { name: 'サーバ管理者の操作' })
      await user.click(within(sheet2).getByRole('button', { name: 'PCを確認する' }))
      // resolveCollectPresentationのフォールバック導入文はhotspot.object_type(person)基準
      // のため、機器を調べるcollectでも「〜に話を聞いた。」になる(意図どおり。線を明示すれば
      // 任意の文言にできるが、本フィクスチャは明示speaker・省略lineのフォールバック経路を確認する)。
      const logLine = 'サーバ管理者に話を聞いた。定期ジョブのログに異常は見られなかった。'
      expect(await screen.findByText(logLine)).toBeInTheDocument()
      expect(screen.getAllByText('霧島').length).toBeGreaterThan(0)
      await user.click(screen.getByRole('button', { name: logLine }))
      await user.click(screen.getByRole('button', { name: logLine }))

      // このフィクスチャの解決条件(ip-log・ip-witnessの両方)は今の2つ目のcollectで満たされる
      // ため、探索完了への誘導(#71・T045)の会話オーバーレイが入れ替わりで自動的に開く
      // (conversationSlotが会話状態を引き継ぐ)。
      const wrapUpLine = '材料は揃いました。そろそろ問題を整理しましょうか、あなた。'
      await screen.findByText(wrapUpLine)
      await user.click(screen.getByRole('button', { name: wrapUpLine }))

      // 右上の「調査ポイント一覧」トグルは会話状態でも常時表示されるため、「わかった」を押す
      // 前に一覧側で2/2件調査済み・「解決へ進む」活性化を確認できる(結線確認)。
      await openInvestigationList(user)
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()
      const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
      await waitFor(() => expect(enterResolution).toBeEnabled())

      // 「わかった」は探索状態には戻らず、「解決へ進む」ボタンと同じ遷移で解決パートへ直接進む
      // (#52 追補、DESIGN.md「探索シーン」節「探索完了→解決への誘導」)。
      await user.click(screen.getByRole('button', { name: 'わかった' }))
      expect(useGameStore.getState().progress.part).toBe('resolution')
    })
  })

  describe('アクションシートの中央オーバーレイ化・半透明・「戻る」選択肢の必須化(#52 追補・代表FB)', () => {
    it('アクションシートは画面中央にオーバーレイ表示され、選択肢ボタンは不透明度80%相当の半透明トークンを持つ', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      const sheet = await screen.findByRole('group', { name: '経理担当のPCの操作' })

      // 画面中央にオーバーレイ表示する外枠(absolute inset-0 + flex items-center justify-center、
      // 会話オーバーレイと同じく背景シーンの箱に重ねる)。
      const overlayWrapper = sheet.parentElement
      expect(overlayWrapper?.className).toMatch(/absolute/)
      expect(overlayWrapper?.className).toMatch(/inset-0/)
      expect(overlayWrapper?.className).toMatch(/items-center/)
      expect(overlayWrapper?.className).toMatch(/justify-center/)

      // 選択肢ボタンは不透明度80%程度の半透明トークン(bg-card/80等、カラーコード直書きではない)。
      const firstAction = within(sheet).getByRole('button', { name: 'ログを取る' })
      expect(firstAction.className).toMatch(/bg-card\/80/)

      // 右上の「ヒント確認」「調査ポイント一覧」は対象外(不透明のまま、別要件)。
      const listToggle = screen.getByRole('button', { name: '調査ポイント一覧' })
      expect(listToggle.className).not.toMatch(/\/80/)
    })

    it('Escapeキーでアクションシートを閉じ、フォーカスは元のホットスポットへ復帰する', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      await screen.findByRole('group', { name: '経理担当のPCの操作' })

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('group', { name: '経理担当のPCの操作' })).not.toBeInTheDocument()
      expect(document.activeElement).toBe(pcHotspot)
      // 何も実行されていない(noop相当・投資進捗・XPへの影響なし)。
      expect(useGameStore.getState().progress.investigatedPointIds).not.toContain('ip-pc-log')
    })

    it('データにnoop相当が無いアクションシートには、UI側で「閉じる（何もしない）」が末尾に補われ、選ぶと何も獲得せずに閉じる', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneNoNoopFixture)

      const bookHotspot = screen.getByRole('button', { name: /資料棚（書籍）/ })
      bookHotspot.focus()
      await user.keyboard('{Enter}')
      const sheet = await screen.findByRole('group', { name: '資料棚の操作' })

      // 元データの2つのcollectに加え、UI側で補った「閉じる（何もしない）」が末尾にある
      // (既存の並び順は変えず後ろに追加する)。
      // 見出し行の「操作メニューを閉じる」(Xアイコン、可視テキスト無し)は選択肢ではないため除く。
      const buttons = within(sheet)
        .getAllByRole('button')
        .filter((b) => b.textContent !== '')
      expect(buttons.map((b) => b.textContent)).toEqual([
        '注意喚起情報を確認する',
        '対応ガイドラインを確認する',
        '閉じる（何もしない）',
      ])

      const closeButton = within(sheet).getByRole('button', { name: '閉じる（何もしない）' })
      // 補った選択肢も他の選択肢と同じく半透明トークンを持つ。
      expect(closeButton.className).toMatch(/bg-card\/80/)

      await user.click(closeButton)
      expect(screen.queryByRole('group', { name: '資料棚の操作' })).not.toBeInTheDocument()
      // 何も獲得していない(投資進捗への影響なし)。
      expect(useGameStore.getState().progress.investigatedPointIds).toEqual([])
      // フォーカスは元のホットスポットへ復帰する(電源を落とす操作等と同じ、詰み防止と同じ設計)。
      expect(document.activeElement).toBe(bookHotspot)
    })

    it('データに既にnoopがあるアクションシートには、「閉じる（何もしない）」を二重に足さない(回帰確認)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      const sheet = await screen.findByRole('group', { name: '経理担当のPCの操作' })

      // 見出し行の「操作メニューを閉じる」(Xアイコン、可視テキスト無し)は選択肢ではないため除く。
      const buttons = within(sheet)
        .getAllByRole('button')
        .filter((b) => b.textContent !== '')
      expect(buttons.map((b) => b.textContent)).toEqual([
        'ログを取る',
        '電源を落とす',
        '今は触らない',
      ])
      expect(
        within(sheet).queryByRole('button', { name: '閉じる（何もしない）' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('collect.dialogue[]の多ターン送り・NPC直接発話(#100/#102)', () => {
    it(
      '3ターン(霧島→NPC「中野」→橘)を1行ずつタップ送りし、NPCターンでは霧島・橘の立ち絵が' +
        'グレーアウトして名札にNPC名が出て、トリガー元のホットスポットが□で強調される。' +
        '最終ターンの後は会話が閉じて探索状態に戻る',
      async () => {
        const user = userEvent.setup()
        renderExplore(exploreSceneNpcDialogueFixture)

        // person・単一action(collect)のため即座に会話オーバーレイが開く(アクションシートを
        // 経由しない、#78・T046-ui-data)。
        const personHotspot = screen.getByRole('button', { name: /経理部長（人物）/ })
        await user.click(personHotspot)

        // 1ターン目: 霧島。NPCターンではないため□マーカーは無い。
        const line1 = '経理部長、中野さんが開いた添付ファイルについて教えてください。'
        expect(await screen.findByText(line1)).toBeInTheDocument()
        expect(screen.getAllByText('霧島').length).toBeGreaterThan(0)
        expect(screen.queryByTestId('npc-hotspot-marker')).not.toBeInTheDocument()

        // ウィンドウをクリック: 1回目はタイプライターのスキップ(全文表示)。
        const window1 = screen.getByRole('button', { name: line1 })
        await user.click(window1)
        // 2回目: 最終ターンではないため次の行へ進む(会話は閉じない)。
        await user.click(window1)
        expect(screen.queryByText(line1)).not.toBeInTheDocument()

        // 2ターン目: NPC「中野」の直接発話。霧島・橘の両立ち絵がグレーアウトし、
        // 名札には「中野」がそのまま表示される(名札=霧島/橘ではない)。
        const line2 = '取引先からの見積依頼だと思って、普通に開いてしまって……'
        expect(await screen.findByText(line2)).toBeInTheDocument()
        expect(screen.getByAltText('霧島（待機中）')).toBeInTheDocument()
        expect(screen.getByAltText('橘（待機中）')).toBeInTheDocument()
        expect(screen.queryByAltText(/（発話中）/)).not.toBeInTheDocument()
        expect(screen.getAllByText('中野').length).toBeGreaterThan(0)
        // トリガー元のホットスポットが□で強調される(装飾用マーカー、非対話)。
        expect(screen.getByTestId('npc-hotspot-marker')).toBeInTheDocument()

        const window2 = screen.getByRole('button', { name: line2 })
        await user.click(window2)
        await user.click(window2)
        expect(screen.queryByText(line2)).not.toBeInTheDocument()

        // 3ターン目(最終): 橘。NPCターンではないため□マーカーは消える。
        const line3 = '添付ファイルの拡張子は確認しましたか？'
        expect(await screen.findByText(line3)).toBeInTheDocument()
        expect(screen.queryByTestId('npc-hotspot-marker')).not.toBeInTheDocument()

        const window3 = screen.getByRole('button', { name: line3 })
        await user.click(window3)
        // 最終ターンでのクリックは会話を閉じる(次の行へは進まない)。
        await user.click(window3)
        expect(screen.queryByText(line3)).not.toBeInTheDocument()

        // 獲得は1回だけ(ターンごとに重複してonCollectが呼ばれない)。このフィクスチャは
        // investigation_pointが1件のみのため、会話を閉じた瞬間に「解決へ」の活性条件も
        // 満たし、探索完了への誘導(誘導会話)へそのまま入れ替わる(既存の挙動、
        // explore-screen.tsx参照)。ホットスポットの再表示確認は2件以上のexploreSceneFixtureで
        // 既に回帰確認済みのため、ここでは獲得が1回だけであることだけを確認する。
        expect(useGameStore.getState().progress.investigatedPointIds).toEqual(['ip-interview'])
      },
    )
  })
})
