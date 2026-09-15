// src/ui/components/game-time-badge.tsx — ゲーム内時刻の表示部品(#136/#137)。
//
// DESIGN.md「ゲーム内時刻」節が正本: 導入(intro)・探索の各シーン(scenes[])・解決(resolution)に
// それぞれ省略可能な `game_time`(`HH:MM`・24時間表記、schema_version 0.9.0・#136)を持たせ、
// 値がある場合のみ画面に表示する(省略時は何も表示しない)。
//
// 解決画面(resolve-screen.tsx)は並行する別Issue(#134中央選択パネル・#135 XPバー)が
// 大きく書き換える予定のため、時刻表示は本コンポーネントを差し込むだけの最小差分にとどめる
// (#137 Issue本文)。導入(intro-screen.tsx)・探索(scene-explorer.tsx)・解決(resolve-screen.tsx)の
// いずれも本コンポーネントをそのまま使う共通部品にする。
//
// 表示先(DESIGN.md「ゲーム内時刻」節・「会話フレーム」節): 会話ウィンドウ帯の右上端に重ねる
// (conversation-frame.tsx の `cornerSlot` prop 経由。呼び出し側=intro-screen.tsx/
// resolve-screen.tsx/scene-explorer.tsx)。探索④で会話ウィンドウが出ていない間(探索状態)は
// シーンタブの下に表示する(scene-explorer.tsx側で直接配置)。
//
// アクセシビリティ: 可視テキスト自体が支援技術向けのラベルを兼ねる(例「ゲーム内時刻 09:42」の
// テキストノードがそのままアクセシブルネームになる)ため、追加の aria-label は付けない
// (WCAG的に読み上げ内容と見た目の内容を一致させる。DESIGN.md「ゲーム内時刻」節「支援技術向けに、
// 意味の分かるラベルを付ける」に対応)。時計アイコンは装飾のため aria-hidden にする。
import { Clock } from 'lucide-react'

import { cn } from '@/ui/lib/utils'

export interface GameTimeBadgeProps {
  /** `HH:MM`形式のゲーム内時刻(intro/scenes[]/resolutionのgame_time、省略可)。 */
  gameTime?: string
  className?: string
}

/**
 * ゲーム内時刻バッジ。`gameTime`が省略されている場面(データ側でgame_timeを書いていないシーン・
 * s0-sample等)では何も描画しない(DESIGN.md「粒度・データ」節「省略時、UIは時刻表示を出さない」)。
 */
export function GameTimeBadge({ gameTime, className }: GameTimeBadgeProps) {
  if (!gameTime) return null
  return (
    <div
      className={cn(
        'border-border bg-card/90 text-foreground pointer-events-none inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm sm:text-sm',
        className,
      )}
    >
      <Clock aria-hidden="true" className="size-3.5 sm:size-4" />
      <span>ゲーム内時刻 {gameTime}</span>
    </div>
  )
}
