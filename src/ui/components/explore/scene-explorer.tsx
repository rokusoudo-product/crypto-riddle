// src/ui/components/explore/scene-explorer.tsx — 探索④の背景シーン表示(#52/#56・T038、
// 調査結果の会話フレーム化・不可視ホットスポット化は#52 Phase4.7/#66・T044、
// ドア移動UI・prompt見出しは#52 Phase4.7 追補/#78・T046-ui-data)。
//
// DESIGN.md「探索シーン」節が正: 背景シーン(16:9・モバイル縦はレターボックス)の上に
// クリック可能なホットスポット(実<button>・48px以上・aria-label・フォーカス可視)を重ね、
// タップして調べる。シーンタブでシーン切替(キーボード到達可能)に加え、背景内のドア
// (object_type: door・goto アクション)でもシーン移動できる(タブ・ドアの両方で移動可、
// #78・T046-ui-data)。
//
// scenario.scenes が無い場合(省略時)は呼び出し側(explore-screen.tsx)が本コンポーネントを
// レンダーしないことで一覧表示にフォールバックする(docs/scenario_schema.md §2.5)。
//
// 背景画像(#57/T040・T039で生成済みの assets/backgrounds/bg-s1-*.png)は BACKGROUND_SRC に
// 実データがある場合のみ<img>で読み込む。無い場合(テスト専用フィクスチャの `bg-test-*` 等、
// 実背景が未生成のシーン)はトークン色のプレースホルダ(単色地+シーン名ラベル)にフォールバック
// する(#56 実装方針を維持。立ち絵と同じくrepoルートの assets/ を相対importする、
// conversation-frame.tsx と同じパターン)。
//
// ホットスポットの見せ方(#52 Phase4.7・T018''代表決定): 通常はアイコンも名前ラベルも
// 表示しない(背景の絵に溶け込ませる)。ホバー/キーボードフォーカス時にのみ□マーカー(矩形の
// アウトライン)で位置と操作可能を示す(hover:/focus-visible:のCSSのみで実現、JS側の状態は
// 持たない)。読み上げ用の aria-label(種別・名前・調査済みか)は常に保持する(WCAG 2.4.7)。
//
// ホットスポットの動作(docs/scenario_schema.md §2.5・spec §8.4):
// - collect: investigation_point_id のカードを獲得する(呼び出し側の onCollect 経由、
//   既存のINVESTIGATEイベントに接続。coreの状態機械は変更しない)。獲得後は調査結果を
//   会話フレームで台詞提示する(下記参照)。
// - danger: feedback(教育的な台詞)を表示するのみ。ペナルティ無し・操作継続可(詰み防止)。
//   dispatchは一切呼ばないため、電源を落とした後も同じホットスポットは何度でも操作できる。
//   従来どおりアクションシート内のテキストで表示する(会話フレーム化はしない、#66スコープ外)。
// - noop: 何もせず閉じる。
// - goto: シーン移動(#78・T046-ui-data)。investigation_pointを参照しないためonCollectは
//   呼ばず、setActiveSceneIdで移動先シーンへ切り替えたうえで移動先のシーンタブへ
//   フォーカスを移す(gotoScene参照。シーンタブと併用可能=どちらでも移動できる)。
// - 1ホットスポットのactionsが1件のみの場合はアクションシートを出さず、即座にそのactionを
//   実行する(spec本文「PC等で複数actionがあるものはアクションシートで選ばせる」の裏返しで、
//   1件のみ=personの「話を聞く」・doorの「〜へ移動する」等は選ぶ余地が無いため即実行にする)。
//
// アクションシートの見出し(#78・T046-ui-data): ホットスポットの省略可能な prompt(挨拶台詞、
// 例: サーバ管理者「どうしましたか？」)を見出しに表示し、省略時はラベルのみ(現行どおり)。
// 系統をまたぐ統合ホットスポット(人＋機器を1つに束ねた複数collect＋noop)で、何用の操作かを
// 挨拶台詞で示す(DESIGN.md「探索シーン」節)。
//
// 調査結果の会話フレーム提示(#52 Phase4.7・T044、#62 吸収):
// 人物の証言だけでなく、PC のログ・書籍の文献も含めて種別を問わず同じ経路で会話フレームに
// 台詞提示する(旧: personのみ・かつ非ダミー先頭カードを選ぶpickTestimonyCardだったため、
// 対策カードが証言として表示される不具合があった=#62。line/speakerの明示に一本化した
// 本Issueで、その経路自体を廃止して構造的に解消する)。
// 台詞(line)は collect action の line(#65/T043)を使い、無ければ既定の導入文
// (person:「{ラベル}に話を聞いた。」/それ以外:「{ラベル}を調べた。」)＋そのinvestigation_point
// に紐づく先頭カードの本文にフォールバックする。話者(speaker)は action.speaker を優先し、
// 無ければ investigation_point.category から既定を導出する(ログを見る→霧島／それ以外
// (人に聞く・文献を引く)→橘。resolveCollectPresentation参照)。
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

