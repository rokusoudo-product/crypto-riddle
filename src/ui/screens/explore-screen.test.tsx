/** @vitest-environment jsdom */
// src/ui/screens/explore-screen.test.tsx — 探索④の背景シーンUI(#52/#56・T038)の結線テスト。
//
// Issue #56 完了条件: 「背景・一覧の両方で、キーボードのみで全ポイント調査→解決へ進める結線
// テストが通る」「4状態(通常/ローディング=判定中/空=未調査/エラー)を満たす」。
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

describe('探索④ 背景シーン＋ホットスポット(#52/#56・T038)', () => {
  it('scenesが無いシナリオでは背景シーンUIを表示せず、一覧のみになる(既存動作の回帰)', () => {
    renderExplore(s0SampleFixture)
    expect(screen.queryByRole('tablist', { name: '探索シーンの切替' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '調査ポイント一覧' })).toBeInTheDocument()
  })

  it('scenesがあるシナリオでは背景シーンと一覧の両方が併設される', () => {
    renderExplore(exploreSceneFixture)
    // 背景シーン(プレースホルダ、T039待ち)。
    expect(screen.getByRole('img', { name: /執務室の背景（画像は準備中/ })).toBeInTheDocument()
    // 一覧フォールバックも常に併設される。
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
      '(danger操作は教育的フィードバックのみでペナルティ無し・操作継続可、調査結果は会話フレームで台詞提示される#66)',
    async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // PCホットスポットへフォーカスして開く(actionsが3件=アクションシート)。
      // 開いたシート内の最初のactionへ自動的にフォーカスが移る(ダイアログ的なフォーカス管理)。
      const pcHotspot = screen.getByRole('button', { name: /経理担当のPC（PC）/ })
      pcHotspot.focus()
      await user.keyboard('{Enter}')
      expect(await screen.findByRole('group', { name: '経理担当のPCの操作' })).toBeInTheDocument()
      expect(document.activeElement).toHaveTextContent('ログを取る')

      // 「電源を落とす」(danger)へ1つ進んで選ぶ: 教育的フィードバックが出るが、
      // 探索ではペナルティにならず、シートも閉じない(詰み防止・spec §8.4)。
      const progressBeforeDanger = useGameStore.getState().progress
      await user.keyboard('{Tab}')
      expect(document.activeElement).toHaveTextContent('電源を落とす')
      await user.keyboard('{Enter}')
      expect(await screen.findByText(/揮発性メモリの証拠が消えます/)).toBeInTheDocument()
      // シートは開いたままで、他のactionを続けて選べる(電源を落とした後も操作継続可)。
      expect(screen.getByRole('group', { name: '経理担当のPCの操作' })).toBeInTheDocument()
      // dangerはdispatchを一切呼ばない(coreのprogressが参照レベルで完全に不変=XP等への影響皆無)。
      expect(useGameStore.getState().progress).toBe(progressBeforeDanger)

      // Shift+Tabで「ログを取る」(collect)へ戻り、カードを獲得する。
      // シートは閉じ、調査結果が会話フレームで台詞提示される(#66/T044、PCのlineは明示済み)。
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toHaveTextContent('ログを取る')
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.queryByRole('group', { name: '経理担当のPCの操作' })).not.toBeInTheDocument()
      })
      expect(screen.getAllByText('霧島').length).toBeGreaterThan(0)
      const pcLine = '不審なプロセスの起動ログが残っている。マルウェア感染の可能性が高い。'
      expect(screen.getByText(pcLine)).toBeInTheDocument()

      // 「閉じる」は会話フレームのchildrenのため、タイプライターの全文表示(またはスキップ)後に
      // しか出ない(#64/T042)。台詞そのものがスキップボタンのaccessible nameになるので、
      // それをフォーカスしてEnterでキーボードのみスキップする。スキップすると children 内の
      // 最初のフォーカス可能要素(=「閉じる」。?ボタンより先にDOM上へ置いている)へ
      // 自動的にフォーカスが移る(ConversationFrame側の仕様)。
      screen.getByRole('button', { name: pcLine }).focus()
      await user.keyboard('{Enter}')
      expect(document.activeElement).toHaveTextContent('閉じる')
      await user.keyboard('{Enter}')
      expect(screen.queryByText(pcLine)).not.toBeInTheDocument()
      expect(document.activeElement).toBe(pcHotspot)
      expect(pcHotspot).toHaveAccessibleName(/・調査済み/)

      // 人物ホットスポット(person・単一action)。line/speakerを省略しているため、既定の
      // 導入文＋カード本文へのフォールバックで会話フレームに表示される(話者既定=橘、#66)。
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
      expect(document.activeElement).toBe(personHotspot)

      // 一覧側でも両方調査済みになっている(scenes・一覧は同じ状態を共有する)。
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()

      // 「解決へ進む」が活性化し、キーボードで押せる(結線テストの完了条件)。
      const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
      await waitFor(() => expect(enterResolution).toBeEnabled())
    },
  )

  it('調査結果の会話フレーム上の?ボタンで、獲得済みの手持ちカードを無料で閲覧できる(#66)', async () => {
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

  it('一覧フォールバックだけでも、背景に頼らずキーボードのみで全ポイント調査→解決へ進められる', async () => {
    const user = userEvent.setup()
    renderExplore(exploreSceneFixture)

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

  describe('探索完了→解決への誘導(#52 Phase4.7/#71・T045)', () => {
    const wrapUpLine = 'そろそろ問題をまとめようか。'

    /** 一覧フォールバック側から全ポイントを調査し、「解決へ」の活性条件を満たす。 */
    async function investigateAllViaList(user: ReturnType<typeof userEvent.setup>) {
      const list = screen.getByRole('list', { name: '調査ポイント一覧' })
      const investigateButtons = within(list).getAllByRole('button', { name: '調査する' })
      for (const button of investigateButtons) {
        await user.click(button)
      }
    }

    it('「解決へ」の活性条件を満たした時点で、会話フレームで橘が「そろそろ問題をまとめようか」と促す', async () => {
      const user = userEvent.setup()
      renderExplore(exploreSceneFixture)

      // 活性条件を満たす前は促しが出ない。
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      await investigateAllViaList(user)

      // 会話フレーム(タイプライター)のsr-only全文は演出の進行に関わらず常に存在するため、
      // getByTextでそのまま検証できる(他のcollectResultテストと同じ挙動)。
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
      // ボタン文言は意図的に「わかった」(SceneExplorer側の調査結果パネルの「閉じる」との
      // アクセシブルネーム衝突を避けるため、#71・T045)。
      await user.click(screen.getByRole('button', { name: wrapUpLine }))
      await user.click(screen.getByRole('button', { name: 'わかった' }))
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      // シーンタブ切替で再描画させても、一度閉じた促しは再表示されない
      // (=再調査のたびに毎回出すことはしない、DESIGN.md「探索シーン」節)。
      await user.click(screen.getByRole('tab', { name: 'サーバ室' }))
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()
    })

    it('最後の1件をホットスポット経由で調べ終えても、調査結果の会話フレームが開いている間は促しを同時に出さず、閉じてから出す', async () => {
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
      // 調査結果の会話フレーム(collectResultの「閉じる」)が開いている間は促しを表示しない
      // (会話フレームの2段重ね・「閉じる」ボタンの重複を避けるため、#71・T045)。
      const personHotspot = screen.getByRole('button', { name: /田中さん（人物）/ })
      await user.click(personHotspot)
      const tanakaLine =
        '田中さんに話を聞いた。「昼過ぎに画面の様子がおかしくなった」と田中さんは証言した。'
      await screen.findByText(tanakaLine)
      await user.click(screen.getByRole('button', { name: tanakaLine }))
      expect(await screen.findByRole('button', { name: '閉じる' })).toBeInTheDocument()
      expect(screen.queryByText(wrapUpLine)).not.toBeInTheDocument()

      // 調査結果パネルを閉じると、入れ替わりで促しが表示される。
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

      const admin = screen.getByRole('button', { name: /サーバ管理者（人物）/ })
      admin.focus()
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
      expect(admin).not.toHaveAccessibleName(/・調査済み/)

      // 2つ目のcollect(PCを確認する・ログ・霧島)も独立して機能する。
      admin.focus()
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

      // 両方調査済みになり、一覧側も2/2件になる(結線確認)。統合ホットスポット自体も
      // 両方のcollectが埋まったので「調査済み」になる。
      expect(admin).toHaveAccessibleName(/・調査済み/)
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()
      const enterResolution = screen.getByRole('button', { name: '解決へ進む' })
      await waitFor(() => expect(enterResolution).toBeEnabled())

      // 「何でもない」(noop)はシートを閉じるだけで何も獲得しない。
      admin.focus()
      await user.keyboard('{Enter}')
      const sheet3 = await screen.findByRole('group', { name: 'サーバ管理者の操作' })
      await user.click(within(sheet3).getByRole('button', { name: '何でもない' }))
      expect(screen.queryByRole('group', { name: 'サーバ管理者の操作' })).not.toBeInTheDocument()
      expect(screen.getByText('2/2 件調査済み')).toBeInTheDocument()
    })
  })
})
