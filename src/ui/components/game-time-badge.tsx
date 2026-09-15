// src/ui/components/game-time-badge.tsx — ゲーム内時刻の表示部品(#136/#137)。
//
// DESIGN.md「ゲーム内時刻」節が正本: 導入(intro)・探索の各シーン(scenes[])・解決(resolution)に
// それぞれ省略可能な `game_time`(`HH:MM`・24時間表記、schema_version 0.9.0・#136)を持たせ、
// 値がある場合のみ画面に表示する(省略時は何も表示しない)。
//
// 表示先(DESIGN.md「ゲーム内時刻」節・代表決定2026-09-15・#149秘書レビュー2回目): **背景の箱の
// 右上**、右上のボタン群と同じ行にボタン群の左隣として並べる(1行に収まらなければボタン群の
// すぐ下に右寄せで折り返す)。会話ウィンドウの内側/外側どちらにも重ねない独立した配置にした
// (旧・会話ウィンドウの角に重ねる`cornerSlot`案は、縦長で立ち絵2枠の幅が広く重なりが残る
// ケースがあったため撤回)。呼び出し側(intro-screen.tsx/resolve-screen.tsx/
// scene-explorer.tsx)が右上ボタン群を組み立てるJSXの中にそのまま並べて使う、汎用の表示部品。
//
// アクセシビリティ: 可視テキスト自体が支援技術向けのラベルを兼ねる(例「ゲーム内時刻 09:42」の
// テキストノードがそのままアクセシブルネームになる)ため、追加の aria-label は付けない
// (WCAG的に読み上げ内容と見た目の内容を一致させる。DESIGN.md「ゲーム内時刻」節「支援技術向けに、
// 意味の分かるラベルを付ける」に対応)。時計アイコンは装飾のため aria-hidden にする。
//
// `compact`(秘書レビュー2026-09-15・PR#149・advisor提案): 縦長(9:16)は右上ボタン群自体の
// 横幅も狭いため、フルラベル「ゲーム内時刻 HH:MM」だとボタン群と同じ行に収まりにくい。
// `compact`指定時は可視テキストを時刻のみ(`HH:MM`)に切り詰めて表示幅を縮め、フルラベルは
// `sr-only`で別途提供する(conversation-frame.tsxのタイプライター表示=aria-hidden部分文字列+
// sr-only全文と同じパターン)。
import { Clock } from 'lucide-react'

import { cn } from '@/ui/lib/utils'

export interface GameTimeBadgeProps {
  /** `HH:MM`形式のゲーム内時刻(intro/scenes[]/resolutionのgame_time、省略可)。 */
  gameTime?: string
  /**
   * 縦長(9:16)の会話ウィンドウ上辺など、立ち絵との横幅の余白が狭い置き場所向けに、可視テキストを
   * 時刻のみに切り詰める(上記ファイル冒頭コメント参照)。フルラベルはsr-onlyで維持する。
   */
  compact?: boolean
  className?: string
}

/**
 * ゲーム内時刻バッジ。`gameTime`が省略されている場面(データ側でgame_timeを書いていないシーン・
 * s0-sample等)では何も描画しない(DESIGN.md「粒度・データ」節「省略時、UIは時刻表示を出さない」)。
 */
export function GameTimeBadge({ gameTime, compact = false, className }: GameTimeBadgeProps) {
  if (!gameTime) return null
  return (
    <div
      className={cn(
        'border-border bg-card/90 text-foreground pointer-events-none inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm sm:text-sm',
        className,
      )}
    >
      <Clock aria-hidden="true" className="size-3.5 sm:size-4" />
      {compact ? (
        <>
          <span aria-hidden="true">{gameTime}</span>
          <span className="sr-only">ゲーム内時刻 {gameTime}</span>
        </>
      ) : (
        <span>ゲーム内時刻 {gameTime}</span>
      )}
    </div>
  )
}
