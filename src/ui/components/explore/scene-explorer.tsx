// src/ui/components/explore/scene-explorer.tsx — 探索④の背景シーン表示(#52/#56・T038、
// 調査結果の会話フレーム化・不可視ホットスポット化は#52 Phase4.7/#66・T044、
// ドア移動UI・prompt見出しは#52 Phase4.7 追補/#78・T046-ui-data、
// 会話オーバーレイ化(2状態)・調査ポイント一覧のトグル化は#52 Phase4.7 追補/T047、
// 会話ウィンドウのクリック/タップ閉じ・右上ボタン群の不透明化とヒント確認の移設は
// #52 Phase4.7 追補/T048、探索完了への誘導を「閉じて再探索も可・ロックしない」形にしたのは
// PR#92追補・代表FB、アクションシート(ホットスポットの選択肢)を画面中央オーバーレイ・
// 選択肢ボタン半透明80%・「戻る」選択肢の必須化にしたのは#52 追補・代表FB(2026-09-11))。
//
// DESIGN.md「探索シーン」節が正: 探索画面は「探索状態」と「会話状態」の2つを切り替える。
// - 探索状態(既定): 背景シーン+ホットスポット(+シーンタブ+右上のボタン群「ヒント確認」
//   「調査ポイント一覧」)のみを表示する。立ち絵も会話ウィンドウも表示しない(カーソルでの
//   ホットスポット探索を邪魔しないため。T018'''''代表モック確定 2026-09-11)。
// - 会話状態(調査結果/人物証言/dangerの教育的フィードバックを見せる間): 背景シーンを暗転
//   させず保持したまま、その上に会話UI(左右端の立ち絵+下部の会話ウィンドウ)を重ねる
//   (`ConversationFrame` の `layout="overlay"`、conversation-frame.tsx 参照)。専用の
//   「閉じる」ボタンは置かず、会話ウィンドウをクリック/タップ(またはEnter/Space/Escape)で
//   閉じる(T048。タイプライター送出中はまずスキップ=全文表示、全文表示後の操作で閉じる
//   2段階、`ConversationFrame`の`onDismiss` prop参照)。閉じると探索状態に戻り、
//   立ち絵・会話ウィンドウは消える(=この間ホットスポットはDOMごと描画しない。会話中に
//   隠れたホットスポットを誤って操作できないようにするため。会話を閉じる操作自体もこの
//   非表示化のおかげでホットスポットと競合しない)。
// - 右上のボタン群「ヒント確認」(左・手持ちカード閲覧=card-drawer)＋「調査ポイント一覧」
//   (右・トグル): 探索状態・会話状態のどちらでも常時表示する(発見性の担保)。両方とも
//   透過させず不透明の背景(bg-card+border)にする(T048。旧95%不透明だと背景に溶けて
//   見えにくかったため)。「ヒント確認」は旧・会話ウィンドウ内の?カードボタンをここへ
//   一本化したもの(T048でaria-label「手持ちカードを見る（無料）」は維持したまま移設)。
//   「調査ポイント一覧」は旧「常時併設リスト」「モバイルでは初期展開」の置き換え(#66)。
//   開くと呼び出し側(explore-screen.tsx)から渡された`investigationList`をパネル表示する。
//   一覧からは背景に頼らずキーボードのみで全ポイント調査→解決へ進められる。
// - 探索完了→解決への誘導(橘の「材料は揃ったわ。そろそろ問題を整理しましょう。」)も同じ会話オーバーレイに載せる
//   ため、呼び出し側は`conversationSlot`にoverlay layoutの`ConversationFrame`要素を渡す
//   (scenesが無いフォールバックでは`conversationSlot`を使わずstacked layoutのまま呼び出し側で
//   直接描画する。explore-screen.tsx参照。conversationSlot側は独自の「わかった」ボタンを
//   持つため、T048のonDismissクリック閉じ(ウィンドウ自体が操作領域)は適用できない=ボタンの
//   入れ子になってしまう。代わりにPR#92追補・代表FBで`onOutsideDismiss`(ウィンドウの外側の
//   クリック/タップ・Escape)を導入し、閉じると探索状態に戻ってホットスポットを再探索できる
//   =ロックしない。conversationSlotが閉じられて無くなった瞬間、下記のuseEffectで先頭
//   ホットスポットへフォーカスを戻す)。
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
// アクションシートの表示位置・半透明化・「戻る」選択肢の必須化(#52 追補・代表FB 2026-09-11):
// 旧・画面下部/ホットスポット近傍のパネル表示から、見出し(prompt/ラベル)＋2〜3個の選択肢を
// 背景シーンの箱(aspect-video)の中央にオーバーレイ表示する形に変更した(会話オーバーレイと
// 同じ`absolute inset-0`のコンテナに重ねる)。見出し・選択肢ボタンは共通の半透明（ガラス風）
// パネル(`glass-panel`ユーティリティ、DESIGN.md「半透明（ガラス風）パネル」節・#133で
// 旧`bg-card/80`直書きから移行。最小不透明度は`--glass-panel-min-alpha`=0.81)にし、
// 背景シーンがうっすら透けて見えるようにする。
// 右上の「ヒント確認」「調査ポイント一覧」は発見性のため従来どおり不透明のまま(別要件、
// 半透明化の対象外)。外側のラッパーはpointer-events-noneにし、中央のカード自体にだけ
// pointer-events-autoを付ける: ホットスポットは会話オーバーレイと違いアクションシート表示中も
// DOMから消さない(返却フォーカス=returnFocusが同期的にhotspotDomId経由で探すため、
// マウントされたままにする必要がある。下記returnFocus関数のコメント参照)ため、
// 中央のカードの外側(=背景シーンの見えている部分)へのクリックを素通りさせないと、
// 全画面を覆う透明な層がホットスポットへのクリックを奪ってしまう。
// 「戻る」選択肢の必須化: データにnoop相当の選択肢(例「今は触らない」「何でもない」)が
// 無いアクションシートには、UI側で「閉じる（何もしない）」をactions配列の末尾に補う
// (hasNoopAction参照。既存の並び順は変えず、既にnoopがある場合は二重に足さない)。
// キーボード: 各選択肢はTab/Shift+Tabで移動しEnter/Spaceで実行でき(ネイティブbutton)、
// Escapeはグループ全体のkeydownで閉じる(closeActionSheet、下記参照。会話オーバーレイの
// onDismiss/onOutsideDismissと同じくEscapeは常に閉じる挙動に揃える)。
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
  Expression,
  HotspotAction,
  HotspotPosition,
  InvestigationPoint,
  Scenario,
  Scene,
  SceneHotspot,
} from '@/core/model'
import { BackgroundBox } from '@/ui/components/background-box'
import { CardDrawer } from '@/ui/components/card-drawer'
import { ConversationFrame, type ConversationSpeaker } from '@/ui/components/conversation-frame'
import { GameTimeBadge } from '@/ui/components/game-time-badge'
import { Button } from '@/ui/components/ui/button'
import {
  hasPortraitAsset,
  resolveBackgroundImageRect,
  resolveBackgroundSrc,
  resolveBoxOrientation,
  resolveHotspotBoxPosition,
} from '@/ui/lib/background-box'
import { EXPLORE_BACKGROUND_SRC } from '@/ui/lib/explore-background-assets'
import { useIsPortraitScreen } from '@/ui/lib/orientation'
import { cn } from '@/ui/lib/utils'

