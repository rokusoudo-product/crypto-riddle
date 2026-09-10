// src/ui/components/conversation-frame.tsx — 会話フレーム共通コンポーネント(#42/T033、
// タイプライター表示は#52 Phase4.7/#64/T042)。
//
// DESIGN.md「会話フレーム(共通コンポーネント・#42で導入)」節が正本:
// - レイアウト: 画面下部に会話ウィンドウ、ステージ中央の左右に立ち絵(霧島=左・橘=右で固定)。
// - 発話者の強調: 発話中はフルカラーで手前、待機中はグレーアウト(グレースケール+輝度・不透明度低下)。
//   色(グレーアウト)だけに頼らず、名札テキストでも発話者を示す(WCAG 1.4.1)。
//   → 発話中の名札だけでなく、待機中の立ち絵にも常に名前ラベルを添えることで、
//     どちらの立ち絵がどのキャラかを色に依存せず判別できるようにする。
//   支援役は霧島・橘の2名固定のため新しい仕組みは作らず、上記のグレーアウト(既存挙動)のまま
//   両立ち絵を常に表示し続ける(直前話者はグレーアウトして残る。DESIGN.md「会話フレーム」節)。
// - 名札: 会話ウィンドウ左上に primary背景+ダーク文字のピル。
// - 会話文は明朝(font-heading)、名札・操作UIはゴシック(既定のsans)。
// - 主人公の立ち絵は出さない(docs/characters.md §3)。
// - タイプライター表示(#52 Phase4.7/#64/T042): 会話文は1文字ずつ時間差で表示する。
//   タップ/Enterで即全文(スキップ)、prefers-reduced-motionでは即全文(アニメなし)。
//   支援技術には全文を一度に渡す(演出中テキストはaria-hidden、全文はvisually-hiddenで提供)。
//   選択肢・相談・カード閲覧等の操作要素(children)は全文表示(またはスキップ)後にのみ出す
//   (送り途中の誤タップ防止)。詳細は下記の各関数コメントを参照。
//
// 導入(③)・探索の会話(④)・解決の会話モード(⑤)で共通して使う想定(DESIGN.md)。
// 実際の配線は④探索(scene-explorer.tsx)・⑤解決(resolve-screen.tsx)のみ済み。
// ③導入(intro-screen.tsx)はまだ ConversationFrame を使っておらず未配線(#45時点から継続)。
// 配線され次第、本コンポーネントのタイプライター表示は追加対応なしで自動的に効く。
//
// 立ち絵アセットは repo ルートの assets/(src/ 外)に置かれているため `@/*` エイリアスは使えず、
// 相対パスで import する。vite/client.d.ts の `declare module '*.png'` により型定義は問題なく、
// Vite・Vitest どちらの変換パイプラインでも文字列(URL)として解決される。
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react'

import type { Character } from '@/core/model'
import { cn } from '@/ui/lib/utils'

import kirishimaPortrait from '../../../assets/characters/kirishima-neutral.png'
import tachibanaPortrait from '../../../assets/characters/tachibana-neutral.png'

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

// 霧島=左・橘=右で固定(docs/characters.md「霧島＝左・橘＝右」)。
const PORTRAIT_ORDER: readonly Character[] = ['霧島', '橘']

const PORTRAIT_SRC: Record<Character, string> = {
  霧島: kirishimaPortrait,
  橘: tachibanaPortrait,
}

interface PortraitProps {
  character: Character
  speaking: boolean
}

/**
 * 立ち絵1体分。発話中はフルカラー+手前(scale)、待機中はグレースケール+不透明度低下。
 * 立ち絵アセットは切り抜き前(単色の無地背景, DESIGN.md「アセット」節「立ち絵の運用メモ」)のため
 * 現状は背景付きの矩形で表示される(切り抜きは別途 IMAGE_WORKFLOW 経由の工程。本PRのスコープ外)。
 */
function Portrait({ character, speaking }: PortraitProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', speaking ? 'z-10' : 'z-0')}>
      <img
        src={PORTRAIT_SRC[character]}
        alt={`${character}（${speaking ? '発話中' : '待機中'}）`}
        className={cn(
          'h-32 w-24 rounded-lg object-cover object-top transition-all duration-200 sm:h-44 sm:w-32',
          speaking
            ? 'opacity-100 grayscale-0 saturate-100'
            : 'scale-95 opacity-60 grayscale saturate-0',
        )}
      />
      {/* 色だけに頼らず名札テキストで発話者を明示する(WCAG 1.4.1)。待機中も常に表示する。 */}
      <span
        className={cn(
          'rounded-full px-3 py-0.5 text-xs font-semibold',
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
  /** 現在の発話者。 */
  speaker: Character
  /**
   * 会話文(世界観テキスト、明朝で表示)。タイプライターで1文字ずつ表示するため文字列で受け取る
   * (呼び出し側は現状すべて文字列を渡している。scene-explorer.tsx / resolve-screen.tsx 参照)。
   */
  line: string
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
}

/** 導入・探索の会話・解決の会話モードで共通して使う会話フレーム(DESIGN.md「会話フレーム」節)。 */
export function ConversationFrame({
  speaker,
  line,
  children,
  onLineRevealed,
}: ConversationFrameProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

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

  /** タップ/Enterで即全文表示にする(DESIGN.md「タイプライター表示」節)。 */
  function handleSkip(event: MouseEvent<HTMLButtonElement>) {
    if (isComplete) return
    // キーボード操作(Enter/Space)によるclickも含め、このボタン自身にフォーカスがある状態で
    // スキップされた場合のみ、消滅後の完了時に children 側へフォーカスを引き継ぐ。
    if (document.activeElement === event.currentTarget) {
      focusFirstChildOnRevealRef.current = true
    }
    setRevealedLength(line.length)
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ステージ: 中央左右に立ち絵(霧島=左・橘=右で固定)。主人公の立ち絵は出さない。 */}
      <div className="flex items-end justify-center gap-6 pb-4 sm:gap-12">
        {PORTRAIT_ORDER.map((character) => (
          <Portrait key={character} character={character} speaking={character === speaker} />
        ))}
      </div>
      {/* 会話ウィンドウ: surface + 上辺に primary(ゴールド)のアクセント。 */}
      <div
        ref={windowRef}
        className="border-primary bg-card flex flex-col gap-4 rounded-lg border-t-4 p-4 sm:p-6"
      >
        <div className="flex flex-col gap-2">
          <span className="bg-primary text-primary-foreground w-fit rounded-full px-3 py-1 text-xs font-semibold">
            {speaker}
          </span>
          {isComplete ? (
            <p className="font-heading text-base leading-relaxed sm:text-lg">{line}</p>
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
      </div>
    </div>
  )
}