import type {
  Character,
  HotspotAction,
  InvestigationPoint,
  Scenario,
  Scene,
  SceneHotspot,
} from '@/core/model'
import { CardDrawer } from '@/ui/components/card-drawer'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { Button } from '@/ui/components/ui/button'
import { cn } from '@/ui/lib/utils'

import bgS1Office from '../../../../assets/backgrounds/bg-s1-office.png'
import bgS1Server from '../../../../assets/backgrounds/bg-s1-server.png'

/** 生成済み背景アセットのID→importの対応。無いIDはプレースホルダ表示にフォールバックする。 */
const BACKGROUND_SRC: Record<string, string> = {
  'bg-s1-office': bgS1Office,
  'bg-s1-server': bgS1Server,
}

// 色だけに頼らず種別をaria-label(常時保持)でも示す(DESIGN.md「探索シーン」節・WCAG 1.4.1)。
// 通常表示ではアイコン・可視ラベルを一切出さないため、UI上の用途は aria-label の組み立てのみ。
// door(T046・0.6.0でスキーマに追加)も他object_typeと同じ組み立てにする(例:
// 「サーバ室への扉（扉）」)。goto action の実際のシーン遷移挙動は runAction/gotoScene参照
// (#78・T046-ui-data)。
const OBJECT_TYPE_LABEL: Record<SceneHotspot['object_type'], string> = {
  pc: 'PC',
  person: '人物',
  book: '書籍',
  device: '機器',
  door: '扉',
}

type CollectAction = Extract<HotspotAction, { kind: 'collect' }>

function collectActionsOf(hotspot: SceneHotspot): CollectAction[] {
  return hotspot.actions.filter((action): action is CollectAction => action.kind === 'collect')
}

/** ホットスポットが持つ全collect対象がすでに調査済みなら「調査済み」とみなす。 */
function isHotspotInvestigated(
  hotspot: SceneHotspot,
  investigatedPointIds: readonly string[],
): boolean {
  const ids = collectActionsOf(hotspot).map((action) => action.investigation_point_id)
  return ids.length > 0 && ids.every((id) => investigatedPointIds.includes(id))
}

/** 調査3系統(investigation_point.category)から話者の既定を導出する(ログを見る→霧島／
 * 人に聞く・文献を引く→橘。DESIGN.md「探索シーン」節)。CVE等の技術文献はaction.speakerの
 * 明示で霧島に振れる(このデフォルトはaction.speaker未指定の場合のみ使われる)。 */
function defaultSpeakerForCategory(category: InvestigationPoint['category']): Character {
  return category === 'ログを見る' ? '霧島' : '橘'
}

/**
 * collect action の話者・台詞を解決する(#52 Phase4.7/T044)。line/speakerが明示されていれば
 * それを使い、無ければ既定の導入文＋カード本文(先頭カード)にフォールバックする。
 * is_dummyでの選別は行わない(#62 吸収: 非ダミー優先で選ぶ経路自体を廃止したため)。
 */