// 生成済み背景アセットのID→importの対応(EXPLORE_BACKGROUND_SRC)は
// src/ui/lib/explore-background-assets.ts に切り出した(#119/#124: resolve-screen.tsxも
// 「解決へ進む」を押した時点の探索シーンの背景をそのまま使うため、同じ対応表を参照する
// 必要があるため)。量産時の注意(#88)・縦の背景(-portrait)の追加方法も同ファイルのコメント参照。
const BACKGROUND_SRC = EXPLORE_BACKGROUND_SRC

// 縦長(9:16)の箱で縦の背景アセットが無いシーンにおける、箱の上部に重ねる固定要素(右上ボタン群
// 「ヒント確認」「調査ポイント一覧」・シーンタブ)の高さぶん、横画像とホットスポットの開始位置
// (top)を下げるオフセット(#124秘書レビュー2回目・2026-09-14「シーンタブ・右上ボタン群が背景の
// 絵とホットスポットを隠す」不具合の修正)。箱に対する相対値(0〜1)。
// シーンタブは`scenes.length > 1`のときだけ描画され(下記JSX参照)、縦長では右上ボタン群の
// 直下(top-16)へ2行目として並ぶ。行数ぶんの高さの目安(実機確認・撮影スクリプト
// tmp/shot.mjsの基準ビューポート幅390pxでの箱の高さ390×16/9≈693pxを基準に算出、
// resolveBoxOrientation/BackgroundBoxのコメント参照。固定pxの行に対し箱の実高さは画面幅で
// 変わるため厳密比例はしないが、既存のtop-16等と同じ近似で扱う):
// - ボタン群のみ(シーンタブ無し・シーンが1つのみのマップ): top-2(8px)+h-12(48px)+余白8px=64px
// - ボタン群+シーンタブ(2行、通常のマップ): シーンタブのtop-16(64px)+h-12(48px)+余白8px=120px
const PORTRAIT_CONTROLS_SINGLE_ROW_TOP_OFFSET = 64 / 693
const PORTRAIT_CONTROLS_TWO_ROW_TOP_OFFSET = 120 / 693

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

/** アクションシートがすでにnoop(「何もせず戻る」相当)を持つか(#52 追補・代表FB)。
 * 持たない場合、UI側で「閉じる（何もしない）」をシートの末尾に補う(下記JSX参照)。 */
function hasNoopAction(hotspot: SceneHotspot): boolean {
  return hotspot.actions.some((action) => action.kind === 'noop')
}

/** 調査3系統(investigation_point.category)から話者の既定を導出する(ログを見る→霧島／
 * 人に聞く・文献を引く→橘。DESIGN.md「探索シーン」節)。CVE等の技術文献はaction.speakerの
 * 明示で霧島に振れる(このデフォルトはaction.speaker未指定の場合のみ使われる)。 */
function defaultSpeakerForCategory(category: InvestigationPoint['category']): Character {
  return category === 'ログを見る' ? '霧島' : '橘'
}

/** 会話オーバーレイの1ターン分(#100/#102。多ターンのdialogue・NPC発話に対応するため、
 * 単発のline/speakerも含めすべてこの形へ正規化してから描画する)。 */
interface ConversationTurn {
  speaker: ConversationSpeaker
  line: string
  expression?: Expression
}

/**
 * collect action の台詞ターン列を解決する(#52 Phase4.7/T044、多ターン化は#100/#102)。
 * `dialogue`(多ターン・省略可)が明示されていればそれを使い(NPC行は`{npc: ...}`へ正規化する)、
 * 無ければ従来どおり`line`/`speaker`(単発・省略可)を使い、それも無ければ既定の導入文＋
 * カード本文(先頭カード)にフォールバックする(いずれも1ターンの配列にする)。
 * `dialogue`と`line`/`speaker`の併用は scenarioSchema の superRefine で拒否済みのため、
 * ここでは`dialogue`の有無だけで分岐すればよい(docs/scenario_schema.md §2.6)。
 * is_dummyでの選別は行わない(#62 吸収: 非ダミー優先で選ぶ経路自体を廃止したため)。
 */
