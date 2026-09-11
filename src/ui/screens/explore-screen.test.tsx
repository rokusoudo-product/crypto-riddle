/** @vitest-environment jsdom */
// src/ui/screens/explore-screen.test.tsx — 探索④の背景シーンUI(#52/#56・T038、
// 会話オーバーレイ化(2状態)・調査ポイント一覧のトグル化は#52 Phase4.7 追補/T047)の結線テスト。
//
// Issue #56 完了条件: 「背景・一覧の両方で、キーボードのみで全ポイント調査→解決へ進める結線
// テストが通る」「4状態(通常/ローディング=判定中/空=未調査/エラー)を満たす」。
// T047完了条件: 「探索状態(背景+ホットスポットのみ)/会話状態(立ち絵+会話ウィンドウのオーバーレイ)
// の2状態が切り替わる」「調査ポイント一覧はトグルで開閉し、キーボードのみで一覧経由の
// 全ポイント調査→解決へ進められる」。
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

      // 会話オーバーレイを閉じると探索状態に戻り、フォーカスは元のホットスポットへ復帰する
      // (電源を落とした後も同じホットスポットを再度開いて他のactionを選べる=詰み防止)。
      screen.getByRole('button', { name: dangerLine }).focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toHaveTextContent('閉じる')
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

      // 「閉じる」は会話ウィンドウのchildrenのため、タイプライターの全文表示(またはスキップ)後に
      // しか出ない(#64/T042)。台詞そのものがスキップボタンのaccessible nameになるので、
      // それをフォーカスしてEnterでキーボードのみスキップする。スキップすると children 内の
      // 最初のフォーカス可能要素(=「閉じる」。?ボタンより先にDOM上へ置いている)へ
      // 自動的にフォーカスが移る(ConversationFrame側の仕様)。
      screen.getByRole('button', { name: pcLine }).focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toHaveTextContent('閉じる')
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

      screen.getByRole('button', { name: tanakaLine }).focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toHaveTextContent('閉じる')
      await user.keyboard('{Enter}')
      expect(screen.queryByText(tanakaLine)).not.toBeInTheDocument()

      // この2件目の調査で「解決へ」の活性条件を満たすため、探索完了への誘導(#71・T045)の
      // 会話オーバーレイが入れ替わりで自動的に開く(conversationSlotが会話状態を引き継ぐため、
      // 探索状態には戻らずホットスポットはまだ現れない)。入れ替わった瞬間、その最初の操作
      // 可能要素(タイプライターのスキップボタン)へ自動的にフォーカスが移る(advisor指摘の
      // 修正: 直前にホットスポットへ戻ったフォーカスが、この入れ替わりでホットスポットが
      // 再アンマウントされて迷子にならないようにするため)。
      const wrapUpLine = 'そろそろ問題をまとめようか。'
      await screen.findByText(wrapUpLine)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: wrapUpLine }))
      await user.keyboard('{Enter}')
      expect(document.activeElement).toHaveTextContent('わかった')
      await user.keyboard('{Enter}')
      // 閉じると探索状態に戻り、ホットスポットが再び操作できる。
      expect(screen.getByRole('button', { name: /田中さん（人物）/ })).toBeInTheDocument()

      // 「調査ポイント一覧」トグルを開いて、一覧側でも両方調査済みになっていることを確認する
      // (scenes・一覧は同じ状態を共有する)。
      await openInvestigationList(user)
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()

      // 「解決へ進む」が活性化し、キーボードで押せる(結線テストの完了条件)。
      const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
      await waitFor(() => expect(enterResolution).toBeEnabled())
    },
  )

  it('調査結果の会話オーバーレイ上の?ボタンで、獲得済みの手持ちカードを無料で閲覧できる(#66)', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)

    const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
    pcHotspot.focus()
    await user.keyboard('{Enter}')
    // PCはcollect/danger/noopの3action=シート経由。最初のaction(collect)をそのまま実行する。
    await user.keyboard('{Enter}')

    const pcLine = '不審なプロセスの起動ログが残っている。マルウェア感染の可能性が高い。'
    expect(await screen.findByText(pcLine)).toBeInTheDocument()

    // ?ボタンはaria-label固定文言・48px(DESIGN.md「探索シーン」節)。台詞のタイプライターは
    // 全文表示(またはスキップ)後にしか?ボタンが描画されないため、まずスキップする。
    await user.click(screen.getByRole('button', { name: pcLine }))
    const cardDrawerButton = await screen.findByRole('button', {
      name: '手持ちカードを見る（無料）',
    })
    expect(cardDrawerButton).toHaveClass('size-12')
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
    it('会話オーバーレイが開いている間はホットスポットを描画せず、閉じると探索状態に戻る(立ち絵・会話ウィンドウも連動して消える)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // 探索状態(既定): 立ち絵も会話ウィンドウも無く、ホットスポットのみ操作できる。
      expect(screen.queryByRole('button', { name: '閉じる' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /経理担当のPC（PC）/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /田中さん（人物）/ })).toBeInTheDocument()

      // 田中さん(単一action)を調べて会話状態にする。
      await user.click(screen.getByRole('button', { name: /田中さん（人物）/ }))
      const tanakaLine =
        '田中さんに話を聞いた。「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'
      await user.click(screen.getByRole('button', { name: tanakaLine }))

      // 会話状態: ホットスポットはDOMに存在せず、立ち絵(名札)と閉じるボタンが出る。
      expect(screen.queryByRole('button', { name: /経理担当のPC（PC）/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /田中さん（人物）/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
      expect(screen.getAllByText('霧島').length).toBeGreaterThan(0)
      expect(screen.getAllByText('橘').length).toBeGreaterThan(0)
      // 「調査ポイント一覧」トグルは探索・会話のどちらでも常時表示される(発見性の担保)。
      expect(screen.getByRole('button', { name: '調査ポイント一覧' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '閉じる' }))

      // 探索状態に戻り、ホットスポットが再び現れ、立ち絵・閉じるボタンは消える。
      expect(screen.queryByRole('button', { name: '閉じる' })).not.toBeInTheDocument()
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
      // 「閉じる」はタイプライターの全文表示(またはスキップ)後にしか出ない(#64/T042)。
      await user.click(screen.getByRole('button', { name: witnessLine }))
      expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()

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
    const wrapUpLine = 'そろそろ問題をまとめようか。'

    /** 「調査ポイント一覧」トグルを開き、一覧側から全ポイントを調査して「解決へ」の活性条件を満たす。 */
    async function investigateAllViaList(user: ReturnType<typeof userEvent.setup>) {
      await openInvestigationList(user)
      const list = screen.getByRole('list', { name: '調査ポイント一覧' })
      const investigateButtons = within(list).getAllByRole('button', { name: '調査する' })
      for (const button of investigateButtons) {
        await user.click(button)
      }
    }

    it('「解決へ」の活性条件を満たした時点で、会話オーバーレイで橘が「そろそろ問題をまとめようか」と促す', async () => {
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

    it('促しは全文表示(またはスキップ)後に「わかった」で消せ、以降は再描画されても再表示されない(1回だけ)', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      await investigateAllViaList(user)
      await screen.findByText(wrapUpLine)

      // タイプライターをスキップ(台詞そのものがスキップボタンのaccessible name、#64/T042)。
      // ボタン文言は意図的に「わかった」(SceneExplorer側の会話オーバーレイの「閉じる」との
      // アクセシブルネーム衝突を避けるため、#71・T045)。
      await user.click(screen.getByRole('button', { name: wrapUpLine }))
      await user.click(screen.getByRole('button', { name: 'わかった' }))
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      // シーンタブ切替で再描画させても、一度閉じた促しは再表示されない
      // (=再調査のたびに毎回出すことはしない、DESIGN.md「探索シーン」節)。
      await user.click(screen.getByRole('tab', { name: 'サーバ室' }))
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()
    })

    it('最後の1件をホットスポット経由で調べ終えても、調査結果の会話オーバーレイが開いている間は促しを同時に出さず、閉じてから出す', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // 1件目(PC・3action=アクションシート)を先に調べて閉じておく。
      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      await user.keyboard('{Enter}')
      const pcLine = '不審なプロセスの起動ログが残っている。マルウェア感染の可能性が高い。'
      await screen.findByText(pcLine)
      await user.click(screen.getByRole('button', { name: pcLine }))
      await user.click(screen.getByRole('button', { name: '閉じる' }))
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      // 2件目(person・単一action)を調べ終えた瞬間、「解決へ」の活性条件を満たすが、
      // 調査結果の会話オーバーレイ(「閉じる」)が開いている間は促しを表示しない
      // (会話オーバーレイの2重表示・「閉じる」ボタンの重複を避けるため、#71・T045)。
      const personHotspot = screen.getByRole('button', { name: /田中さん（人物）/ })
      await user.click(personHotspot)
      const tanakaLine =
        '田中さんに話を聞いた。「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'
      await screen.findByText(tanakaLine)
      await user.click(screen.getByRole('button', { name: tanakaLine }))
      expect(await screen.findByRole('button', { name: '閉じる' })).toBeInTheDocument()
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      // 会話オーバーレイを閉じると、入れ替わりで促しが表示される。
      await user.click(screen.getByRole('button', { name: '閉じる' }))
      expect(await screen.findByText(wrapUpLine)).toBeInTheDocument()
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

      // 1つ目のcollect(話を聞く・証言・橘)を実行する。
      await user.click(within(sheet).getByRole('button', { name: '話を聞く' }))
      const witnessLine =
        'サーバ管理者に話を聞いた。「昨夜からアラートが増えている」とサーバ管理者は証言した。'
      expect(await screen.findByText(witnessLine)).toBeInTheDocument()
      expect(screen.getAllByText('橘').length).toBeGreaterThan(0)
      await user.click(screen.getByRole('button', { name: witnessLine }))
      await user.click(screen.getByRole('button', { name: '閉じる' }))
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
      await user.click(screen.getByRole('button', { name: '閉じる' }))

      // このフィクスチャの解決条件(ip-log・ip-witnessの両方)は今の2つ目のcollectで満たされる
      // ため、探索完了への誘導(#71・T045)の会話オーバーレイが入れ替わりで自動的に開く
      // (conversationSlotが会話状態を引き継ぐ)。ホットスポットへ戻る前に一旦それを閉じる。
      const wrapUpLine = 'そろそろ問題をまとめようか。'
      await screen.findByText(wrapUpLine)
      await user.click(screen.getByRole('button', { name: wrapUpLine }))
      await user.click(screen.getByRole('button', { name: 'わかった' }))

      // 両方調査済みになり、一覧側も2/2件になる(結線確認)。統合ホットスポット自体も
      // 両方のcollectが埋まったので「調査済み」になる。
      expect(getAdmin()).toHaveAccessibleName(/・調査済み/)
      await openInvestigationList(user)
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()
      const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
      await waitFor(() => expect(enterResolution).toBeEnabled())

      // 「何でもない」(noop)はシートを閉じるだけで何も獲得しない。
      getAdmin().focus()
      await user.keyboard('{Enter}')
      const sheet3 = await screen.findByRole('group', { name: 'サーバ管理者の操作' })
      await user.click(within(sheet3).getByRole('button', { name: '何でもない' }))
      expect(screen.queryByRole('group', { name: 'サーバ管理者の操作' })).not.toBeInTheDocument()
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()
    })
  })
})