function resolveCollectPresentation(
  scenario: Scenario,
  hotspot: SceneHotspot,
  action: CollectAction,
): { speaker: Character; line: string } {
  const point = scenario.investigation_points.find((p) => p.id === action.investigation_point_id)
  const speaker = action.speaker ?? defaultSpeakerForCategory(point?.category ?? '人に聞く')
  if (action.line) return { speaker, line: action.line }

  const firstCardBody = scenario.cards.find(
    (c) => c.investigation_point_id === action.investigation_point_id,
  )?.body
  const intro =
    hotspot.object_type === 'person'
      ? `${hotspot.label}に話を聞いた。`
      : `${hotspot.label}を調べた。`
  return { speaker, line: firstCardBody ? `${intro}${firstCardBody}` : intro }
}

export interface SceneExplorerProps {
  scenario: Scenario
  /** scenario.scenes(呼び出し側で存在確認済みの非空配列)。 */
  scenes: readonly Scene[]
  investigatedPointIds: readonly string[]
  /** 獲得済みカードid(会話フレーム上の?ボタン=CardDrawerに渡す、探索で得た手持ちカードの無料閲覧用)。 */
  ownedCardIds: readonly string[]
  /** investigation_point_id を1件獲得する(既存のINVESTIGATEイベント配線先)。 */
  onCollect: (pointId: string) => void
  /**
   * 調査結果の会話フレーム(collectResult)の開閉が変わるたびに通知する(#71・T045)。
   * 呼び出し側(explore-screen.tsx)が「探索完了→解決への誘導」の会話フレームを、この
   * 調査結果パネルと同時に(=立ち絵ステージが2段重ねで)表示しないようにするための
   * UI専用の配線で、coreの状態やactivation条件には一切関与しない。
   */
  onCollectResultOpenChange?: (isOpen: boolean) => void
}