function resolveCollectTurns(
  scenario: Scenario,
  hotspot: SceneHotspot,
  action: CollectAction,
): ConversationTurn[] {
  if (action.dialogue) {
    return action.dialogue.map((line) =>
      'npc' in line
        ? { speaker: { npc: line.npc }, line: line.line }
        : { speaker: line.character, line: line.line, expression: line.expression },
    )
  }

  const point = scenario.investigation_points.find((p) => p.id === action.investigation_point_id)
  const speaker = action.speaker ?? defaultSpeakerForCategory(point?.category ?? '人に聞く')
  if (action.line) return [{ speaker, line: action.line }]

  const firstCardBody = scenario.cards.find(
    (c) => c.investigation_point_id === action.investigation_point_id,
  )?.body
  const intro =
    hotspot.object_type === 'person'
      ? `${hotspot.label}に話を聞いた。`
      : `${hotspot.label}を調べた。`
  return [{ speaker, line: firstCardBody ? `${intro}${firstCardBody}` : intro }]
}

// danger の feedback は scenarios/*.yaml・テストフィクスチャのいずれも「橘「〜」」という
// 引用付きの形式で統一して書かれている(会話フレーム導入=#42より前からの記法)。会話オーバーレイの
// 名札に既に「橘」を表示するため、この形式に一致する場合だけ引用符を剥がして本文のみを話者の
// 台詞として使う(二重に名乗らせないため)。schema/YAMLの変更はしない防御的な後方互換パースで、
// 一致しない(将来 橘 以外が話す等の)feedbackはそのまま使う。danger は dialogue を持たないため
// 常に1ターン(docs/scenario_schema.md §2.5・§2.6、dangerHotspotActionSchema参照)。
const QUOTED_TACHIBANA_FEEDBACK = /^橘「(.+)」$/
function resolveDangerTurns(action: DangerAction): ConversationTurn[] {
  const match = QUOTED_TACHIBANA_FEEDBACK.exec(action.feedback)
  return [{ speaker: '橘', line: match ? match[1] : action.feedback }]
}

/** 会話オーバーレイに載せる内容(調査結果=collect、danger の教育的フィードバックの2種類、T047)。
 * 多ターン化(#100/#102)により単発のspeaker/lineではなくturns配列を持つ。現在のターン位置は
 * 呼び出し側(SceneExplorer)が別state(conversationTurnIndex)で持つ(advisor指摘:
 * turnIndexをこのオブジェクトに含めると、ターン送りのたびにconversation自体の参照が変わり
 * onConversationOpenChangeが不要に再発火するため)。 */
interface ConversationContent {
  kind: 'collect' | 'danger'
  hotspotLabel: string
  /** NPC発話ターンでトリガー元のホットスポットを□で強調するための位置(#100/#102、下記JSX参照)。
   * 0.8.0（#119/#120）: position が横・縦の組になったため、横・縦の組のまま保持し、描画時に
   * 箱の向き(boxOrientation)・縦の背景アセットの有無に応じて`resolveHotspotBoxPosition()`で
   * 箱基準の座標へ解決する(#124)。 */
  hotspotPosition: HotspotPosition
  turns: readonly ConversationTurn[]
}

