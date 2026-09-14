// src/ui/components/conversation-frame.tsx — 会話フレーム共通コンポーネント(#42/T033、
// タイプライター表示は#52 Phase4.7/#64/T042、探索の会話オーバーレイ化は#52 Phase4.7 追補/
// T047・`layout` prop、会話ウィンドウのクリック/タップ閉じ化は#52 Phase4.7 追補/T048・
// `onDismiss` prop、探索完了への誘導を「閉じて再探索も可・ロックしない」形にした
// #92追補・代表FBで`onOutsideDismiss` prop を追加、表情フォールバック(`expression` prop)・
// `onEscape` prop は #100/#102 で追加)。
//
// 2026-09-13(S1実装台本レビュー第1回・代表FB・#108/#110): 左右2枠の入れ替わり方式へ刷新した。
// 旧「導入のみ3枠(対策室レイアウト、layout="intro")・探索④/解決⑤は霧島=左・橘=右で固定2枠」
// (#100/#102)は撤回し、導入・探索・解決のすべてで「左右2枠の入れ替わり方式」に統一した。
// `layout="intro"`・固定`PORTRAIT_ORDER`・`compact` propは削除済み(このコメントでは以後
// 言及しない。旧実装の経緯を知りたい場合はgit historyを参照)。
//
// DESIGN.md「会話フレーム(共通コンポーネント・#42で導入)」節が正本:
// - レイアウト: 画面下部に会話ウィンドウ、その上に左右2枠の立ち絵。導入③・探索④・解決⑤の
//   すべてで共通(#108)。
// - 左右2枠の入れ替わり方式(#108): 話者が誰であっても画面には常に左右2枠しか使わない。
//   枠の位置そのものは動かさず、色(カラー/グレー)と中身の入れ替えで「直前に話した人」
//   「いま話している人」を示す。並びを決めるロジックは`src/ui/lib/two-slot-frame.ts`の
//   純粋関数(`layoutTwoSlotFrame`)に切り出してある(単体テストは two-slot-frame.test.ts)。
//   本コンポーネントは`speakerHistory`(今の会話1つぶんの発話者履歴、古い→新しい順)を
//   その関数に渡して現在の2枠表示を得るだけで、React state によるリセット処理は持たない
//   (並びのリセット=導入の開始・探索の会話1つの開始・解決の開始は、呼び出し側が履歴配列を
//   新しく空から渡し始めることで自然に表現される。intro-screen.tsx/scene-explorer.tsx/
//   resolve-screen.tsx参照)。`speakerHistory`省略時は`[speaker]`(履歴なし=単発の会話、
//   探索完了への誘導など1ターンしか出さない呼び出し側向け)にフォールバックする。
// - 立ち絵の拡大(#108): 会話ウィンドウの上に大きく乗る大きさまで拡大する(デスクトップ
//   240×320px・モバイル120×160px、DESIGN.md「立ち絵の拡大」節)。立ち絵は会話ウィンドウの
//   上端から上へ「はみ出す」位置に置き、ウィンドウ内側の操作領域(children)には重ねない。
//   空いている枠(まだ誰も入っていない)は、枠の位置がずれないよう同じ寸法の不可視プレース
//   ホルダーで埋める(aria-hidden、下記EmptyPortraitSlot参照)。
// - 発話者の強調: いま話している人の枠はフルカラー、もう一方(直前に話した人)はグレーアウト。
//   NPCが話すときは両方の枠をグレーアウトし、名札にNPC名を出す(枠自体は動かさない)。
//   色だけに頼らず、名札テキストでも発話者を示す(WCAG 1.4.1)。
// - NPC発話(#100/#102、#108でも継続): `speaker`に`{ npc: '名前' }`を渡すと、現在枠にいる
//   立ち絵は全員グレーアウトし、名札にはnpcの値をそのまま表示する(探索の`collect.dialogue[]`
//   限定、docs/scenario_schema.md §2.6)。
// - 表情フォールバック(#100/#102): `expression` propで発話者の立ち絵の表情差分を指定できる。
//   該当PNGが無ければneutralにフォールバックする(resolvePortraitSrc参照)。待機中の立ち絵は
//   常にneutralを使う。
// - 名札: 会話ウィンドウ左上に primary背景+ダーク文字のピル。
// - 会話文は明朝(font-heading)、名札・操作UIはゴシック(既定のsans)。
// - 主人公の立ち絵は出さない(docs/characters.md §3)。
// - タイプライター表示(#52 Phase4.7/#64/T042): 会話文は1文字ずつ時間差で表示する。
//   タップ/Enterで即全文(スキップ)、prefers-reduced-motionでは即全文(アニメなし)。
//   支援技術には全文を一度に渡す(演出中テキストはaria-hidden、全文はvisually-hiddenで提供)。
//   選択肢・相談・カード閲覧等の操作要素(children)は全文表示(またはスキップ)後にのみ出す
//   (送り途中の誤タップ防止)。詳細は下記の各関数コメントを参照。
// - 探索の会話オーバーレイ・導入(#52・T047、#108で導入にも`layout="overlay"`を適用):
//   `layout="overlay"`を指定すると、従来の「縦に積む」表示(`layout="stacked"`、既定・
//   resolve-screen.tsx で使用)ではなく、絶対配置で呼び出し側のコンテナ(`position: relative`
//   を持つ背景の箱)に重ねる表示になる。タイプライター・フォーカス管理・childrenの表示タイミング
//   等のロジックはstackedと完全に共有し、JSXの外枠(絶対配置かどうか)だけを分岐する。
// - 会話ウィンドウのクリック/タップ閉じ(#52 Phase4.7 追補・T048): `onDismiss` を指定すると、
//   専用の「閉じる」ボタンを置かず、会話ウィンドウ全体を1つの操作領域にする。全文表示前の
//   クリック/タップ/Enter/Spaceはスキップ(全文表示)、全文表示後の同操作は`onDismiss`を呼ぶ
//   (Escapeは`onEscape`があればそちら、無ければ`onDismiss`)。
// - 画面全体クリックでの進行(#108/#110・導入専用): `dismissAnywhere`を`true`にすると、
//   `onDismiss`の2段階(スキップ→次へ)を会話ウィンドウ**だけでなく背景を含む外枠全体**で
//   受け付ける。ウィンドウ自体は従来どおり`role="button"`でキーボード操作(Tab到達・Enter/
//   Space)を担い、外枠側はポインタ操作(onClickのみ、role・tabIndexは付けない)を追加するだけ
//   にすることで、role="button"の入れ子(ネストした対話的ロール)を避ける(scene-explorer.tsx
//   の`onOutsideDismiss`と同じ考え方。ただしonOutsideDismissは「外側だけ」閉じる操作領域に
//   するのに対し、dismissAnywiereは「ウィンドウも含む全体」が進行操作領域になる点が異なる)。
//   ウィンドウ自身のクリックは`event.stopPropagation()`で外枠への二重発火を防ぐ。外枠クリックの
//   後はキーボード操作(Enter/Space)を引き続き使えるようウィンドウへフォーカスを戻す。
//   探索(scene-explorer.tsx)の調査結果/danger会話オーバーレイは、閉じる操作領域を会話
//   ウィンドウ自体に限定する従来どおりの仕様のため`dismissAnywhere`は指定しない
//   (DESIGN.md「探索シーン」節「会話ウィンドウ」)。
//
// 導入(③)・探索の会話(④)・解決の会話モード(⑤)で共通して使う(DESIGN.md)。
//
// 立ち絵アセットは repo ルートの assets/(src/ 外)に置かれているため `@/*` エイリアスは使えず、
// 相対パスで import する。vite/client.d.ts の `declare module '*.png'` により型定義は問題なく、
// Vite・Vitest どちらの変換パイプラインでも文字列(URL)として解決される。
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { Character, Expression } from '@/core/model'
import type { BoxOrientation } from '@/ui/lib/background-box'
import {
  layoutTwoSlotFrame,
  type TwoSlotDisplay,
  type TwoSlotSpeaker,
} from '@/ui/lib/two-slot-frame'
import { cn } from '@/ui/lib/utils'

