// src/ui/components/conversation-frame.tsx — 会話フレーム共通コンポーネント(#42/T033、
// タイプライター表示は#52 Phase4.7/#64/T042、探索の会話オーバーレイ化は#52 Phase4.7 追補/
// T047・`layout` prop、会話ウィンドウのクリック/タップ閉じ化は#52 Phase4.7 追補/T048・
// `onDismiss` prop、探索完了への誘導を「閉じて再探索も可・ロックしない」形にした
// #92追補・代表FBで`onOutsideDismiss` prop を追加、導入の対策室レイアウト(`layout="intro"`)・
// NPC発話(`speaker`がConversationSpeaker型に拡張)・表情フォールバック(`expression` prop)・
// `onEscape` prop は #100/#102 で追加)。
//
// DESIGN.md「会話フレーム(共通コンポーネント・#42で導入)」節が正本:
// - レイアウト: 画面下部に会話ウィンドウ、ステージ中央に立ち絵。探索④・解決⑤は現行どおり
//   2枠(霧島=左・橘=右で固定)。導入③のみ3枠(`layout="intro"`。霧島=左/橘=右/小鳥遊=中央後方
//   やや小さめの「対策室レイアウト」、#100/#102)。
// - 発話者の強調: 発話中はフルカラーで手前、**発話者以外は全員グレーアウト**(グレースケール+
//   輝度・不透明度低下。#100で「支援役2名固定・直前話者のみグレーアウト」から「人数によらず
//   発話者以外は全員グレーアウト」へ一般化)。色(グレーアウト)だけに頼らず、名札テキストでも
//   発話者を示す(WCAG 1.4.1)。→ 発話中の名札だけでなく、待機中の立ち絵にも常に名前ラベルを
//   添えることで、どの立ち絵がどのキャラかを色に依存せず判別できるようにする。
// - NPC発話(#100/#102): `speaker`に`{ npc: '名前' }`を渡すと、既知の立ち絵(霧島・橘・intro
//   layoutならさらに小鳥遊)は全員グレーアウトし、名札にはnpcの値をそのまま表示する
//   (ConversationSpeaker/speakerLabel参照。探索の`collect.dialogue[]`限定、
//   docs/scenario_schema.md §2.6)。
// - 表情フォールバック(#100/#102): `expression` propで発話者の立ち絵の表情差分を指定できる。
//   該当PNGが無ければneutralにフォールバックする(resolvePortraitSrc参照。現在生成済みは
//   3名ともneutralのみ)。待機中の立ち絵は常にneutralを使う。
// - 名札: 会話ウィンドウ左上に primary背景+ダーク文字のピル。
// - 会話文は明朝(font-heading)、名札・操作UIはゴシック(既定のsans)。
// - 主人公の立ち絵は出さない(docs/characters.md §3)。
// - タイプライター表示(#52 Phase4.7/#64/T042): 会話文は1文字ずつ時間差で表示する。
//   タップ/Enterで即全文(スキップ)、prefers-reduced-motionでは即全文(アニメなし)。
//   支援技術には全文を一度に渡す(演出中テキストはaria-hidden、全文はvisually-hiddenで提供)。
//   選択肢・相談・カード閲覧等の操作要素(children)は全文表示(またはスキップ)後にのみ出す
//   (送り途中の誤タップ防止)。詳細は下記の各関数コメントを参照。
// - 探索の会話オーバーレイ・導入の対策室レイアウト(#52・T047、#100/#102): `layout="overlay"`
//   または`layout="intro"`を指定すると、従来の「縦に積む」表示(`layout="stacked"`、既定・
//   resolve-screen.tsx で使用)ではなく、絶対配置で呼び出し側のコンテナ(`position: relative`
//   を持つ背景の箱)に重ねる表示になる。左右端に縮小した立ち絵(intro はさらに小鳥遊を中央後方に
//   1体追加)・下部に会話ウィンドウ(帯)を1行に並べ、背景中央と重ならないように端寄せする
//   (DESIGN.md「探索シーン」節「会話オーバーレイのレイアウト」「会話フレーム」節)。
//   タイプライター・フォーカス管理・children の表示タイミング等のロジックは stacked と
//   完全に共有し、JSX の外枠だけを分岐する(scene-explorer.tsx / intro-screen.tsx 参照)。
// - 会話ウィンドウのクリック/タップ閉じ(#52 Phase4.7 追補・T048): `onDismiss` を指定すると、
//   専用の「閉じる」ボタンを置かず、会話ウィンドウ全体を1つの操作領域にする。全文表示前の
//   クリック/タップ/Enter/Spaceはスキップ(全文表示)、全文表示後の同操作は`onDismiss`を呼ぶ
//   (Escapeは`onEscape`があればそちら、無ければ`onDismiss`。多ターンの会話で`onDismiss`を
//   「次の行へ進める」用途に流用する呼び出し側は、Escapeだけ別に「閉じる」へ渡せる。#102)。
//   呼び出し側(scene-explorer.tsx)は調査結果/dangerの教育的フィードバックの会話オーバーレイに
//   のみ指定し、探索完了への誘導(conversationSlot、独自の「わかった」ボタンを持つ)には
//   指定しない。詳細は`onDismiss`/`onEscape`のJSDoc参照。
// - 多ターンの会話送り(導入の`character_intros[]`・探索の`collect.dialogue[]`、#100/#102):
//   本コンポーネント自体は常に1ターン(1つのspeaker/line)しか表示しない。複数ターンの送りは
//   呼び出し側が`turnIndex`等の状態を持ち、`speaker`/`line`/`expression`を差し替えて
//   再レンダーすることで実現する(intro-screen.tsx / scene-explorer.tsx 参照)。line が変わると
//   タイプライターは自動的に先頭から再生される(既存の同期処理、変更なし)。
//
// 導入(③)・探索の会話(④)・解決の会話モード(⑤)で共通して使う(DESIGN.md)。#102で③導入
// (intro-screen.tsx)への配線が完了し、④探索(scene-explorer.tsx)・⑤解決(resolve-screen.tsx)と
// 合わせて3画面すべての配線が揃った。
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

