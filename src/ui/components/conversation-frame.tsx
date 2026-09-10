// src/ui/components/conversation-frame.tsx — 会話フレーム共通コンポーネント(#42/T033)。
//
// DESIGN.md「会話フレーム(共通コンポーネント・#42で導入)」節が正本:
// - レイアウト: 画面下部に会話ウィンドウ、ステージ中央の左右に立ち絵(霧島=左・橘=右で固定)。
// - 発話者の強調: 発話中はフルカラーで手前、待機中はグレーアウト(グレースケール+輝度・不透明度低下)。
//   色(グレーアウト)だけに頼らず、名札テキストでも発話者を示す(WCAG 1.4.1)。
//   → 発話中の名札だけでなく、待機中の立ち絵にも常に名前ラベルを添えることで、
//     どちらの立ち絵がどのキャラかを色に依存せず判別できるようにする。
// - 名札: 会話ウィンドウ左上に primary背景+ダーク文字のピル。
// - 会話文は明朝(font-heading)、名札・操作UIはゴシック(既定のsans)。
// - 主人公の立ち絵は出さない(docs/characters.md §3)。
//
// 導入(③)・探索の会話(④)・解決の会話モード(⑤)で共通して使う想定(DESIGN.md)。
// 本PR(#45/T033)では解決(⑤)への適用を優先スコープとし、③④への配線は見送る(PR本文に明記)。
//
// 立ち絵アセットは repo ルートの assets/(src/ 外)に置かれているため `@/*` エイリアスは使えず、
// 相対パスで import する。vite/client.d.ts の `declare module '*.png'` により型定義は問題なく、
// Vite・Vitest どちらの変換パイプラインでも文字列(URL)として解決される。
import type { ReactNode } from 'react'

import type { Character } from '@/core/model'
import { cn } from '@/ui/lib/utils'

import kirishimaPortrait from '../../../assets/characters/kirishima-neutral.png'
import tachibanaPortrait from '../../../assets/characters/tachibana-neutral.png'

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
  /** 会話文(世界観テキスト、明朝で表示)。 */
  line: ReactNode
  /**
   * 会話ウィンドウ内に載せる追加要素(選択肢・相談ボタン・カードドロワー等、DESIGN.md
   * 「解決の会話モードで会話フレーム上に載せる要素」)。
   */
  children?: ReactNode
}

/** 導入・探索の会話・解決の会話モードで共通して使う会話フレーム(DESIGN.md「会話フレーム」節)。 */
export function ConversationFrame({ speaker, line, children }: ConversationFrameProps) {
  return (
    <div className="flex flex-col gap-0">
      {/* ステージ: 中央左右に立ち絵(霧島=左・橘=右で固定)。主人公の立ち絵は出さない。 */}
      <div className="flex items-end justify-center gap-6 pb-4 sm:gap-12">
        {PORTRAIT_ORDER.map((character) => (
          <Portrait key={character} character={character} speaking={character === speaker} />
        ))}
      </div>
      {/* 会話ウィンドウ: surface + 上辺に primary(ゴールド)のアクセント。 */}
      <div className="border-primary bg-card flex flex-col gap-4 rounded-lg border-t-4 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <span className="bg-primary text-primary-foreground w-fit rounded-full px-3 py-1 text-xs font-semibold">
            {speaker}
          </span>
          <p className="font-heading text-base leading-relaxed sm:text-lg">{line}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
