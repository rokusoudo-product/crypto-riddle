// src/ui/components/explore/scene-explorer.tsx — 探索④の背景シーン表示(#52/#56・T038、
// 調査結果の会話フレーム化・不可視ホットスポット化は#52 Phase4.7/#66・T044、
// ドア移動UI・prompt見出しは#52 Phase4.7 追補/#78・T046-ui-data、
// 会話オーバーレイ化(2状態)・調査ポイント一覧のトグル化は#52 Phase4.7 追補/T047)。
//
// DESIGN.md「探索シーン」節が正: 探索画面は「探索状態」と「会話状態」の2つを切り替える。
// - 探索状態(既定): 背景シーン+ホットスポット(+シーンタブ+右上「調査ポイント一覧」トグル)
//   のみを表示する。立ち絵も会話ウィンドウも表示しない(カーソルでのホットスポット探索を
//   邪魔しないため。T018'''''代表モック確定 2026-09-11)。
// - 会話状態(調査結果/人物証言/dangerの教育的フィードバックを見せる間): 背景シーンを暗転
//   させず保持したまま、その上に会話UI(左右端の立ち絵+下部の会話ウィンドウ)を重ねる
//   (`ConversationFrame` の `layout="overlay"`、conversation-frame.tsx 参照)。閉じると
//   探索状態に戻り、立ち絵・会話ウィンドウは消える(=この間ホットスポットはDOMごと
//   描画しない。会話中に隠れたホットスポットを誤って操作できないようにするため)。
// - 右上「調査ポイント一覧」トグル: 探索状態・会話状態のどちらでも常時表示する(発見性の
//   担保)。旧「常時併設リスト」「モバイルでは初期展開」はこのトグルに置き換えた(#66は
//   本PRで置き換え)。開くと呼び出し側(explore-screen.tsx)から渡された`investigationList`を
//   パネル表示する。一覧からは背景に頼らずキーボードのみで全ポイント調査→解決へ進められる。
// - 探索完了→解決への誘導(橘の「そろそろ問題をまとめようか」)も同じ会話オーバーレイに載せる
//   ため、呼び出し側は`conversationSlot`にoverlay layoutの`ConversationFrame`要素を渡す
//   (scenesが無いフォールバックでは`conversationSlot`を使わずstacked layoutのまま呼び出し側で
//   直接描画する。explore-screen.tsx参照)。
//
// scenario.scenes が無い場合(省略時)は呼び出し側(explore-screen.tsx)が本コンポーネントを
// レンダーしないことで一覧表示にフォールバックする(docs/scenario_schema.md §2.5)。
//
// 背景画像(#57/T040・T039で生成済みの assets/backgrounds/bg-s1-*.png、以降 bg-s2-*(#82)・
// bg-s3-*(#84)・bg-sl-*(#87)を追加。いずれも BACKGROUND_SRC への import＋登録が必要、
// #88で bg-s2-*/bg-s3-* の登録漏れを是正)は BACKGROUND_SRC に実データがある場合のみ<img>で
// 読み込む。無い場合(テスト専用フィクスチャの `bg-test-*` 等、実背景が未生成のシーン)は
// トークン色のプレースホルダ(単色地+シーン名ラベル)にフォールバックする(#56 実装方針を維持。
// 立ち絵と同じくrepoルートの assets/ を相対importする、conversation-frame.tsx と同じパターン)。
//
// ホットスポットの見せ方(#52 Phase4.7・T018''代表決定): 通常はアイコンも名前ラベルも
// 表示しない(背景の絵に溶け込ませる)。ホバー/キーボードフォーカス時にのみ□マーカー(矩形の
// アウトライン)で位置と操作可能を示す(hover:/focus-visible:のCSSのみで実現、JS側の状態は
// 持たない)。読み上げ用の aria-label(種別・名前・調査済みか)は常に保持する(WCAG 2.4.7)。
//
// ホットスポットの動作(docs/scenario_schema.md §2.5・spec §8.4):
// - collect: investigation_point_id のカードを獲得する(呼び出し側の onCollect 経由、
//   既存のINVESTIGATEイベントに接続。coreの状態機械は変更しない)。獲得後は調査結果を
//   会話オーバーレイで台詞提示する(下記参照)。
// - danger: feedback(教育的な台詞)を会話オーバーレイで提示する(T047で従来のアクションシート内
//   テキスト表示から変更。DESIGN.md「PC操作メニュー」節「橘の台詞・会話フレーム」)。
//   ペナルティ無し・操作継続可(詰み防止): dispatchは一切呼ばないため、閉じて同じホットスポットを
//   再度開けば何度でも操作できる(電源を落とした後もPCの他のactionを選べる)。
// - noop: 何もせず閉じる。
// - goto: シーン移動(#78・T046-ui-data)。investigation_pointを参照しないためonCollectは
//   呼ばず、setActiveSceneIdで移動先シーンへ切り替えたうえで移動先のシーンタブへ
//   フォーカスを移す(gotoScene参照。シーンタブと併用可能=どちらでも移動できる)。
// - 1ホットスポットのactionsが1件のみの場合はアクションシートを出さず、即座にそのactionを
//   実行する(spec本文「PC等で複数actionがあるものはアクションシートで選ばせる」の裏返しで、
//   1件のみ=personの「話を聞く」・doorの「〜へ移動する」等は選ぶ余地が無いため即実行にする)。
//   danger/noop単独の場合は従来どおりアクションシートを経由させる(この判定自体はT047で
//   変更していない。変わったのは経由後にdangerが表示される先=会話オーバーレイだけ)。
//
// アクションシートの見出し(#78・T046-ui-data): ホットスポットの省略可能な prompt(挨拶台詞、
// 例: サーバ管理者「どうしましたか？」)を見出しに表示し、省略時はラベルのみ(現行どおり)。
// 系統をまたぐ統合ホットスポット(人＋機器を1つに束ねた複数collect＋noop)で、何用の操作かを
// 挨拶台詞で示す(DESIGN.md「探索シーン」節)。
//
// 調査結果の会話オーバーレイ提示(#52 Phase4.7/T044・#62 吸収、T047で重畳表示化):
// 人物の証言だけでなく、PC のログ・書籍の文献も含めて種別を問わず同じ経路で会話オーバーレイに
// 台詞提示する(旧: personのみ・かつ非ダミー先頭カードを選ぶpickTestimonyCardだったため、
// 対策カードが証言として表示される不具合があった=#62。line/speakerの明示に一本化した
// #66で、その経路自体を廃止して構造的に解消済み)。
// 台詞(line)は collect action の line(#65/T043)を使い、無ければ既定の導入文
// (person:「{ラベル}に話を聞いた。」/それ以外:「{ラベル}を調べた。」)＋そのinvestigation_point
// に紐づく先頭カードの本文にフォールバックする。話者(speaker)は action.speaker を優先し、
// 無ければ investigation_point.category から既定を導出する(ログを見る→霧島／それ以外
// (人に聞く・文献を引く)→橘。resolveCollectPresentation参照)。
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
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
import bgS2Office from '../../../../assets/backgrounds/bg-s2-office.png'
import bgS2Server from '../../../../assets/backgrounds/bg-s2-server.png'
import bgS3Office from '../../../../assets/backgrounds/bg-s3-office.png'
import bgS3OpsRoom from '../../../../assets/backgrounds/bg-s3-ops-room.png'
import bgSlOffice from '../../../../assets/backgrounds/bg-sl-office.png'
import bgSlVendor from '../../../../assets/backgrounds/bg-sl-vendor.png'