// 霧島=左・橘=右で固定(docs/characters.md「霧島＝左・橘＝右」)。stacked/overlayの2枠で使う。
const PORTRAIT_ORDER: readonly Character[] = ['霧島', '橘']

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
 * NPC発話時は霧島・橘の両立ち絵をグレーアウトし、名札にnpcの値をそのまま表示する(DESIGN.md
 * 「探索シーン」節「NPC直接発話の描画」)。
 */
export type ConversationSpeaker = Character | { readonly npc: string }

function speakerLabel(speaker: ConversationSpeaker): string {
  return typeof speaker === 'string' ? speaker : speaker.npc
}

/** NPC発話時はどの立ち絵も発話者に一致しない(=全員グレーアウト)ため null を返す。 */
function speakingCharacterOf(speaker: ConversationSpeaker): Character | null {
  return typeof speaker === 'string' ? speaker : null
}

interface PortraitProps {
  character: Character
  speaking: boolean
  /** 話している場合の表情(省略時neutral)。待機中の立ち絵は常にneutralを使う(#102)。 */
  expression?: Expression
  /**
   * 探索の会話オーバーレイ(#52・T047)・導入の対策室レイアウト(#100/#102)用の縮小サイズ。
   * 背景シーンの箱(aspect-video)の中に立ち絵を収めるため、stacked(既定)より一回り小さくする
   * (DESIGN.md「会話オーバーレイのレイアウト」節「モバイルでも立ち絵は縮小して端に置く」は
   * モバイルに限らずoverlay全般に適用)。
   */
  compact?: boolean
}

/**
 * 立ち絵1体分。発話中はフルカラー+手前(scale)、待機中はグレースケール+不透明度低下。
 * 立ち絵アセットは切り抜き前(単色の無地背景, DESIGN.md「アセット」節「立ち絵の運用メモ」)のため
 * 現状は背景付きの矩形で表示される(切り抜きは別途 IMAGE_WORKFLOW 経由の工程。本PRのスコープ外)。
 */
function Portrait({ character, speaking, expression, compact = false }: PortraitProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center',
        compact ? 'gap-1' : 'gap-2',
        speaking ? 'z-10' : 'z-0',
      )}
    >
      <img
        src={resolvePortraitSrc(character, speaking ? expression : undefined)}
        alt={`${character}（${speaking ? '発話中' : '待機中'}）`}
        className={cn(
          'rounded-lg object-cover object-top transition-all duration-200',
          compact ? 'h-16 w-12 sm:h-28 sm:w-20' : 'h-32 w-24 sm:h-44 sm:w-32',
          speaking
            ? 'opacity-100 grayscale-0 saturate-100'
            : 'scale-95 opacity-60 grayscale saturate-0',
        )}
      />
      {/* 色だけに頼らず名札テキストで発話者を明示する(WCAG 1.4.1)。待機中も常に表示する。 */}
      <span
        className={cn(
          'rounded-full font-semibold',
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-0.5 text-xs',
          speaking
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground border-border border',
        )}
      >
        {character}
      </span>
    </div>
  )
}