import kirishimaPortrait from '../../../assets/characters/kirishima-neutral.png'
import tachibanaPortrait from '../../../assets/characters/tachibana-neutral.png'
import takanashiPortrait from '../../../assets/characters/takanashi-neutral.png'

// タイプライター1文字あたりの表示間隔(ms)。DESIGN.md「会話フレーム」節はタイプライターの表示を
// 要求するのみで速度の値までは規定していないため、妥当な値を暫定で選定した(#64/T042)。
// 代表確認の上で調整可能なよう定数として分離してある(PR本文に選定値を明記)。
// unit test(conversation-frame.test.tsx)からfake timersで正確に進行を検証できるようexportする。
export const TYPEWRITER_CHAR_INTERVAL_MS = 32

// スキップ操作でchildrenへフォーカスを移す際に探す、素朴なフォーカス可能要素セレクタ。
// scene-explorer.tsx の sheetFirstActionId 等と同様、無効化された要素は除外する。
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** `prefers-reduced-motion: reduce` の現在値。jsdom等 matchMedia 未実装の環境では常に false。 */
function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * `prefers-reduced-motion: reduce` を購読するフック。OS設定の変更にも追従する。
 * matchMedia未実装環境(jsdom等)では常に false を返す(=アニメーションする側の既定動作)。
 */
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setPrefersReducedMotion(mediaQueryList.matches)
    handleChange()
    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// 表情差分(schema_version 0.7.0・#100/#101・DESIGN.md「表情差分の定義表」)。現在生成済みは
// 3名とも neutral のみ(#102)。neutral 以外の PNG が無くても表示が壊れないよう、
// resolvePortraitSrc() で該当表情が無ければ neutral にフォールバックする。
const PORTRAIT_SRC: Record<Character, { neutral: string } & Partial<Record<Expression, string>>> = {
  霧島: { neutral: kirishimaPortrait },
  橘: { neutral: tachibanaPortrait },
  小鳥遊: { neutral: takanashiPortrait },
}

/**
 * 立ち絵アセットを解決する(#102・DESIGN.md「導入③の背景・表情フォールバック」節)。
 * `PORTRAIT_SRC[character][expression]` が無ければ `neutral` にフォールバックする。
 * expression省略時(既存データ・待機中の立ち絵)は neutral を使う。
 */
export function resolvePortraitSrc(
  character: Character,
  expression: Expression = 'neutral',
): string {
  const set = PORTRAIT_SRC[character]
  return (expression === 'neutral' ? set.neutral : set[expression]) ?? set.neutral
}

/**
 * 会話フレームの発話者。通常はサポート役キャラ(Character)だが、探索の`collect.dialogue[]`限定で
 * NPC(自由記述の名前・立ち絵を持たない)が話す場合がある(#100/#101, docs/scenario_schema.md §2.6)。
 * `src/ui/lib/two-slot-frame.ts`の`TwoSlotSpeaker`と同じ形(このファイルからも再exportする)。
 */