export interface SceneExplorerProps {
  scenario: Scenario
  /** scenario.scenes(呼び出し側で存在確認済みの非空配列)。 */
  scenes: readonly Scene[]
  investigatedPointIds: readonly string[]
  /** 獲得済みカードid(右上の「ヒント確認」=CardDrawerに渡す、探索で得た手持ちカードの無料閲覧用。T048)。 */
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
  /**
   * 現在表示中のシーンidが変わるたびに通知する(#119/#124)。呼び出し側(explore-screen.tsx)は
   * これを使って: (1) 誘導会話(conversationSlot)を自前で描画する際に同じ背景の箱の向きを
   * 計算する、(2) 「解決へ進む」時点の背景をresolve-screen.tsxが引き継げるよう
   * `useGameStore`の`lastExploredSceneId`を更新する。onConversationOpenChangeと同じ
   * 「UI専用の配線・coreの状態には関与しない」パターン。
   */
  onActiveSceneChange?: (sceneId: string) => void
  /**
   * 「解決へ進む」ボタン(#124・代表決定2026-09-14「背景は画面いっぱいに表示」)。呼び出し側
   * (explore-screen.tsx)が`canProceed`の活性状態を持ったままボタン要素をそのまま渡す
   * (このコンポーネントはcanEnterResolutionの判定に関与しない)。
   *
   * 表示位置は探索状態/会話状態で切り替える(#124秘書レビュー2回目・2026-09-14「会話ウィンドウ
   * に重なる」不具合の修正): 探索状態(会話ウィンドウが無い間)は箱の**右下**に重ねる(旧実装と
   * 同じ位置)。会話状態(自身のconversation=collect/dangerの結果、誘導会話conversationSlotの
   * どちらも)は、箱の下部いっぱいに広がる会話ウィンドウと箱右下で重なってしまうため、右上の
   * 「ヒント確認」「調査ポイント一覧」ボタン群の列へ移す(isConversationActive、下記JSX参照)。
   * 第一案(会話状態は常に非表示)は、誘導会話の表示・非表示に関わらず`canProceed`成立中は
   * 常に活性のまま使える(PR#92追補・代表FB「誘導が導線を隠さない」)ことを要求する既存
   * テスト・挙動を壊すため撤回し、この「位置を移す」案に切り替えた(誘導会話には「わかった」
   * という別の解決への手段もあるため、自身の会話中に一時的に位置が変わること自体は誘導を
   * 妨げない)。
   */
  enterResolutionSlot?: ReactNode
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
  onActiveSceneChange,
  enterResolutionSlot,
}: SceneExplorerProps) {
  const tabsId = useId()
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id)
  const activeSceneIndex = Math.max(
    0,
    scenes.findIndex((s) => s.id === activeSceneId),
  )
  const activeScene = scenes[activeSceneIndex] ?? scenes[0]

  // 背景の箱の向き(#124・代表決定2026-09-14「縦長の画面は常に9:16」、DESIGN.md「探索シーン」節
  // 「背景の箱」): 画面の向き(screenIsPortrait)のみで決まる。縦の背景アセットの有無は箱の
  // 向きではなく、箱内の画像の描画矩形(resolveBackgroundImageRect)・ホットスポット座標
  // (resolveHotspotBoxPosition)に影響する。
  const screenIsPortrait = useIsPortraitScreen()
  const boxOrientation = resolveBoxOrientation(screenIsPortrait)
  const activeSceneHasPortraitAsset = hasPortraitAsset(activeScene.background, BACKGROUND_SRC)
  const backgroundSrc = resolveBackgroundSrc(activeScene.background, boxOrientation, BACKGROUND_SRC)
  // 箱の上部に重なる固定要素(右上ボタン群・シーンタブ)ぶんのオフセット(#124秘書レビュー2回目・
  // 上記PORTRAIT_CONTROLS_*_TOP_OFFSETのコメント参照)。横長の箱・縦の背景アセットがあるシーンは
  // resolveBackgroundImageRect/resolveHotspotBoxPosition側で無視されるため、常に渡してよい。
  const portraitControlsTopOffset =
    scenes.length > 1
      ? PORTRAIT_CONTROLS_TWO_ROW_TOP_OFFSET
      : PORTRAIT_CONTROLS_SINGLE_ROW_TOP_OFFSET
  const backgroundImageRect = resolveBackgroundImageRect(
    boxOrientation,
    activeSceneHasPortraitAsset,
    portraitControlsTopOffset,
  )

  // 現在のシーンidを呼び出し側へ通知する(#119/#124、上記SceneExplorerPropsのJSDoc参照)。
  // マウント時(初期シーン)・シーン切替のたびに発火すればよいため依存配列はactiveSceneIdのみ。
  useEffect(() => {
    onActiveSceneChange?.(activeSceneId)
  }, [activeSceneId, onActiveSceneChange])

  // 開いているアクションシート(複数actionを持つホットスポット用)。`${hotspotIndex}` で識別する
  // (シーン切替時にクリアするため、シーンIDを跨いだ一意化は不要)。
  const [openHotspotIndex, setOpenHotspotIndex] = useState<number | null>(null)
  // 会話オーバーレイの中身(調査結果=collect/danger、T047で統合。以前はcollectResult/
  // dangerFeedbackの2つのstateだったが、どちらも「会話状態」として排他的に1つしか
  // 表示されないため1つのstateにまとめた)。
  const [conversation, setConversation] = useState<ConversationContent | null>(null)
  // 現在表示中のターン位置(#100/#102の多ターン送り)。conversationとは別stateにする理由は
  // ConversationContentのJSDoc参照(ターン送りのたびにconversation自体の参照が変わらないように
  // するため)。conversationを開くたび(runAction)に0へ戻す。
  const [conversationTurnIndex, setConversationTurnIndex] = useState(0)
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

  // 呼び出し側の会話(conversationSlot、探索完了への誘導)が外側クリック/Escapeで閉じられ、
  // 自身のconversationも開いていない(=探索状態へ戻った)瞬間、フォーカスを迷子にしない
  // ため先頭ホットスポットへ戻す(PR#92追補・代表FB「閉じて再探索も可」)。「わかった」経由
  // (handleEnterResolution)の場合はexplore-screen.tsxが画面ごと差し替える(/resolveへ遷移)
  // ため、この効果が発火する前に本コンポーネント自体がアンマウントされ無害。
  // hadConversationSlotRefで「直前にconversationSlotがあったか」を覚えておき、
  // true→falseに変わった回だけ発火させる(#71・T045の他のuseEffectと同じ設計)。
  const hadConversationSlotRef = useRef(false)
  useEffect(() => {
    const hadConversationSlot = hadConversationSlotRef.current
    hadConversationSlotRef.current = Boolean(conversationSlot)
    if (hadConversationSlot && !conversationSlot && conversation === null) {
      document.getElementById(hotspotDomId(0))?.focus()
    }
    // hotspotDomIdはtabsId(useIdで安定)のみに依存する純粋な文字列組み立て関数のため、
    // 依存配列には含めない(他のuseEffectと同じ扱い)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationSlot, conversation])

  function closeOverlays() {
    setOpenHotspotIndex(null)
    // シーン切替(selectScene/gotoScene)で呼ばれるため、戻り先のホットスポットindexは
    // 別シーンのものとして意味を失う。先にnullへ落としておかないと、下のuseEffectが
    // 新しいシーンの同じindexのホットスポット(無関係な要素)へ誤ってフォーカスしてしまう
    // (advisor指摘)。
    returnFocusHotspotIndexRef.current = null
    setConversation(null)
    setConversationTurnIndex(0)
  }

  /** 自身の会話オーバーレイ(調査結果=collect/danger)を閉じる(最終ターンでのonDismiss/onEscape、
   * #100/#102)。closeOverlaysと違いreturnFocusHotspotIndexRefは維持する(下のuseEffectが
   * conversationのnull遷移を見てホットスポットへフォーカスを戻すため、ここで先にnullへ
   * 落としてはいけない=シーン切替専用のcloseOverlaysとの違い)。 */
  function closeConversation() {
    setConversation(null)
    setConversationTurnIndex(0)
  }

  /** アクションシートのX閉じる・noop選択時の、ホットスポットへのフォーカス復帰(同期)。
   * この経路ではホットスポットは会話オーバーレイと違って常に描画されたままのため、
   * 上のuseEffectを介さずその場でfocusしてよい。 */
  function returnFocus() {
    const index = returnFocusHotspotIndexRef.current
    if (index === null) return
    document.getElementById(hotspotDomId(index))?.focus()
  }

  /** アクションシートを何もせず閉じる(X・Escape・補完した「閉じる（何もしない）」で共通、
   * #52 追補・代表FB)。noopアクション実行時と同じ、ホットスポットへの同期フォーカス復帰を伴う。 */
  function closeActionSheet() {
    setOpenHotspotIndex(null)
    returnFocus()
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
      // 多ターン化(#100/#102): dialogueがあれば複数ターン、無ければ従来どおり1ターンになる。
      const turns = resolveCollectTurns(scenario, hotspot, action)
      setOpenHotspotIndex(null)
      setConversationTurnIndex(0)
      setConversation({
        kind: 'collect',
        hotspotLabel: hotspot.label,
        hotspotPosition: hotspot.position,
        turns,
      })
      return
    }
    if (action.kind === 'danger') {
      // 教育的フィードバックを会話オーバーレイで提示する(T047。dispatchしない=ペナルティ無し・
      // 操作継続可。詰み防止=閉じて同じホットスポットを再度開けば他のactionを選べる)。
      // dangerは常に1ターン(dialogueを持たない、resolveDangerTurns参照)。
      const turns = resolveDangerTurns(action)
      setOpenHotspotIndex(null)
      setConversationTurnIndex(0)
      setConversation({
        kind: 'danger',
        hotspotLabel: hotspot.label,
        hotspotPosition: hotspot.position,
        turns,
      })
      return
    }
    if (action.kind === 'goto') {
      // ドアでのシーン移動(#78・T046-ui-data)。investigation_pointを参照しないため
      // onCollectは呼ばない。移動先のシーンタブへフォーカスを移す(gotoScene参照)。
      gotoScene(action.scene_id)
      return
    }
    // noop: 何もせず閉じる。
    closeActionSheet()
  }

  function handleHotspotActivate(hotspot: SceneHotspot, hotspotIndex: number) {
    returnFocusHotspotIndexRef.current = hotspotIndex
    setConversation(null)
    setConversationTurnIndex(0)
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
  // 右上の「ヒント確認」(CardDrawer)へ渡す、探索で得た手持ちカード(#66、右上移設はT048)。
  const ownedCards = scenario.cards.filter((card) => ownedCardIds.includes(card.id))
  // 会話状態かどうか(DESIGN.md「探索シーン」節「2つの状態」)。自身のconversation(collect/danger)
  // に加え、呼び出し側から渡されたconversationSlot(探索完了→解決への誘導)も会話状態に含める。
  const isConversationActive = conversation !== null || Boolean(conversationSlot)

  // 多ターン送り(#100/#102): 現在のターン・最終ターンか・NPC発話ターンか。
  const currentTurn = conversation?.turns[conversationTurnIndex]
  const isLastTurn = conversation ? conversationTurnIndex >= conversation.turns.length - 1 : true
  const isNpcTurn = currentTurn ? typeof currentTurn.speaker !== 'string' : false

  /** 次の会話ターンへ進める(最終ターンでない間、onDismissから呼ぶ)。 */
  function advanceConversationTurn() {
    setConversationTurnIndex((index) => index + 1)
  }

  return (
    <div
      id={scenes.length > 1 ? `${tabsId}-panel-${activeScene.id}` : undefined}
      role={scenes.length > 1 ? 'tabpanel' : undefined}
      aria-labelledby={scenes.length > 1 ? `${tabsId}-tab-${activeScene.id}` : undefined}
    >
      {/* 背景の箱(#124・代表決定2026-09-14「背景は画面いっぱいに表示」、DESIGN.md「探索
          シーン」節「背景の箱」): 画面いっぱいに収まる最大の16:9(横長の画面)/9:16(縦長の画面)
          の矩形。判定は画面幅ではなく画面の向き(boxOrientation=useIsPortraitScreen)。縦の
          背景アセットが無いシーンは、箱の上部に横画像を表示する(imageRect、
          resolveBackgroundImageRect)。シーンタブ・ホットスポット・立ち絵・会話ウィンドウ・
          右上のボタン群・「解決へ進む」は、すべてこの箱に対する相対位置(子要素)で重ねる。 */}
      <BackgroundBox
        orientation={boxOrientation}
        src={backgroundSrc}
        alt={`${activeScene.title}の背景`}
        placeholderLabel={`${activeScene.title}（背景 準備中）`}
        imageRect={backgroundImageRect}
      >
        {/* シーンタブ(#124): 箱の左上に重ねる。旧・箱の外(上のページ余白)から移設。
            縦長の箱(9:16、#124「縦長の画面は常に9:16」)では箱の横幅が狭く、右上のボタン群
            (ヒント確認・調査ポイント一覧)と同じ行に収まらず重なってしまうため、縦長のときは
            右上ボタン群の直下(top-16)へ落とす(2026-09-14実機確認)。横長は従来どおり
            右上ボタン群と同じ行の左側に置く(十分な幅があるため重ならない)。 */}
        {scenes.length > 1 && (
          <div
            role="tablist"
            aria-label="探索シーンの切替"
            className={cn(
              'absolute z-30 flex flex-wrap gap-2',
              boxOrientation === 'portrait' ? 'top-16 left-2' : 'top-2 left-2',
            )}
          >
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
                    'h-12 min-w-12 rounded-lg border px-4 text-sm font-medium shadow-sm focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-card hover:bg-muted dark:bg-card dark:hover:bg-muted',
                  )}
                >
                  {scene.title}
                </button>
              )
            })}
          </div>
        )}

        {/* 右上のボタン群(#52 Phase4.7 追補・T048): 「ヒント確認」(左・手持ちカード閲覧=
            card-drawer)＋「調査ポイント一覧」(右・トグル)。探索状態・会話状態のどちらでも
            常時表示する(発見性の担保、DESIGN.md「探索シーン」節「一覧フォールバック」
            「右上のボタン群」)。キーボード到達順を「ヒント確認→調査ポイント一覧→
            ホットスポット→(会話状態では会話ウィンドウ)」にするため、ホットスポット・
            会話オーバーレイより先にDOM上へ置く。背景画像の上に常時視認できる必要があるため、
            ホットスポットとは逆に不透明の背景(bg-card+border)で常時可視にする。
            旧bg-card/95(95%不透明)だけでなく、探索画面はDarkLayoutで常時`.dark`文脈になる
            ため、Buttonのoutline variant既定の`dark:bg-input/30`(--inputは元から15%alpha
            なので実質4.5%alpha=ほぼ透明)がtailwind-mergeでは`bg-card`と衝突と見なされず
            (variant違い)残ってしまい、それが背景に溶ける主因だった。`dark:bg-card`
            `dark:hover:bg-muted`を明示して打ち消し、確実に不透明にする(T048)。
            z-50はConversationFrame overlay(自身のconversation・z-10)だけでなく誘導会話
            (conversationSlot・z-40)よりも確実に手前に出すため(#124秘書レビュー2回目・
            2026-09-14: conversationSlotの`absolute inset-0`修正=下記conversationSlotIdの
            divのコメント参照=で誘導会話が箱いっぱいの透明なクリック捕捉層として正しく
            機能するようになった結果、旧z-30のままだと誘導会話の下に隠れてこの列のボタンが
            一切クリックできなくなることが発覚したため、z-40を上回るz-50へ引き上げた。
            「調査ポイント一覧」パネル自体(listPanelId、z-30のまま)は本来どおり誘導会話の
            下に隠れる=変更していない)。旧: 会話ウィンドウ内の?カードボタンはここへ統合し
            廃止した(下記conversation内のコメント参照)。
            会話状態では「解決へ進む」もこの列の末尾に加える(#124秘書レビュー2回目・
            2026-09-14。下記enterResolutionSlotのJSXコメント参照。第一案=常に非表示は
            誘導会話(conversationSlot)表示中に「解決へ進む」が常時活性のまま使えることを
            要求する既存テスト・PR#92追補FB「誘導が導線を隠さない」を壊すため撤回し、
            この案(会話状態の間だけ右上へ移す)に切り替えた)。`flex-wrap`は3ボタン目が
            増えても縦長の狭い画面ではみ出さず折り返すため(2ボタンのみの場合は従来どおり
            1行に収まる)。 */}
        <div
          data-testid="top-controls-row"
          className="absolute top-2 right-2 z-50 flex flex-wrap items-center justify-end gap-2"
        >
          {/* ゲーム内時刻(#136/#137、DESIGN.md「ゲーム内時刻」節・#149秘書レビュー2回目・
              代表決定2026-09-15「画面右上、ボタン群と同じ行でボタンの左隣。入らなければ
              ボタン群のすぐ下に右寄せ」): 右上ボタン群の列の先頭に置くことで、1行に収まる間は
              ボタン群の左隣になり、収まらない場合はflex-wrapでボタン群の下(右寄せ)へ折り返す。
              探索状態・会話状態のどちらでも常時表示する(旧「探索状態のみシーンタブの下」は
              撤回)。時刻は現在アクティブなシーン(activeScene)のgame_timeを使う(探索中は
              シーンを行き来できるが、各シーンの時刻を固定表示する。代表承認2026-09-15)。 */}
          <GameTimeBadge gameTime={activeScene.game_time} compact={boxOrientation === 'portrait'} />
          <CardDrawer cards={ownedCards} triggerVariant="label" />
          <Button
            type="button"
            variant="outline"
            aria-expanded={isListOpen}
            aria-controls={listPanelId}
            onClick={() => setIsListOpen((v) => !v)}
            className="bg-card hover:bg-muted dark:bg-card dark:hover:bg-muted h-12 min-w-12 px-3 text-sm font-medium shadow-sm"
          >
            調査ポイント一覧
          </Button>
          {isConversationActive && enterResolutionSlot}
        </div>

        {/* 「調査ポイント一覧」トグルパネル(#66→T047でトグル化、#124で箱の中の絶対配置
            オーバーレイへ移設=ページの縦スクロールを出さないため)。中身は呼び出し側
            (explore-screen.tsx)が組み立てたものをそのまま表示する。開いた瞬間にパネル自体へ
            フォーカスを移し(tabIndex=-1)、ホットスポットを何度もTabで飛ばさずに一覧の
            最初の操作へ到達できるようにする(WCAG、DESIGN.md「一覧フォールバック」節)。
            右上ボタン群の直下(top-16)に置き、箱からはみ出す分は内部スクロール(overflow-y-auto)
            で吸収する(ページ自体はスクロールしない)。縦長の箱ではシーンタブも右上ボタン群の
            直下(top-16)へ落ちる(上記シーンタブのコメント参照)ため、一覧パネルはさらにその
            下(top-28)へ置いて重なりを避ける。
            z-index(#124実機確認): DESIGN.md「探索シーン」節が「右上のボタン群(ヒント確認・
            調査ポイント一覧)は探索状態・会話状態のどちらでも常時表示する」と定めるとおり、
            自身のconversation(collect/danger)が開いていても一覧は操作できる必要があるため
            z-30(右上ボタン群と同じ最前面)のまま維持する。一方、誘導会話(conversationSlot、
            「わかった」)だけは一覧より**さらに上**(z-40)にする必要がある: 一覧を開いたまま
            一覧内から最後の1件を調べ終えると、誘導会話が同じ箱の中で入れ替わりで重なるが、
            一覧をここでz-30より下げると今度は自身のconversationが開いている間に一覧の
            「調査する」ボタンがクリックできなくなってしまう(2026-09-14実機確認)。両立させる
            ため、conversationSlot側だけを個別に持ち上げる(下記conversationSlotIdのdiv参照)。 */}
        {isListOpen && (
          <div
            id={listPanelId}
            tabIndex={-1}
            className={cn(
              'border-border bg-card absolute right-2 z-30 flex w-[min(90%,24rem)] flex-col gap-3 overflow-y-auto rounded-lg border p-4 shadow-lg outline-none',
              boxOrientation === 'portrait'
                ? 'top-28 max-h-[calc(100%-8rem)]'
                : 'top-16 max-h-[calc(100%-5rem)]',
            )}
          >
            {investigationList}
          </div>
        )}

        {/* 探索状態でのみホットスポットを描画する(会話状態では背景の下に隠さず、そもそも
            DOMに置かない=誤操作防止・キーボード到達順の単純化、DESIGN.md「探索シーン」節)。 */}
        {!isConversationActive &&
          activeScene.hotspots.map((hotspot, hotspotIndex) => {
            // 0.8.0（#119/#120）: position が横・縦の組になったため、箱の向き(boxOrientation)
            // と縦の背景アセットの有無から箱基準の座標へ変換する(#124、
            // resolveHotspotBoxPosition。縦の背景が無ければ横画像の描画矩形基準)。
            const [x, y] = resolveHotspotBoxPosition(
              hotspot.position,
              boxOrientation,
              activeSceneHasPortraitAsset,
              portraitControlsTopOffset,
            )
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

        {/* NPC直接発話(collect.dialogue限定・#100/#102)のターンでは、トリガー元の
              ホットスポットを□で強調する(DESIGN.md「探索シーン」節「NPC直接発話の描画」)。
              会話状態ではホットスポット自体(実<button>)をDOMに置かない方針(#52 Phase4.7・
              T047)を維持したまま、位置だけ再現した装飾用の□マーカーを重ねる(非対話・
              aria-hidden・pointer-events-none。実ホットスポットの□マーカーと同じ見た目に
              するため同じクラスを使う)。マーカーの位置は背景の箱の座標系(%指定)に依存するため
              箱の中に残す(会話フレーム自体は#108/#110で箱の外=下記へ移動した)。 */}
        {conversation &&
          currentTurn &&
          isNpcTurn &&
          (() => {
            const [npcX, npcY] = resolveHotspotBoxPosition(
              conversation.hotspotPosition,
              boxOrientation,
              activeSceneHasPortraitAsset,
              portraitControlsTopOffset,
            )
            return (
              <div
                aria-hidden="true"
                data-testid="npc-hotspot-marker"
                style={{ left: `${npcX * 100}%`, top: `${npcY * 100}%` }}
                className="border-hotspot-highlight ring-hotspot-highlight/50 pointer-events-none absolute z-10 min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 ring-3"
              />
            )
          })()}

        {/* アクションシート: 複数actionを持つホットスポット用(固定順・並べ替えない)。中央への
              オーバーレイ化・選択肢ボタン半透明80%・「戻る」選択肢の必須化は#52 追補・代表FB
              (ファイル冒頭コメント参照)。探索状態でのみ開き得る(danger/collectを選ぶと会話
              オーバーレイに切り替わってこのシートは閉じるため、会話状態と同時に表示されることは
              ない)。外側のラッパーはpointer-events-noneにし、中央のカードにだけpointer-events-autoを
              付ける: ホットスポット自体は会話オーバーレイと違って表示中も非表示にしない
              (returnFocus/closeActionSheetが同期的にDOM要素を探すため常にマウントされたままに
              する必要がある)ため、中央のカードの外側(=背景シーンの見えている部分)へのクリックが
              ホットスポットへ素通りするようにする。 */}
        {openHotspot && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
            <div
              role="group"
              aria-label={`${openHotspot.label}の操作`}
              className="pointer-events-auto flex w-full max-w-sm flex-col gap-2"
              onKeyDown={(event) => {
                // Escapeは常に閉じる(会話オーバーレイのonDismiss/onOutsideDismissと同じ挙動に
                // 揃える、#52 追補・代表FB「戻る手段を必ず用意」)。
                if (event.key !== 'Escape') return
                event.preventDefault()
                closeActionSheet()
              }}
            >
              <div className="glass-panel flex items-center justify-between gap-2 rounded-lg px-4 py-2 shadow-lg">
                {/* 見出し=挨拶台詞(prompt、#78・T046-ui-data)。省略時はラベルのみ(現行どおり)。
                      系統をまたぐ統合ホットスポット(人＋機器を1つに束ねる)で、何用の操作かを
                      挨拶台詞で示す(DESIGN.md「探索シーン」節)。 */}
                <h2 className="font-heading text-base">
                  {openHotspot.prompt ?? openHotspot.label}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="操作メニューを閉じる"
                  onClick={closeActionSheet}
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
                        className="glass-panel hover:brightness-125 h-12 min-w-12 w-full justify-start px-4 text-left shadow-lg"
                        onClick={() => runAction(openHotspot, action)}
                      >
                        {action.label}
                        {done && <span className="text-muted-foreground ml-auto text-xs">済</span>}
                      </Button>
                    </li>
                  )
                })}
                {/* データにnoop相当(「今は触らない」「何でもない」等)が無いアクションシートには、
                      UI側で「閉じる（何もしない）」を末尾に補う(#52 追補・代表FB。既存の並び順は
                      変えず後ろに追加し、既にnoopがある場合は二重に足さない。hasNoopAction参照)。 */}
                {!hasNoopAction(openHotspot) && (
                  <li>
                    <Button
                      type="button"
                      variant="outline"
                      className="glass-panel hover:brightness-125 h-12 min-w-12 w-full justify-start px-4 text-left shadow-lg"
                      onClick={closeActionSheet}
                    >
                      閉じる（何もしない）
                    </Button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* 会話状態(T047): 調査結果/dangerの教育的フィードバック(自身のconversation)、
              または呼び出し側の会話(conversationSlot、探索完了→解決への誘導)を排他的に
              表示する。背景シーンは暗転させずそのまま保持する(DESIGN.md「探索シーン」節)。
              #119/#124: 立ち絵の拡大を箱の高さに対する比率に改めたことに伴い、箱に対して
              `absolute inset-0`で重畳する形へ戻した(縦スクロールを出さないため、#108/#110の
              「箱の直後の兄弟要素」案は撤回。conversation-frame.tsxのlayout="overlay"
              コメント参照)。箱の中の右上ボタン群・ホットスポットとは重ならない(z-index・
              立ち絵/ウィンドウのサイズ上限で担保)。
              多ターン化(#100/#102): conversation.turns[conversationTurnIndex]が現在のターン。
              最終ターンでない間はonDismiss/onEscapeで「次の行へ」進め(advanceConversationTurn)、
              最終ターンでのみ会話を閉じる(closeConversation)。onEscapeは常にcloseConversationに
              固定する(onDismissを「次の行へ」に流用してもEscapeだけは常に閉じられるように、
              conversation-frame.tsxのonEscape JSDoc参照)。 */}
        {conversation && currentTurn ? (
          // 「閉じる」ボタンは置かず、会話ウィンドウ全体をクリック/タップで閉じる(または
          // 次の行へ進める)(#52 Phase4.7 追補・T048、DESIGN.md「探索シーン」節
          // 「会話ウィンドウ」)。onDismissを指定すると、タイプライターの全文表示前の
          // クリック/タップ/Enter/Spaceはスキップ、全文表示後の同操作でonDismissを呼ぶ
          // (2段階、ConversationFrame側の実装参照)。カード閲覧(旧・会話ウィンドウ内の
          // ?ボタン)は右上の「ヒント確認」に統合したため、children はもう調査結果の
          // 文脈行のみで、操作要素を持たない(閉じる操作とホットスポット操作が競合しないよう、
          // 会話状態ではホットスポット自体をそもそもDOMに置かない=上記の分岐と併せて安全)。
          <ConversationFrame
            layout="overlay"
            boxOrientation={boxOrientation}
            speaker={currentTurn.speaker}
            // 左右2枠の並び(#108/#110): 会話1つ(=このconversationオブジェクト)ぶんの
            // 発話者履歴。conversationは呼び出し側(runAction)が新しい調査結果/danger
            // ごとに新規生成するため、ここで並びのリセット(「探索の会話1つの開始」)が
            // 自然に表現される(src/ui/lib/two-slot-frame.ts参照)。
            speakerHistory={conversation.turns
              .slice(0, conversationTurnIndex + 1)
              .map((t) => t.speaker)}
            line={currentTurn.line}
            expression={currentTurn.expression}
            onDismiss={isLastTurn ? closeConversation : advanceConversationTurn}
            onEscape={closeConversation}
          >
            <p className="text-muted-foreground text-xs">
              {conversation.kind === 'collect'
                ? `${conversation.hotspotLabel}を調べた結果`
                : `${conversation.hotspotLabel}を操作した結果`}
            </p>
          </ConversationFrame>
        ) : conversationSlot ? (
          // idはisWrapUpVisibleのuseEffectが最初の操作可能要素を探すためのフック
          // (上記コメント参照)。z-40: 「調査ポイント一覧」を開いたまま一覧内から
          // 最後の1件を調べ終えると、この誘導会話(わかった)が一覧(z-30)と同じ箱の中で
          // 入れ替わりで重なる。一覧より上に出す必要があるため、自身のconversation
          // (collect/danger、z-30の一覧より下のまま=一覧を常時操作可能にする設計を維持)とは
          // 個別にconversationSlotだけをさらに持ち上げる(上記一覧パネルのz-indexコメント参照)。
          // `absolute inset-0`(#124秘書レビュー2回目・2026-09-14で発見・修正): 旧`relative`
          // だけだとこのdivがBackgroundBox内で唯一の通常フロー要素になり、中身(conversationSlot=
          // `layout="overlay"`のConversationFrame、自身が`absolute inset-0`)が幅は箱いっぱい・
          // 高さ0で計算されてしまい、この0高さのdivがConversationFrameの`absolute inset-0`の
          // 基準(containing block)になって誘導会話全体が画面上端付近に極小サイズで潰れて
          // 実質不可視になっていた(E2Eで会話ウィンドウの矩形を検証して発覚。自身の会話
          // (collect/danger)はBackgroundBoxへ直接`absolute inset-0`で重畳するため元々この問題は
          // 無かった)。`absolute inset-0`で箱いっぱいに確定させることで解消する。 */}
          <div id={conversationSlotId} className="absolute inset-0 z-40">
            {conversationSlot}
          </div>
        ) : null}

        {/* 「解決へ進む」(#124・代表決定2026-09-14): 探索状態(会話ウィンドウが無い間)は箱の
              右下に重ねる。呼び出し側(explore-screen.tsx)がcanProceedの活性状態を持ったまま
              ボタン要素を渡す。会話状態(自身のconversation・誘導会話conversationSlotの
              どちらも)は、箱の下部いっぱいに広がる会話ウィンドウと箱右下で重なるため
              (#124秘書レビュー2回目・2026-09-14)、ここでは描画せず上記の右上ボタン群の列へ
              移す(isConversationActive、上記コメント参照)。「誘導会話の表示・非表示に
              関わらずcanProceed成立中は常に活性のまま使える」(PR#92追補・代表FB「誘導が
              導線を隠さない」、DESIGN.md「探索完了→解決への誘導」節)自体は維持したまま、
              表示位置だけを会話状態の間切り替える。 */}
        {enterResolutionSlot && !isConversationActive && (
          <div
            data-testid="enter-resolution-bottom-slot"
            className="absolute right-2 bottom-2 z-30"
          >
            {enterResolutionSlot}
          </div>
        )}
      </BackgroundBox>
    </div>
  )
}