/** 探索④「背景シーン＋ホットスポット」表示(#52/#56)。一覧フォールバックは呼び出し側が併設する。 */
export function SceneExplorer({
  scenario,
  scenes,
  investigatedPointIds,
  ownedCardIds,
  onCollect,
  onCollectResultOpenChange,
}: SceneExplorerProps) {
  const tabsId = useId()
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id)
  const activeSceneIndex = Math.max(
    0,
    scenes.findIndex((s) => s.id === activeSceneId),
  )
  const activeScene = scenes[activeSceneIndex] ?? scenes[0]

  // 開いているアクションシート(複数actionを持つホットスポット用)。`${hotspotIndex}` で識別する
  // (シーン切替時にクリアするため、シーンIDを跨いだ一意化は不要)。
  const [openHotspotIndex, setOpenHotspotIndex] = useState<number | null>(null)
  const [dangerFeedback, setDangerFeedback] = useState<string | null>(null)
  // 調査結果の会話フレーム表示状態(#52 Phase4.7/T044)。人物の証言に限らずcollect全種で使う。
  const [collectResult, setCollectResult] = useState<{
    hotspotLabel: string
    speaker: Character
    line: string
  } | null>(null)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)
  // アクションシート・調査結果パネルを開いたら、フォーカスを内部の最初の操作対象へ自動的に移す
  // (ダイアログ/ディスクロージャの一般的なフォーカス管理。id経由でDOM要素を掴む方式にし、
  // Button コンポーネントの ref 転送有無に依存しないようにする)。
  const sheetFirstActionId = `${tabsId}-sheet-first-action`
  const resultCloseId = `${tabsId}-result-close`

  useEffect(() => {
    if (openHotspotIndex !== null) {
      document.getElementById(sheetFirstActionId)?.focus()
    }
  }, [openHotspotIndex, sheetFirstActionId])

  // 調査結果パネルの開閉を呼び出し側へ通知する(#71・T045。上記コメント・SceneExplorerProps参照)。
  useEffect(() => {
    onCollectResultOpenChange?.(collectResult !== null)
  }, [collectResult, onCollectResultOpenChange])

  // 調査結果パネルの「閉じる」はConversationFrameのchildrenのため、タイプライターの全文表示
  // (またはスキップ)が完了するまでDOMに存在しない(#64/T042)。以前のように collectResult が
  // 変わった直後にフォーカスしても閉じるボタンはまだ無く空振りするため、ConversationFrame の
  // onLineRevealed(全文表示完了の通知)を経由してフォーカスする。

  function closeOverlays() {
    setOpenHotspotIndex(null)
    setDangerFeedback(null)
    setCollectResult(null)
  }

  function returnFocus() {
    returnFocusRef.current?.focus()
  }

  function selectScene(index: number) {
    const scene = scenes[index]
    if (!scene) return
    setActiveSceneId(scene.id)
    closeOverlays()
  }

  /**
   * ドアの goto アクションでシーンを移動する(#78・T046-ui-data)。シーンタブと併用可能にする
   * ため、実体はシーンタブ選択(selectScene)と同じ setActiveSceneId+closeOverlays を行い、
   * さらに移動先のシーンタブへフォーカスを移す(タブはscenes全件を常時描画しているため
   * targetIndexのtabRefsは既に有効。handleTabKeyDownの矢印キー移動と同じ考え方)。
   */
  function gotoScene(sceneId: string) {
    const targetIndex = scenes.findIndex((s) => s.id === sceneId)
    if (targetIndex < 0) return
    setActiveSceneId(sceneId)
    closeOverlays()
    tabRefs.current[targetIndex]?.focus()
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const dir = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + dir + scenes.length) % scenes.length
    selectScene(nextIndex)
    tabRefs.current[nextIndex]?.focus()
  }

  function runAction(hotspot: SceneHotspot, action: HotspotAction) {
    if (action.kind === 'collect') {
      onCollect(action.investigation_point_id)
      // 種別を問わず同じ経路で調査結果を会話フレームに台詞提示する(#62吸収、ファイル冒頭コメント参照)。
      const { speaker, line } = resolveCollectPresentation(scenario, hotspot, action)
      setOpenHotspotIndex(null)
      setDangerFeedback(null)
      setCollectResult({ hotspotLabel: hotspot.label, speaker, line })
      return
    }
    if (action.kind === 'danger') {
      // 教育的フィードバックのみ。dispatchしない=ペナルティ無し・操作継続可(詰み防止)。
      setDangerFeedback(action.feedback)
      return
    }
    if (action.kind === 'goto') {
      // ドアでのシーン移動(#78・T046-ui-data)。investigation_pointを参照しないため
      // onCollectは呼ばない。移動先のシーンタブへフォーカスを移す(gotoScene参照)。
      gotoScene(action.scene_id)
      return
    }
    // noop: 何もせず閉じる。
    setOpenHotspotIndex(null)
    setDangerFeedback(null)
    returnFocus()
  }

  function handleHotspotActivate(
    hotspot: SceneHotspot,
    hotspotIndex: number,
    trigger: HTMLButtonElement,
  ) {
    returnFocusRef.current = trigger
    setCollectResult(null)
    // 単一actionのショートカット即実行は「collectまたはgoto」の場合に限る(例: personの
    // 「話を聞く」、doorの「〜へ移動する」)。いずれも選ぶ余地が無い1択のため、アクションシートを
    // 経由させず即座に実行する(#78・T046-ui-data。goto単独=door標準形をここに含めた)。
    // danger/noop単独の場合はアクションシートを経由させ、教育的フィードバックの表示先
    // (アクションシート内)を確保する(danger単独ホットスポットでもfeedbackが必ず表示される)。
    const onlyAction = hotspot.actions.length === 1 ? hotspot.actions[0] : null
    if (onlyAction && (onlyAction.kind === 'collect' || onlyAction.kind === 'goto')) {
      runAction(hotspot, onlyAction)
      return
    }
    setDangerFeedback(null)
    setOpenHotspotIndex(hotspotIndex)
  }

  const openHotspot =
    openHotspotIndex !== null ? (activeScene.hotspots[openHotspotIndex] ?? null) : null
  // 調査結果の会話フレーム上に置く?ボタン(CardDrawer)へ渡す、探索で得た手持ちカード(#66)。
  const ownedCards = scenario.cards.filter((card) => ownedCardIds.includes(card.id))

  return (
    <div className="flex flex-col gap-3">
      {scenes.length > 1 && (
        <div role="tablist" aria-label="探索シーンの切替" className="flex flex-wrap gap-2">
          {scenes.map((scene, index) => {
            const selected = scene.id === activeScene.id
            return (
              <button
                key={scene.id}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${scene.id}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel-${scene.id}`}
                tabIndex={selected ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                onClick={() => selectScene(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'h-12 min-w-12 rounded-lg border px-4 text-sm font-medium focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none',
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                {scene.title}
              </button>
            )
          })}
        </div>
      )}

      <div
        id={scenes.length > 1 ? `${tabsId}-panel-${activeScene.id}` : undefined}
        role={scenes.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={scenes.length > 1 ? `${tabsId}-tab-${activeScene.id}` : undefined}
        className="flex flex-col gap-3"
      >
        {/* 背景シーン: 16:9既定・モバイル縦は幅にフィット(レターボックス)。横回転は強制しない。
            BACKGROUND_SRC に実データがあれば<img>で読み込み、無ければ(背景未生成のシーン)
            トークン色のプレースホルダ+シーン名で成立させる。
            role="img"はプレースホルダ層(内側のdiv)にだけ付ける: WAI-ARIAのimgロールは
            Children Presentational(子孫を装飾扱いにする)ため、外側のdivに付けると
            支援技術から実<button>のホットスポットが子孫として隠れてしまう
            (<img>の場合は要素自体がimgロールを持つため同様に子孫を隠す点は変わらない)。 */}
        <div className="border-border bg-muted relative aspect-video w-full overflow-hidden rounded-lg border">
          {BACKGROUND_SRC[activeScene.background] ? (
            <img
              src={BACKGROUND_SRC[activeScene.background]}
              alt={`${activeScene.title}の背景`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label={`${activeScene.title}の背景（画像は準備中のためプレースホルダ表示）`}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="font-heading text-muted-foreground text-base sm:text-lg">
                {activeScene.title}（背景 準備中）
              </span>
            </div>
          )}
          {activeScene.hotspots.map((hotspot, hotspotIndex) => {
            const [x, y] = hotspot.position
            const investigated = isHotspotInvestigated(hotspot, investigatedPointIds)
            const needsSheet = hotspot.actions.length > 1
            return (
              <Button
                key={hotspotIndex}
                type="button"
                variant="ghost"
                aria-label={`${hotspot.label}（${OBJECT_TYPE_LABEL[hotspot.object_type]}）${investigated ? '・調査済み' : ''}`}
                aria-expanded={needsSheet ? openHotspotIndex === hotspotIndex : undefined}
                aria-haspopup={needsSheet ? 'true' : undefined}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                // 通常はアイコンも名前ラベルも表示しない(背景の絵に溶け込ませる、DESIGN.md
                // 「探索シーン」節・T018''代表決定)。ホバー/キーボードフォーカス時にのみ
                // □マーカー(矩形のアウトライン)を出し、位置と操作可能を示す。
                // □マーカーの枠線は赤系(hotspot-highlightトークン、T018'''代表フィードバック
                // #71・T045。危険操作のdestructive/warningとは別トークンとして src/index.css に
                // 追加した)。フォーカス可視(WCAG 2.4.7)は□マーカーが兼ねるため、focus-visible
                // でも同じ色にする(色だけでなく枠線の出現自体で操作可能性を示す)。
                // aria-expanded:bg-mutedはButtonのghost variant既定のため、シートを開いた
                // ホットスポットに常時の塗りが出ないよう打ち消す(不可視の原則を優先)。
                className="absolute min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-transparent bg-transparent hover:border-hotspot-highlight hover:bg-transparent hover:ring-3 hover:ring-hotspot-highlight/50 focus-visible:border-hotspot-highlight focus-visible:ring-hotspot-highlight/50 aria-expanded:bg-transparent dark:hover:bg-transparent"
                onClick={(event) =>
                  handleHotspotActivate(hotspot, hotspotIndex, event.currentTarget)
                }
              />
            )
          })}
        </div>

        {/* アクションシート: 複数actionを持つホットスポット用(固定順・並べ替えない)。 */}
        {openHotspot && (
          <div
            role="group"
            aria-label={`${openHotspot.label}の操作`}
            className="border-primary bg-card flex flex-col gap-3 rounded-lg border-t-4 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              {/* 見出し=挨拶台詞(prompt、#78・T046-ui-data)。省略時はラベルのみ(現行どおり)。
                  系統をまたぐ統合ホットスポット(人＋機器を1つに束ねる)で、何用の操作かを
                  挨拶台詞で示す(DESIGN.md「探索シーン」節)。 */}
              <h2 className="font-heading text-base">{openHotspot.prompt ?? openHotspot.label}</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="操作メニューを閉じる"
                onClick={() => {
                  setOpenHotspotIndex(null)
                  setDangerFeedback(null)
                  returnFocus()
                }}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <ul className="flex flex-col gap-2">
              {openHotspot.actions.map((action, actionIndex) => {
                const done =
                  action.kind === 'collect' &&
                  investigatedPointIds.includes(action.investigation_point_id)
                return (
                  <li key={actionIndex}>
                    <Button
                      type="button"
                      variant="outline"
                      id={actionIndex === 0 ? sheetFirstActionId : undefined}
                      className="h-12 min-w-12 w-full justify-start px-4 text-left"
                      onClick={() => runAction(openHotspot, action)}
                    >
                      {action.label}
                      {done && <span className="text-muted-foreground ml-auto text-xs">済</span>}
                    </Button>
                  </li>
                )
              })}
            </ul>
            {/* 電源を落とす等の教育的フィードバック。ペナルティ無し・操作継続可(詰み防止、spec §8.4)。
                aria-live(role=alertにしない。緊急の警告ではないため resolve-screen.tsx と同方針)。 */}
            {dangerFeedback && (
              <div
                aria-live="polite"
                className="border-border bg-background rounded-lg border p-3 text-sm"
              >
                {dangerFeedback}
              </div>
            )}
          </div>
        )}

        {/* 調査結果は種別を問わず会話フレームで台詞提示する(#52 Phase4.7/T044・#62吸収、
            DESIGN.md「探索シーン」節。ファイル冒頭コメント参照)。
            「閉じる」を?ボタン(CardDrawer)より先にDOM上へ置く: タイプライターのスキップ操作
            (#64/T042)は完了後に children 内の最初のフォーカス可能要素へ自動的にフォーカスを
            移すため、閉じるが先勝ちするようにしてホットスポットへのフォーカス復帰動線
            (returnFocus)を保つ。?ボタンは視覚上は同じ行の右側に置く(flexのjustify-betweenで
            並び順=視覚位置がそのまま合致するため、DOM順と見た目の両立を犠牲にしない)。 */}
        {collectResult && (
          <ConversationFrame
            speaker={collectResult.speaker}
            line={collectResult.line}
            onLineRevealed={() => document.getElementById(resultCloseId)?.focus()}
          >
            <p className="text-muted-foreground text-xs">
              {collectResult.hotspotLabel}を調べた結果
            </p>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                id={resultCloseId}
                className="h-12 min-w-12 px-6"
                onClick={() => {
                  setCollectResult(null)
                  returnFocus()
                }}
              >
                閉じる
              </Button>
              {/* カード閲覧(無料)の?ボタン(DESIGN.md「探索シーン」節。解決の card-drawer と同じ、
                  相談=回数消費とは別物)。 */}
              <CardDrawer cards={ownedCards} triggerVariant="icon" />
            </div>
          </ConversationFrame>
        )}
      </div>
    </div>
  )
}