export type ConversationSpeaker = TwoSlotSpeaker

function speakerLabel(speaker: ConversationSpeaker): string {
  return typeof speaker === 'string' ? speaker : speaker.npc
}

// 立ち絵の寸法:
// - stacked(背景の箱を持たない画面、resolve-screen.tsx等)は#108で定めた固定pxのまま
//   (DESIGN.md「立ち絵の拡大」節: デスクトップ240×320px・モバイル120×160px、3:4)。
//   8ptグリッド上のTailwindスペーシング単位(1=4px)で表現する。
// - overlay(#119/#124): 固定pxは撤回し、背景の箱の高さに対する比率で決める。BackgroundBox
//   (`[container-type:size]`)を基準としたコンテナクエリ単位(cqh)で指定し、箱の実際の
//   レンダリング高さに追従させる(DESIGN.md「会話フレーム」節「立ち絵の拡大」の目安:
//   横長の箱=箱の高さの45〜50%程度、縦長の箱=30〜35%程度。3:4比率から幅は自動算出)。
const PORTRAIT_SIZE_CLASS = 'h-40 w-30 sm:h-80 sm:w-60'
// overlay限定(#119/#124、2026-09-14改訂): 固定cqh高さではなく「箱の高さに対する上限
// (max-h、目安値はDESIGN.md「立ち絵の拡大」節の横長45〜50%/縦長30〜35%)」まで、実際に
// 使える縦方向の空き(=立ち絵の行=h-full、下記renderPortraitRow呼び出し側のflex-1/min-h-0)
// に収まるだけ自動で縮める。会話ウィンドウ(常に内容優先・縮めない)が大きいほど立ち絵は
// 小さくなり、頭が箱の上端で切れることはない(flexboxのshrinkで立ち絵の行だけが縮む設計、
// conversation-frame.tsx冒頭コメント「overlay限定」参照)。
const PORTRAIT_BOX_RELATIVE_SIZE_CLASS: Record<BoxOrientation, string> = {
  landscape: 'h-full max-h-[48cqh] w-auto aspect-[3/4]',
  portrait: 'h-full max-h-[32cqh] w-auto aspect-[3/4]',
}

// 話者の枠(#119/#124): いま話している人の立ち絵カードを、フルカラー表示に加えて黒または白の
// 枠線で囲む(DESIGN.md「会話フレーム」節「話者の枠」)。index.cssの
// --speaker-frame-black/--speaker-frame-whiteトークン経由で両方用意してあり、切り替えは
// この定数1箇所で行う。代表決定(2026-09-14)により白に確定した。
const SPEAKER_FRAME_COLOR: 'black' | 'white' = 'white'
// `SPEAKER_FRAME_COLOR`をリテラル比較(===)で分岐すると、tscがconst初期化値からの
// 制御フロー narrowing により反対側の分岐を「到達不能(no overlap)」と誤判定して
// TS2367 を出す(値をどちらに変えても同様)。ルックアップテーブル参照にすることで回避する。
const SPEAKER_FRAME_RING_CLASS_BY_COLOR: Record<'black' | 'white', string> = {
  black: 'ring-4 ring-speaker-frame-black',
  white: 'ring-4 ring-speaker-frame-white',
}
const SPEAKER_FRAME_RING_CLASS = SPEAKER_FRAME_RING_CLASS_BY_COLOR[SPEAKER_FRAME_COLOR]

/** 名札(色だけに頼らず発話者を示す、WCAG 1.4.1)。会話ウィンドウ内のこの1箇所だけに出す
 * (#119/#124: 旧実装は立ち絵カードの下にも同じ名札を重複表示しており、二重表示になっていた。
 * 立ち絵側はaltテキスト(発話中/待機中)のみで発話者を示し、可視の名札はウィンドウ側に一本化する)。 */
function NamePlate({ label, speaking }: { label: string; speaking: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full font-semibold',
        'px-3 py-0.5 text-xs',
        speaking
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground border-border border',
      )}
    >
      {label}
    </span>
  )
}

/**
 * 枠が空(まだ誰も入っていない)のときのプレースホルダー。立ち絵と同じ寸法の不可視要素を置き、
 * 後から人物が入っても枠の位置(左右のアンカー)がずれないようにする(DESIGN.md「左右2枠の
 * 入れ替わり方式」節「枠の位置そのものは動かさず」)。
 */
function EmptyPortraitSlot({ sizeClass }: { sizeClass: string }) {
  return <div aria-hidden="true" className={cn('shrink-0', sizeClass)} data-slot="empty" />
}

interface PortraitProps {
  display: TwoSlotDisplay
  slot: 'left' | 'right'
  /** 話している場合の表情(省略時neutral)。待機中の立ち絵は常にneutralを使う(#102)。 */
  expression?: Expression
  sizeClass: string
}

/**
 * 立ち絵1体分。発話中はフルカラー+話者の枠(黒/白リング)、待機中はグレースケール+不透明度低下。
 * 名札はここでは描画しない(#119/#124、上記NamePlateコメント参照。発話者の可視表示は会話
 * ウィンドウ側のNamePlateに一本化し、立ち絵側はimgのalt(発話中/待機中)でのみ示す)。
 * 立ち絵アセットは切り抜き前(単色の無地背景, DESIGN.md「アセット」節「立ち絵の運用メモ」)のため
 * 現状は背景付きの矩形で表示される(切り抜きは別途 IMAGE_WORKFLOW 経由の工程。本PRのスコープ外)。
 */