export interface ConversationFrameProps {
  /**
   * 現在の発話者。通常はサポート役キャラ(Character)。探索の`collect.dialogue[]`限定でNPCが
   * 話す場合は`{ npc: 'NPC名' }`を渡す(#100/#102、ConversationSpeaker参照)。NPC発話時は
   * 霧島・橘(layout='intro'ならさらに小鳥遊も)の立ち絵が全員グレーアウトし、名札には
   * npc の値をそのまま表示する(DESIGN.md「探索シーン」節「NPC直接発話の描画」)。
   */
  speaker: ConversationSpeaker
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
   * レイアウト種別(#52・T047、導入の3枠は#100/#102)。既定の'stacked'は従来どおり画面下部に
   * 会話ウィンドウ・ステージ中央の左右に立ち絵を縦に積む表示(resolve-screen.tsx で使用、非破壊)。
   * 'overlay'は探索の会話オーバーレイ(scene-explorer.tsx)専用で、絶対配置(`absolute inset-0`)
   * になり、呼び出し側が `position: relative` を持つコンテナに重ねて使うことを前提とする
   * (DESIGN.md「探索シーン」節「会話オーバーレイのレイアウト」)。
   * 'intro'は導入(③)専用の「対策室レイアウト」(#100/#102、DESIGN.md「会話フレーム」節)で、
   * 'overlay'と同じ絶対配置の仕組みを再利用しつつ、霧島=左・橘=右に加えて小鳥遊を
   * 中央後方やや小さめに1体追加した3枠になる(呼び出し側は intro-screen.tsx の背景の箱に
   * 重ねて使う想定)。
   */
  layout?: 'stacked' | 'overlay' | 'intro'
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
   *   会話を閉じる。DESIGN.md「探索シーン」節「会話ウィンドウ」=旧「閉じる」ボタンの代替)。
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
   * 送り、#102)で`onDismiss`を「次の行へ進める」用途に流用する呼び出し側は、Escapeまで
   * 一緒に「次の行」扱いにされると閉じる手段が無くなってしまうため、`onEscape`に
   * 「会話を閉じる」処理を別途渡すこと(scene-explorer.tsx参照。DESIGN.md「探索シーン」節
   * 「会話ウィンドウのクリック/タップ閉じ」はEscapeが常に閉じる仕様のまま変えていない)。
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
}

/** 導入・探索の会話・解決の会話モードで共通して使う会話フレーム(DESIGN.md「会話フレーム」節)。 */
export function ConversationFrame({
  speaker,
  line,
  expression,
  layout = 'stacked',
  children,
  onLineRevealed,
  onDismiss,
  onEscape,
  onOutsideDismiss,
}: ConversationFrameProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const label = speakerLabel(speaker)
  const speakingCharacter = speakingCharacterOf(speaker)

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

  // onOutsideDismiss指定時(#92追補): ウィンドウの外側(overlayなら重なった背景、stackedなら
  // 立ち絵・ウィンドウ周囲の余白)を1つの操作領域にする。onDismissと違いwindowRef自体には
  // 付けない(children内の実`<button>`=「わかった」とのネスト回避のため、上記JSDoc参照)。
  // ハンドラは呼び出し側(下記のoverlay/stackedそれぞれの一番外側の要素)に付け、
  // `event.target === event.currentTarget` のときのみ発火させることで、内側の立ち絵・
  // ウィンドウ(・その中の「わかった」ボタン)へのクリックがバブリングしてきても
  // 誤って閉じないようにする(=クリックが実際に「外側の余白」に当たった場合のみ閉じる)。
  function handleOutsideActivate(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
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
        onClick: handleOverlayActivate,
        onKeyDown: handleOverlayKeyDown,
      }
    : {}

  // 名札+会話文(タイプライター/全文)+children。stacked/overlay で共有する会話ウィンドウの
  // 中身(外枠のサイズ・配置だけがレイアウトごとに異なる、#52・T047)。
  const windowContent = (
    <>
      <div className="flex flex-col gap-2">
        <span className="bg-primary text-primary-foreground w-fit rounded-full px-3 py-1 text-xs font-semibold">
          {label}
        </span>
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

  if (layout === 'overlay' || layout === 'intro') {
    // 探索の会話オーバーレイ(#52・T047・DESIGN.md「会話オーバーレイのレイアウト」節)、および
    // 導入の対策室レイアウト(#100/#102、layout='intro')。呼び出し側(scene-explorer.tsx /
    // intro-screen.tsx)の`position: relative`な背景の箱に`absolute inset-0`で重ね、下端に
    // 立ち絵(左右端、intro層はさらに小鳥遊を中央後方に1体追加)+会話ウィンドウ(中央帯)を
    // 1行で並べる(背景中央と重ならないよう端寄せ)。行の高さを`h-full`で確定させることで、
    // ウィンドウの`max-h-[...]%`(下記コメント参照)がその高さを基準に計算されるようにしている。
    const isIntro = layout === 'intro'
    return (
      <div
        className="absolute inset-0 z-10 flex flex-col justify-end p-2 sm:p-4"
        onKeyDown={onOutsideDismiss ? handleOutsideKeyDown : undefined}
      >
        <div
          className="relative flex h-full items-end justify-center gap-2 sm:gap-3"
          onClick={onOutsideDismiss ? handleOutsideActivate : undefined}
          {...(onOutsideDismiss ? { 'data-testid': 'conversation-overlay-backdrop' } : {})}
        >
          <Portrait
            character={PORTRAIT_ORDER[0]}
            speaking={PORTRAIT_ORDER[0] === speakingCharacter}
            expression={PORTRAIT_ORDER[0] === speakingCharacter ? expression : undefined}
            compact
          />
          {/* 小鳥遊(対策室レイアウト・#100/#102): 中央後方やや小さめ(DESIGN.md「会話フレーム」節)。
              絶対配置で中央上寄りに置き、compact(縮小サイズ)+スケールダウン+低いz-indexで
              左右の2体より「奥」にいるように見せる。他の立ち絵と同じグレーアウト/名札の
              仕組みをそのまま使う(発話者以外は常にグレーアウト)。 */}
          {isIntro && (
            <div className="absolute top-0 left-1/2 z-0 -translate-x-1/2 scale-90">
              <Portrait
                character="小鳥遊"
                speaking={'小鳥遊' === speakingCharacter}
                expression={'小鳥遊' === speakingCharacter ? expression : undefined}
                compact
              />
            </div>
          )}
          {/* 会話ウィンドウ(帯): 背景の箱(aspect-video・overflow-hidden)からはみ出さないよう
              max-h+overflow-y-autoにする(カードドロワー展開時・長い台詞での見切れ対策)。 */}
          <div
            ref={windowRef}
            className={cn(
              'border-primary bg-card relative z-10 flex max-h-[70%] min-w-0 flex-1 flex-col gap-3 overflow-y-auto rounded-lg border-t-4 p-3 shadow-lg sm:max-h-[75%] sm:gap-4 sm:p-6',
              onDismiss &&
                'focus-visible:ring-ring cursor-pointer focus-visible:ring-3 focus-visible:outline-none',
            )}
            {...dismissWindowProps}
          >
            {windowContent}
          </div>
          <Portrait
            character={PORTRAIT_ORDER[1]}
            speaking={PORTRAIT_ORDER[1] === speakingCharacter}
            expression={PORTRAIT_ORDER[1] === speakingCharacter ? expression : undefined}
            compact
          />
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
      {/* ステージ: 中央左右に立ち絵(霧島=左・橘=右で固定)。主人公の立ち絵は出さない。 */}
      <div className="flex items-end justify-center gap-6 pb-4 sm:gap-12">
        {PORTRAIT_ORDER.map((character) => (
          <Portrait
            key={character}
            character={character}
            speaking={character === speakingCharacter}
            expression={character === speakingCharacter ? expression : undefined}
          />
        ))}
      </div>
      {/* 会話ウィンドウ: surface + 上辺に primary(ゴールド)のアクセント。 */}
      <div
        ref={windowRef}
        className={cn(
          'border-primary bg-card flex flex-col gap-4 rounded-lg border-t-4 p-4 sm:p-6',
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