/** 生成済み背景アセットのID→importの対応。無いIDはプレースホルダ表示にフォールバックする。
 * 【量産時の注意・#88】新しいマップの背景PNGを assets/backgrounds/ に追加したら、
 * 必ずこのタイミングで import 文＋このマップにもエントリを追加すること。
 * PNG追加だけでは自動配線されず、bg-s2系・bg-s3系のように「PNGは存在するのに
 * ここへの登録漏れでプレースホルダ表示のまま」という既発生の不具合(#88)を繰り返す。 */
const BACKGROUND_SRC: Record<string, string> = {
  'bg-s1-office': bgS1Office,
  'bg-s1-server': bgS1Server,
  'bg-s2-office': bgS2Office,
  'bg-s2-server': bgS2Server,
  'bg-s3-office': bgS3Office,
  'bg-s3-ops-room': bgS3OpsRoom,
  'bg-sl-office': bgSlOffice,
  'bg-sl-vendor': bgSlVendor,
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
type DangerAction = Extract<HotspotAction, { kind: 'danger' }>

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

// danger の feedback は scenarios/*.yaml・テストフィクスチャのいずれも「橘「〜」」という
// 引用付きの形式で統一して書かれている(会話フレーム導入=#42より前からの記法)。会話オーバーレイの
// 名札に既に「橘」を表示するため、この形式に一致する場合だけ引用符を剥がして本文のみを話者の
// 台詞として使う(二重に名乗らせないため)。schema/YAMLの変更はしない防御的な後方互換パースで、
// 一致しない(将来 橘 以外が話す等の)feedbackはそのまま使う。
const QUOTED_TACHIBANA_FEEDBACK = /^橘「(.+)」$/
function resolveDangerPresentation(action: DangerAction): { speaker: Character; line: string } {
  const match = QUOTED_TACHIBANA_FEEDBACK.exec(action.feedback)
  return { speaker: '橘', line: match ? match[1] : action.feedback }
}

/** 会話オーバーレイに載せる内容(調査結果=collect、danger の教育的フィードバックの2種類、T047)。 */
interface ConversationContent {
  kind: 'collect' | 'danger'
  hotspotLabel: string
  speaker: Character
  line: string
}

export interface SceneExplorerProps {
  scenario: Scenario
  /** scenario.scenes(呼び出し側で存在確認済みの非空配列)。 */
  scenes: readonly Scene[]
  investigatedPointIds: readonly string[]
  /** 獲得済みカードid(会話オーバーレイ上の?ボタン=CardDrawerに渡す、探索で得た手持ちカードの無料閲覧用)。 */
  ownedCardIds: readonly string[]
  /** investigation_point_id を1件獲得する(既存のINVESTIGATEイベント配線先)。 */
  onCollect: (pointId: string) => void
  /**
   * 会話オーバーレイ(調査結果・danger)の開閉が変わるたびに通知する(#71・T045、
   * dangerも会話オーバーレイ化したT047でdangerの開閉も対象に含めるよう拡張)。
   * 呼び出し側(explore-screen.tsx)が「探索完了→解決への誘導」(conversationSlot)を、
   * このコンポーネント自身の会話オーバーレイと同時に表示しないようにするためのUI専用の配線で、
   * coreの状態やactivation条件には一切関与しない。
   */
  onConversationOpenChange?: (isOpen: boolean) => void
  /**
   * 「調査ポイント一覧」トグルパネルの中身(#66→T047でトグル化)。呼び出し側が
   * scenario.investigation_points/progressから組み立てたJSXをそのまま渡す(見出し・
   * 件数・調査ボタンの一覧。中身の構築はexplore-screen.tsxの責務のまま変えない)。
   * 一覧からは背景に頼らずキーボードのみで全ポイント調査→解決へ進められることを維持する。
   */
  investigationList: ReactNode
  /**
   * 会話オーバーレイの外部枠(T047)。呼び出し側の「探索完了→解決への誘導」等、
   * このコンポーネント自身のcollect/danger以外の会話を同じオーバーレイ上に重ねたい場合に使う
   * (`layout="overlay"`の`ConversationFrame`要素を渡すこと)。collect/dangerの会話が開いている
   * 間は渡されていても表示しない(二重表示防止)。
   */
  conversationSlot?: ReactNode
}

/** 探索④「背景シーン＋ホットスポット」表示(#52/#56)。一覧フォールバックは呼び出し側が併設する。 */
export function SceneExplorer({
  scenario,
  scenes,
  investigatedPointIds,
  ownedCardIds,
  onCollect,
  onConversationOpenChange,
  investigationList,
  conversationSlot,
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
  // 会話オーバーレイの中身(調査結果=collect/danger、T047で統合。以前はcollectResult/
  // dangerFeedbackの2つのstateだったが、どちらも「会話状態」として排他的に1つしか
  // 表示されないため1つのstateにまとめた)。
  const [conversation, setConversation] = useState<ConversationContent | null>(null)
  // 「調査ポイント一覧」トグルパネルの開閉(#66→T047でトグル化)。シーン切替では閉じない
  // (一覧はシーンをまたいだ全ポイントの一覧のため、シーン非依存で開閉を保持する)。
  const [isListOpen, setIsListOpen] = useState(false)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // 会話オーバーレイ/アクションシートを閉じた後にフォーカスを戻す先のホットスポットindex。
  // 会話オーバーレイ表示中はホットスポット自体をDOMごと描画しない(T047)ため、要素への直接refでは
  // 閉じた瞬間に古い(アンマウント済みの)ノードを掴んでしまう。indexだけを覚えておき、
  // 再マウント後にid経由(hotspotDomId)で探して.focus()する(下記のuseEffect参照)。
  const returnFocusHotspotIndexRef = useRef<number | null>(null)
  // アクションシート・会話オーバーレイを開いたら、フォーカスを内部の最初の操作対象へ自動的に移す
  // (ダイアログ/ディスクロージャの一般的なフォーカス管理。id経由でDOM要素を掴む方式にし、
  // Button コンポーネントの ref 転送有無に依存しないようにする)。
  const sheetFirstActionId = `${tabsId}-sheet-first-action`
  const conversationCloseId = `${tabsId}-conversation-close`
  const listPanelId = `${tabsId}-investigation-list-panel`
  const conversationSlotId = `${tabsId}-conversation-slot`

  /** ホットスポットの実体<button>のdom id(会話オーバーレイを閉じた後のフォーカス復帰に使う)。 */
  function hotspotDomId(hotspotIndex: number): string {
    return `${tabsId}-hotspot-${hotspotIndex}`
  }

  useEffect(() => {
    if (openHotspotIndex !== null) {
      document.getElementById(sheetFirstActionId)?.focus()
    }
  }, [openHotspotIndex, sheetFirstActionId])

  // 「調査ポイント一覧」トグルを開いた瞬間だけパネル自体へフォーカスを移す(依存配列は
  // isListOpenのみ=開いた/閉じたの遷移でしか発火しないため、パネル内のボタン操作による
  // 再レンダーのたびにフォーカスを奪い返すことはない。インラインのcallback refだと
  // 毎レンダーで新しい関数として呼ばれ直しフォーカスを奪ってしまうため、useEffectにする)。
  useEffect(() => {
    if (isListOpen) document.getElementById(listPanelId)?.focus()
  }, [isListOpen, listPanelId])

  // 会話オーバーレイの開閉を呼び出し側へ通知する(#71・T045。上記コメント・SceneExplorerProps参照)。
  useEffect(() => {
    onConversationOpenChange?.(conversation !== null)
  }, [conversation, onConversationOpenChange])

  // 会話オーバーレイを閉じた瞬間、ホットスポットが再マウントされた後にフォーカスを戻す
  // (T047・上記returnFocusHotspotIndexRefのコメント参照)。conversationがnullになる
  // 遷移でのみ発火すればよいため依存配列はconversationのみにする(returnFocusHotspotIndexRefの
  // 値自体はイベントハンドラ内で直接更新するrefのため、effectの再実行トリガーにはしない)。
  useEffect(() => {
    if (conversation !== null) return
    const index = returnFocusHotspotIndexRef.current
    if (index === null) return
    document.getElementById(hotspotDomId(index))?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation])

  // 呼び出し側の会話(conversationSlot、探索完了→解決への誘導)が自身のconversationと
  // 入れ替わりで表示された瞬間、その内部の最初の操作可能要素(タイプライターのスキップボタン、
  // またはprefers-reduced-motionなら「わかった」等)へフォーカスを移す(advisor指摘)。
  // これが無いと、直前にホットスポットへ戻ったフォーカスが、この入れ替わり表示でホットスポットが
  // 再度アンマウントされた瞬間にdocumentへ落ちてしまう(キーボード利用者が最後の手がかりを
  // 調べ終えた直後に迷子になる)。isWrapUpVisibleはboolean(プリミティブ)のため、trueの間
  // ずっと表示され続けても再発火はしない(false→trueの遷移でのみ発火、他のuseEffectと同じ設計)。
  const isWrapUpVisible = conversation === null && Boolean(conversationSlot)
  useEffect(() => {
    if (!isWrapUpVisible) return
    document
      .getElementById(conversationSlotId)
      ?.querySelector<HTMLElement>('button:not([disabled])')
      ?.focus()
  }, [isWrapUpVisible, conversationSlotId])

  function closeOverlays() {
    setOpenHotspotIndex(null)
    // シーン切替(selectScene/gotoScene)で呼ばれるため、戻り先のホットスポットindexは
    // 別シーンのものとして意味を失う。先にnullへ落としておかないと、下のuseEffectが
    // 新しいシーンの同じindexのホットスポット(無関係な要素)へ誤ってフォーカスしてしまう
    // (advisor指摘)。
    returnFocusHotspotIndexRef.current = null
    setConversation(null)
  }

  /** アクションシートのX閉じる・noop選択時の、ホットスポットへのフォーカス復帰(同期)。
   * この経路ではホットスポットは会話オーバーレイと違って常に描画されたままのため、
   * 上のuseEffectを介さずその場でfocusしてよい。 */
  function returnFocus() {
    const index = returnFocusHotspotIndexRef.current
    if (index === null) return
    document.getElementById(hotspotDomId(index))?.focus()
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
      // 種別を問わず同じ経路で調査結果を会話オーバーレイに台詞提示する(#62吸収、ファイル冒頭コメント参照)。
      const { speaker, line } = resolveCollectPresentation(scenario, hotspot, action)
      setOpenHotspotIndex(null)
      setConversation({ kind: 'collect', hotspotLabel: hotspot.label, speaker, line })
      return
    }
    if (action.kind === 'danger') {
      // 教育的フィードバックを会話オーバーレイで提示する(T047。dispatchしない=ペナルティ無し・
      // 操作継続可。詰み防止=閉じて同じホットスポットを再度開けば他のactionを選べる)。
      const { speaker, line } = resolveDangerPresentation(action)
      setOpenHotspotIndex(null)
      setConversation({ kind: 'danger', hotspotLabel: hotspot.label, speaker, line })
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
    returnFocus()
  }

  function handleHotspotActivate(hotspot: SceneHotspot, hotspotIndex: number) {
    returnFocusHotspotIndexRef.current = hotspotIndex
    setConversation(null)
    // 単一actionのショートカット即実行は「collectまたはgoto」の場合に限る(例: personの
    // 「話を聞く」、doorの「〜へ移動する」)。いずれも選ぶ余地が無い1択のため、アクションシートを
    // 経由させず即座に実行する(#78・T046-ui-data。goto単独=door標準形をここに含めた)。
    // danger/noop単独の場合はアクションシートを経由させる(この判定はT047で変更していない)。
    const onlyAction = hotspot.actions.length === 1 ? hotspot.actions[0] : null
    if (onlyAction && (onlyAction.kind === 'collect' || onlyAction.kind === 'goto')) {
      runAction(hotspot, onlyAction)
      return
    }
    setOpenHotspotIndex(hotspotIndex)
  }

  const openHotspot =
    openHotspotIndex !== null ? (activeScene.hotspots[openHotspotIndex] ?? null) : null
  // 会話オーバーレイ上に置く?ボタン(CardDrawer)へ渡す、探索で得た手持ちカード(#66)。
  const ownedCards = scenario.cards.filter((card) => ownedCardIds.includes(card.id))
  // 会話状態かどうか(DESIGN.md「探索シーン」節「2つの状態」)。自身のconversation(collect/danger)
  // に加え、呼び出し側から渡されたconversationSlot(探索完了→解決への誘導)も会話状態に含める。
  const isConversationActive = conversation !== null || Boolean(conversationSlot)

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

          {/* 「調査ポイント一覧」トグル(#66→T047でトグル化): 探索状態・会話状態のどちらでも
              常時表示する(発見性の担保、DESIGN.md「探索シーン」節「一覧フォールバック」)。
              キーボード到達順を「トグル→ホットスポット→(会話状態では会話ウィンドウ内)」に
              するため、ホットスポット・会話オーバーレイより先にDOM上へ置く。背景画像の上に
              常時視認できる必要があるため、ホットスポットとは逆にbg-card等で常時可視にする。 */}
          <Button
            type="button"
            variant="outline"
            aria-expanded={isListOpen}
            aria-controls={listPanelId}
            onClick={() => setIsListOpen((v) => !v)}
            className="bg-card/95 hover:bg-card absolute top-2 right-2 z-20 h-12 min-w-12 px-3 text-sm font-medium shadow-sm"
          >
            調査ポイント一覧
          </Button>

          {/* 探索状態でのみホットスポットを描画する(会話状態では背景の下に隠さず、そもそも
              DOMに置かない=誤操作防止・キーボード到達順の単純化、DESIGN.md「探索シーン」節)。 */}
          {!isConversationActive &&
            activeScene.hotspots.map((hotspot, hotspotIndex) => {
              const [x, y] = hotspot.position
              const investigated = isHotspotInvestigated(hotspot, investigatedPointIds)
              const needsSheet = hotspot.actions.length > 1
              return (
                <Button
                  key={hotspotIndex}
                  type="button"
                  variant="ghost"
                  id={hotspotDomId(hotspotIndex)}
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
                  onClick={() => handleHotspotActivate(hotspot, hotspotIndex)}
                />
              )
            })}

          {/* 会話状態(T047): 調査結果/dangerの教育的フィードバック(自身のconversation)、
              または呼び出し側の会話(conversationSlot、探索完了→解決への誘導)を排他的に
              重ねる。背景シーンは暗転させずそのまま保持する(DESIGN.md「探索シーン」節)。 */}
          {conversation ? (
            <ConversationFrame
              layout="overlay"
              speaker={conversation.speaker}
              line={conversation.line}
              onLineRevealed={() => document.getElementById(conversationCloseId)?.focus()}
            >
              <p className="text-muted-foreground text-xs">
                {conversation.kind === 'collect'
                  ? `${conversation.hotspotLabel}を調べた結果`
                  : `${conversation.hotspotLabel}を操作した結果`}
              </p>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  id={conversationCloseId}
                  className="h-12 min-w-12 px-6"
                  onClick={() => setConversation(null)}
                >
                  閉じる
                </Button>
                {/* カード閲覧(無料)の?ボタン(DESIGN.md「探索シーン」節。解決の card-drawer と同じ、
                    相談=回数消費とは別物)。 */}
                <CardDrawer cards={ownedCards} triggerVariant="icon" />
              </div>
            </ConversationFrame>
          ) : conversationSlot ? (
            // idはisWrapUpVisibleのuseEffectが最初の操作可能要素を探すためのフック
            // (上記コメント参照)。
            <div id={conversationSlotId}>{conversationSlot}</div>
          ) : null}
        </div>

        {/* アクションシート: 複数actionを持つホットスポット用(固定順・並べ替えない)。
            探索状態でのみ開き得る(danger/collectを選ぶと会話オーバーレイに切り替わってこのシートは
            閉じるため、会話状態と同時に表示されることはない)。 */}
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
          </div>
        )}
      </div>

      {/* 「調査ポイント一覧」トグルパネル(#66→T047でトグル化)。中身は呼び出し側
          (explore-screen.tsx)が組み立てたものをそのまま表示する。開いた瞬間にパネル自体へ
          フォーカスを移し(tabIndex=-1)、ホットスポットを何度もTabで飛ばさずに一覧の
          最初の操作へ到達できるようにする(WCAG、DESIGN.md「一覧フォールバック」節)。 */}
      {isListOpen && (
        <div
          id={listPanelId}
          tabIndex={-1}
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 outline-none"
        >
          {investigationList}
        </div>
      )}
    </div>
  )
}