function Portrait({ display, slot, expression, sizeClass }: PortraitProps) {
  const { character, speaking } = display
  return (
    <div
      data-slot={slot}
      className={cn('flex shrink-0 items-end', sizeClass, speaking ? 'z-10' : 'z-0')}
    >
      <img
        src={resolvePortraitSrc(character, speaking ? expression : undefined)}
        alt={`${character}（${speaking ? '発話中' : '待機中'}）`}
        className={cn(
          'h-full w-full rounded-lg object-cover object-top transition-all duration-200',
          speaking
            ? cn(SPEAKER_FRAME_RING_CLASS, 'opacity-100 grayscale-0 saturate-100')
            : 'scale-95 opacity-60 grayscale saturate-0',
        )}
      />
    </div>
  )
}

export interface ConversationFrameProps {
  /**
   * 現在の発話者。通常はサポート役キャラ(Character)。探索の`collect.dialogue[]`限定でNPCが
   * 話す場合は`{ npc: 'NPC名' }`を渡す(ConversationSpeaker参照)。`speakerHistory`の最後の
   * 要素と一致させること(省略時は`speakerHistory`が`[speaker]`にフォールバックするため、
   * 単発の会話ではこのpropだけで足りる)。
   */
  speaker: ConversationSpeaker
  /**
   * 「今の会話1つぶん」の発話者履歴(古い→新しい順、最後の要素=`speaker`と同じ値)。
   * 左右2枠の並びは`src/ui/lib/two-slot-frame.ts`の`layoutTwoSlotFrame`がこの履歴全体から
   * 導出する(#108/#110)。複数ターンの会話(導入の`character_intros[]`・探索の
   * `collect.dialogue[]`・解決の全問い)を送る呼び出し側は、そのつど「これまでの発話者」を
   * 蓄積してここに渡すことで、正しい入れ替わり順を得られる。省略時は`[speaker]`
   * (履歴なし=この1ターンだけの単発会話。探索完了への誘導等)にフォールバックする。
   * 並びのリセット(導入の開始・探索の会話1つの開始・解決の開始)は、呼び出し側がこの配列を
   * 新しく空から蓄積し始めることで表現する(このコンポーネント自体はリセット用のstateを
   * 持たない)。
   */
  speakerHistory?: readonly ConversationSpeaker[]
  /**
   * 会話文(世界観テキスト、明朝で表示)。タイプライターで1文字ずつ表示するため文字列で受け取る
   * (呼び出し側は現状すべて文字列を渡している。scene-explorer.tsx / resolve-screen.tsx 参照)。
   */
  line: string
  /**
   * `speaker`の立ち絵の表情差分(#102, docs/scenario_schema.md §2.6)。省略時はneutral。
   * 該当表情のPNGが無ければneutralにフォールバックする(resolvePortraitSrc参照)。
   * NPC発話時(speakerがオブジェクト)は無視される(NPCは立ち絵を持たない)。
   */
  expression?: Expression
  /**
   * レイアウト種別(#52・T047)。既定の'stacked'は画面の通常フローに沿って会話ウィンドウ・
   * その上の左右2枠を縦に積む表示(resolve-screen.tsx で使用、背景画像を持たない画面向け)。
   * 'overlay'は探索の会話オーバーレイ・導入(scene-explorer.tsx / intro-screen.tsx)専用で、
   * 絶対配置(`absolute inset-0`)になり、呼び出し側が `position: relative` を持つコンテナに
   * 重ねて使うことを前提とする(DESIGN.md「探索シーン」節「会話オーバーレイのレイアウト」)。
   */
  layout?: 'stacked' | 'overlay'
  /**
   * 会話ウィンドウ内に載せる追加要素(選択肢・相談ボタン・カードドロワー等、DESIGN.md
   * 「解決の会話モードで会話フレーム上に載せる要素」)。
   *
   * タイプライター表示中は送り途中の誤タップを防ぐため、フレーム側が内部で保持し、
   * `line` の全文表示が完了(タイプライター完走 or スキップ)するまで描画しない
   * (#64/T042)。呼び出し側は従来どおり children を渡すだけでよく、表示タイミングの
   * 制御はこのコンポーネントの責務とする(呼び出し側のAPIを変えないための設計)。
   */
  children?: ReactNode
  /**
   * `line` の全文表示が完了した瞬間(タイプライター完走 or スキップ)に1度だけ呼ばれる。
   * children はこの完了後にしか描画されないため、children 内の要素へフォーカスを移す等の
   * 副作用が必要な呼び出し側はここから行う
   * (例: scene-explorer.tsx の証言「閉じる」ボタンへの自動フォーカス)。
   */
  onLineRevealed?: () => void
  /**
   * 会話ウィンドウ全体を1つのクリック/タップ可能な操作領域にする(#52 Phase4.7 追補・T048)。
   * 指定した場合のみ有効(既定は従来どおり、指定しなければ何も変わらない):
   * - 全文表示前にクリック/タップ、またはEnter/Spaceで即全文表示(スキップ)。
   * - 全文表示後にクリック/タップ、またはEnter/Spaceでこのコールバックを呼ぶ(呼び出し側が
   *   会話を閉じる、または次のターンへ進める。DESIGN.md「探索シーン」節「会話ウィンドウ」)。
   * - Escapeキーは全文表示の途中/後を問わず常にこのコールバックを呼ぶ(即座に閉じる)。
   * 指定した場合、会話文はもうスキップ専用の内側の<button>では描画しない(操作領域が
   * ウィンドウ全体=このコールバックに一本化されるため、ボタンの入れ子を避ける)。
   * ウィンドウ自体をrole="button"にし、開いた瞬間(マウント時)にフォーカスを当てる
   * (呼び出し側は開閉のたびに新規マウントする前提、scene-explorer.tsx参照)。
   */
  onDismiss?: () => void
  /**
   * Escapeキー押下時に呼ぶコールバック(onDismiss指定時のみ意味を持つ)。省略時は`onDismiss`に
   * フォールバックする(従来どおり=Escapeは常に閉じる)。多ターンの会話(探索の`collect.dialogue[]`
   * 送り)で`onDismiss`を「次の行へ進める」用途に流用する呼び出し側は、Escapeまで一緒に
   * 「次の行」扱いにされると閉じる手段が無くなってしまうため、`onEscape`に「会話を閉じる」
   * 処理を別途渡すこと(scene-explorer.tsx参照)。導入(intro-screen.tsx)のように「閉じる」
   * 概念自体が無い呼び出し側は、no-op(`() => {}`)を渡してEscapeを無効化してよい。
   */
  onEscape?: () => void
  /**
   * 会話ウィンドウの**外側**(overlay layoutでは重なった背景シーンの見えている部分、
   * stacked layoutでは立ち絵・ウィンドウの周囲の余白)をクリック/タップ、またはEscapeで
   * 呼ばれる(#92追補・代表FB「探索完了への誘導は閉じて再探索も可・ロックしない」)。
   * `onDismiss`(会話ウィンドウ**自体**をクリックで閉じる、調査結果/danger用)とは
   * 独立した別の仕組みで、**併用しない**: 探索完了への誘導(scene-explorer.tsxの
   * conversationSlot)は「わかった」という実 `<button>` を children に持つため、
   * `onDismiss` のようにウィンドウ全体を1つの操作領域(role="button")にすると
   * ボタンの入れ子(role="button"の中に実`<button>`)になってしまう。そのため
   * ウィンドウの**外側**だけを閉じる操作領域にする。
   * ポインター操作者向けの補助的な閉じ方であり、AT には公開しない(role・aria-labelは
   * 付けない。キーボード操作者は Escape、または children 内の実ボタン=「わかった」を使う)。
   */
  onOutsideDismiss?: () => void
  /**
   * `onDismiss`の2段階操作(スキップ→次へ/閉じる)を、会話ウィンドウだけでなく画面全体
   * (背景・立ち絵を含む外枠)でも受け付ける(#108/#110・導入専用、DESIGN.md「台詞送り」節
   * 「画面のどこをクリック/タップしても次の行に進む」)。`onDismiss`指定時のみ意味を持ち、
   * `layout="overlay"`と組み合わせて使う想定(intro-screen.tsx)。キーボード操作
   * (Tab到達・Enter/Space)は従来どおり会話ウィンドウ自体(role="button")が担い、外枠側は
   * ポインタ操作(onClickのみ)を追加するだけでrole="button"の入れ子を避ける。
   * scene-explorer.tsx の調査結果/danger会話オーバーレイ(操作領域を会話ウィンドウ自体に
   * 限定する従来仕様)では指定しない。
   */
  dismissAnywhere?: boolean
  /**
   * 背景の箱の向き(#119/#124)。`layout="overlay"`のときのみ意味を持ち、立ち絵の拡大率の上限
   * (PORTRAIT_BOX_RELATIVE_SIZE_CLASS、横長/縦長で切り替え)を決める。会話ウィンドウ自体は
   * 高さ上限を持たず内容優先で伸び、立ち絵の行が箱の残り空間に合わせて自動的に縮む
   * (2026-09-14改訂・#124、上記layout==='overlay'のコメント参照)。
   * 呼び出し側(scene-explorer.tsx/intro-screen.tsx/resolve-screen.tsx)は自身が描画する
   * BackgroundBoxと同じ`resolveBoxOrientation()`の結果を渡すこと。`layout="stacked"`では
   * 無視される(固定pxのPORTRAIT_SIZE_CLASSを使う)。省略時は'landscape'。
   */
  boxOrientation?: BoxOrientation
}

/** 導入・探索の会話・解決の会話モードで共通して使う会話フレーム(DESIGN.md「会話フレーム」節)。 */
export function ConversationFrame({
  speaker,
  speakerHistory,
  line,
  expression,
  layout = 'stacked',
  children,
  onLineRevealed,
  onDismiss,
  onEscape,
  onOutsideDismiss,
  dismissAnywhere = false,
  boxOrientation = 'landscape',
}: ConversationFrameProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const label = speakerLabel(speaker)
  // 左右2枠の並び(#108/#110): speakerHistory省略時は履歴なし(=この1ターンだけ)として扱う。
  const twoSlot = layoutTwoSlotFrame(speakerHistory ?? [speaker])

  // line(または prefers-reduced-motion 設定)が変わったら、レンダー中に即座に表示位置を
  // 先頭(またはreduced-motionなら全文)へ戻す。useEffectでの事後リセットだと、変更後の最初の
  // 1フレームだけ古い revealedLength を新しい line.length と比較した誤った isComplete で
  // 描画してしまう(childrenが一瞬出る/消える等)ため、Reactの「レンダー中にstateを合わせる」
  // パターン(公式ドキュメント推奨)で同期的に揃える。
  const [trackedLine, setTrackedLine] = useState(line)
  const [trackedMotionPref, setTrackedMotionPref] = useState(prefersReducedMotion)
  const [revealedLength, setRevealedLength] = useState(() =>
    prefersReducedMotion ? line.length : 0,
  )

  const windowRef = useRef<HTMLDivElement>(null)
  // スキップ操作(タップ/Enter)で全文表示した場合にのみ、完了後 children 内の最初の
  // フォーカス可能要素へフォーカスを移す(スキップ用ボタンがDOMから消えてフォーカスが
  // documentへ落ちるのを防ぐ)。自然完走(何もしなくても全文表示された)場合は移さない。
  const focusFirstChildOnRevealRef = useRef(false)
  const onLineRevealedRef = useRef(onLineRevealed)

  // refの更新はレンダー中に行えない(react-hooks/refs)ため、コミット後に必ず最新値へ
  // 揃えるだけのeffect(依存配列なし=毎回実行)にする。呼び出し側がonLineRevealedを
  // インライン関数で渡しても、下の「完了時」effectを不要に再発火させないための定番パターン。
  useEffect(() => {
    onLineRevealedRef.current = onLineRevealed
  })

  if (line !== trackedLine || prefersReducedMotion !== trackedMotionPref) {
    setTrackedLine(line)
    setTrackedMotionPref(prefersReducedMotion)
    setRevealedLength(prefersReducedMotion ? line.length : 0)
  }

  const isComplete = revealedLength >= line.length

  // フォーカス引き継ぎ用フラグのリセットもrefの直接代入ではなくeffect側で行う(react-hooks/refs)。
  // line/prefers-reduced-motionが変わるたび(=タイプライターが先頭から再生されるたび)に、
  // 前のlineでのスキップ操作の名残でフォーカスが誤って移らないようにする。
  useEffect(() => {
    focusFirstChildOnRevealRef.current = false
  }, [line, prefersReducedMotion])

  // タイプライター本体: line/prefers-reduced-motionが変わるたびに先頭(上のレンダー中の
  // 同期処理で0、またはreduced-motionならline.length)から刻む。1文字表示するたびに
  // setRevealedLengthのfunctional updateで最新値を見て続きを刻み、末尾でinterval自身を
  // clearする(次のlineに変わった時は cleanup で確実にclearする)。
  useEffect(() => {
    if (prefersReducedMotion || line.length === 0) return
    const intervalId = window.setInterval(() => {
      setRevealedLength((prev) => {
        const next = Math.min(prev + 1, line.length)
        if (next >= line.length) window.clearInterval(intervalId)
        return next
      })
    }, TYPEWRITER_CHAR_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [line, prefersReducedMotion])

  // 全文表示が完了した瞬間(タイプライター完走 or スキップ)に1度だけ通知・フォーカス移動する。
  useEffect(() => {
    if (!isComplete) return
    onLineRevealedRef.current?.()
    if (focusFirstChildOnRevealRef.current) {
      focusFirstChildOnRevealRef.current = false
      windowRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    }
  }, [isComplete])

  /** タップ/Enterで即全文表示にする(DESIGN.md「タイプライター表示」節)。onDismiss未指定時のみ使う。 */
  function handleSkip(event: MouseEvent<HTMLButtonElement>) {
    if (isComplete) return
    // キーボード操作(Enter/Space)によるclickも含め、このボタン自身にフォーカスがある状態で
    // スキップされた場合のみ、消滅後の完了時に children 側へフォーカスを引き継ぐ。
    if (document.activeElement === event.currentTarget) {
      focusFirstChildOnRevealRef.current = true
    }
    setRevealedLength(line.length)
  }

  // onDismiss指定時(#52 Phase4.7 追補・T048): ウィンドウ全体が1つの操作領域になる
  // (全文表示前=スキップ、全文表示後=onDismiss呼び出し)。ConversationFrameインスタンスは
  // 呼び出し側が開閉のたびに新規マウントする前提(scene-explorer.tsxのconversation state参照)
  // のため、マウント時に一度だけウィンドウへフォーカスを当てる(依存配列は空=マウント時のみ)。
  useEffect(() => {
    if (onDismiss) windowRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleOverlayActivate() {
    if (!isComplete) {
      setRevealedLength(line.length)
      return
    }
    onDismiss?.()
  }

  function handleOverlayKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Escapeは表示状態によらず常に閉じる(DESIGN.md「探索シーン」節「会話ウィンドウ」)。
    // onEscapeが指定されていればそちらを使う(onDismissを「次の行へ進める」用途に流用する
    // 多ターン会話でも、Escapeだけは常に閉じる動作を保てるようにするため。onEscapeのJSDoc参照)。
    if (event.key === 'Escape') {
      event.preventDefault()
      ;(onEscape ?? onDismiss)?.()
      return
    }
    // role="button"の要素はEnter/Spaceを自動でclickへ変換しない(ネイティブbuttonと違う)ため、
    // 明示的にハンドリングする。Spaceは既定でページスクロールを起こすためpreventDefaultする。
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOverlayActivate()
    }
  }

  // 会話ウィンドウ自体のクリック(dismissWindowProps.onClick)は、dismissAnywhere時に外枠へも
  // 伝播すると2重発火(スキップ+即閉じ等)してしまうため、ここで止める(下記
  // handleContainerActivateのコメント参照)。onDismiss未指定時はこのハンドラ自体使われない。
  function handleWindowActivate(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
    handleOverlayActivate()
  }

  // dismissAnywhere指定時(#108/#110): 会話ウィンドウを含む外枠全体でも同じ2段階操作
  // (スキップ→次へ/閉じる)を受け付ける(DESIGN.md「台詞送り」節)。ポインタ操作のみ
  // (role・tabIndexは付けない=role="button"の入れ子を避ける、windowRef側の実装参照)。
  // クリック後もキーボード操作(Enter/Space)を続けられるよう、ウィンドウへフォーカスを戻す。
  function handleContainerActivate() {
    handleOverlayActivate()
    windowRef.current?.focus()
  }

  // onOutsideDismiss指定時(#92追補): ウィンドウの外側(overlayなら立ち絵・周囲の余白、
  // stackedでも同様)を1つの操作領域にする。onDismissと違いwindowRef自体には付けない
  // (children内の実`<button>`=「わかった」とのネスト回避のため、上記JSDoc参照)。
  // ハンドラは呼び出し側(下記のoverlay/stackedそれぞれの一番外側の要素)に付け、
  // クリックが実際の会話ウィンドウ(windowRef)の**外**で起きた場合のみ発火させる
  // (windowRef.current.containsで判定。#108/#110で立ち絵をウィンドウの上に大きく重ねる
  // レイアウトに変えたことで、立ち絵の表示領域そのものが外枠の大半を占めるようになり、
  // 「クリックが厳密に外枠要素自身に当たった場合のみ」(target===currentTarget)という
  // 旧判定では立ち絵の上のクリックを拾えなくなったため、より頑健なcontains判定に変更した。
  // 立ち絵・ウィンドウ周囲の余白のどちらも「ウィンドウの外側」として扱う点はJSDocの記述どおり)。
  function handleOutsideActivate(event: MouseEvent<HTMLDivElement>) {
    if (windowRef.current?.contains(event.target as Node)) return
    onOutsideDismiss?.()
  }

  // Escapeは(onDismiss同様)ウィンドウ内のどこにフォーカスがあっても常に閉じる
  // (子孫要素からのキーイベントバブリングで届くため、target判定は不要)。
  function handleOutsideKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    onOutsideDismiss?.()
  }

  // onDismiss指定時、ウィンドウ自体をrole="button"のクリック/タップ可能な操作領域にする
  // (T048)。アクセシブルネームは会話文そのもの(line)に固定し、スキップ前後で変わらない
  // ようにする(同じ要素を「スキップ→もう一度で閉じる」の2段階でそのまま使い回せる。
  // 例: `getByRole('button', {name: line})` を1回目=スキップ・2回目=閉じるに使い回せる)。
  const dismissWindowProps = onDismiss
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': line,
        onClick: handleWindowActivate,
        onKeyDown: handleOverlayKeyDown,
      }
    : {}

  // 名札+会話文(タイプライター/全文)+children。stacked/overlay で共有する会話ウィンドウの
  // 中身(外枠のサイズ・配置だけがレイアウトごとに異なる、#52・T047)。
  const windowContent = (
    <>
      <div className="flex flex-col gap-2">
        <NamePlate label={label} speaking />
        {isComplete ? (
          <p className="font-heading text-base leading-relaxed sm:text-lg">{line}</p>
        ) : onDismiss ? (
          // onDismiss指定時(T048): ウィンドウ全体(windowRef側)が操作領域になるため、ここは
          // 入れ子のbuttonにしない(role="button"の中にネイティブbuttonを入れないため)。
          // 表示内容自体は従来と同じ(aria-hiddenの演出テキスト+sr-onlyの全文)。
          <div className="font-heading min-h-12 w-full text-left text-base leading-relaxed sm:text-lg">
            <span aria-hidden="true">{line.slice(0, revealedLength)}</span>
            <span className="sr-only">{line}</span>
          </div>
        ) : (
          // タイプライター演出中: 見た目は1文字ずつ増える部分文字列(aria-hidden、演出のみ)。
          // 支援技術には別途sr-onlyで全文を一度に渡す(1文字ずつ読み上げさせない、#64/T042)。
          // タップ/Enterでこのボタン自体が即全文表示のスキップ操作になる
          // (children=選択肢等はisComplete後にしか出ないため、送り途中の誤タップも防げる)。
          <button
            type="button"
            onClick={handleSkip}
            className="font-heading focus-visible:ring-ring min-h-12 w-full rounded-md text-left text-base leading-relaxed focus-visible:ring-3 focus-visible:outline-none sm:text-lg"
          >
            <span aria-hidden="true">{line.slice(0, revealedLength)}</span>
            <span className="sr-only">{line}</span>
          </button>
        )}
      </div>
      {isComplete && children}
    </>
  )

  // 左右2枠の立ち絵(#108/#110): 空の枠は同寸法の不可視プレースホルダーで埋め、位置がずれない
  // ようにする。NPC発話中(npcSpeaking)はどちらの枠も現在の占有者のまま・speaking=falseに
  // なる(layoutTwoSlotFrame参照)ため、Portrait側の描画は変更不要(通常の待機中表示と同じ)。
  // sizeClassはlayoutごとに呼び出し元が選ぶ(stacked=固定px/overlay=箱高さ比率cqh、上記
  // PORTRAIT_SIZE_CLASS/PORTRAIT_BOX_RELATIVE_SIZE_CLASS参照)。
  // shrink/grow挙動(overlay限定・stacked=shrink-0固定/overlay=flex-1 min-h-0で縮む)は
  // 呼び出し側がextraClassNameで指定する(#124: 同じユーティリティを2箇所で異なる方向に
  // 上書きするとTailwindのクラス優先順位が不定になるため、基底クラスにはshrink系を含めない)。
  function renderPortraitRow(extraClassName: string, sizeClass: string) {
    return (
      <div
        className={cn(
          // relative+z-20: 位置指定(relative)を持つ会話ウィンドウ(z-10)より確実に手前に
          // 描画するため。position指定の無い要素はz-indexの数値に関わらず位置指定要素の
          // 背後に回ってしまう(CSSの積み重ね規則)。
          'relative z-20 flex items-end justify-between gap-2 sm:gap-4',
          extraClassName,
        )}
      >
        {twoSlot.left ? (
          <Portrait
            display={twoSlot.left}
            slot="left"
            expression={twoSlot.left.speaking ? expression : undefined}
            sizeClass={sizeClass}
          />
        ) : (
          <EmptyPortraitSlot sizeClass={sizeClass} />
        )}
        {twoSlot.right ? (
          <Portrait
            display={twoSlot.right}
            slot="right"
            expression={twoSlot.right.speaking ? expression : undefined}
            sizeClass={sizeClass}
          />
        ) : (
          <EmptyPortraitSlot sizeClass={sizeClass} />
        )}
      </div>
    )
  }

  if (layout === 'overlay') {
    // 探索の会話オーバーレイ(#52・T047)、および導入(#108/#110)。#119/#124: 呼び出し側
    // (scene-explorer.tsx/intro-screen.tsx/resolve-screen.tsx)がBackgroundBoxの子として
    // このコンポーネントを配置する前提で、箱に対して`absolute inset-0`で重畳する
    // (旧#108/#110の「箱の直後の兄弟要素として通常のドキュメントフローに置く」形は、
    // 縦スクロールを出さない要件(#119)を満たせなかったため撤回した)。
    // 2026-09-14改訂(#124・代表FB「解決の会話ウィンドウが窮屈」): 内側のラッパーに`h-full`
    // (箱の実高さに確定させる)を与え、立ち絵の行を`flex-1 min-h-0`(縮小可・content優先で
    // 縮める)、会話ウィンドウを`shrink-0`(縮めない=内容を絶対に切り詰めない)にすることで、
    // 「立ち絵→ウィンドウ」の合計が箱の高さを超える場合は立ち絵の行**だけ**が自動的に縮む
    // (window有りだけがshrink-0なのでflexboxの縮小配分は立ち絵の行に全て乗る、標準的な
    // flexbox shrink計算)。立ち絵カード自身(PORTRAIT_BOX_RELATIVE_SIZE_CLASS)も`h-full`
    // (=縮んだ行の実高さ)を基準にし、`max-h-[Xcqh]`で上限を掛ける(cqh単独だと行の実際の
    // 空きに追従しないため、上限としてのみ使う)。会話ウィンドウは`overflow-y-auto`+
    // `max-h-full`を最後の安全弁として残すが、通常の表示状態では発火しない設計
    // (E2E/E2E-shot.mjsのno-scroll確認対象)。
    const portraitSizeClass = PORTRAIT_BOX_RELATIVE_SIZE_CLASS[boxOrientation]
    return (
      <div
        data-testid="conversation-frame-overlay"
        className="absolute inset-0 z-10 flex flex-col"
        onClick={dismissAnywhere ? handleContainerActivate : undefined}
        onKeyDown={onOutsideDismiss ? handleOutsideKeyDown : undefined}
      >
        <div
          className="relative flex h-full min-h-0 flex-col justify-end gap-0 p-2 sm:p-4"
          onClick={onOutsideDismiss ? handleOutsideActivate : undefined}
          {...(onOutsideDismiss ? { 'data-testid': 'conversation-overlay-backdrop' } : {})}
        >
          {renderPortraitRow('min-h-0 flex-1 -mb-2 sm:-mb-4', portraitSizeClass)}
          <div
            ref={windowRef}
            data-testid="conversation-window"
            className={cn(
              'border-primary bg-card relative z-10 flex min-w-0 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border-t-4 p-3 shadow-lg sm:gap-4 sm:p-6',
              'max-h-full',
              onDismiss &&
                'focus-visible:ring-ring cursor-pointer focus-visible:ring-3 focus-visible:outline-none',
            )}
            {...dismissWindowProps}
          >
            {windowContent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-0"
      onClick={onOutsideDismiss ? handleOutsideActivate : undefined}
      onKeyDown={onOutsideDismiss ? handleOutsideKeyDown : undefined}
      {...(onOutsideDismiss ? { 'data-testid': 'conversation-overlay-backdrop' } : {})}
    >
      {/* 立ち絵(左右2枠、#108/#110): 主人公の立ち絵は出さない。stackedは背景の箱を持たない
          画面向けのため固定pxのまま(PORTRAIT_SIZE_CLASS)、縮小しない(shrink-0)。 */}
      {renderPortraitRow('shrink-0 px-2 sm:gap-12 -mb-4', PORTRAIT_SIZE_CLASS)}
      {/* 会話ウィンドウ: surface + 上辺に primary(ゴールド)のアクセント。 */}
      <div
        ref={windowRef}
        className={cn(
          'border-primary bg-card relative z-10 flex flex-col gap-4 rounded-lg border-t-4 p-4 sm:p-6',
          onDismiss &&
            'focus-visible:ring-ring cursor-pointer focus-visible:ring-3 focus-visible:outline-none',
        )}
        {...dismissWindowProps}
      >
        {windowContent}
      </div>
    </div>
  )
}
