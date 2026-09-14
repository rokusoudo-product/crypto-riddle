import type { ReactNode } from 'react'

import { cn } from '@/ui/lib/utils'

type ScreenContainerProps = {
  /** 画面見出し。--font-heading（明朝）で表示する。`variant="immersive"`では視覚的に非表示
   * (sr-only)になるが、a11yのためDOMには残す(既存テストのheading参照も壊さない)。 */
  title: string
  children: ReactNode
  /**
   * `'immersive'`(#124・代表決定2026-09-14): 背景を持つ画面(導入③・探索④・解決⑤の背景あり
   * パート)向け。コンテナの最大幅(720〜960px)を適用せず、背景の箱(BackgroundBox)を画面
   * いっぱいに表示する。ページの縦スクロールを出さない(`h-dvh overflow-hidden`)。見出しは
   * `sr-only`にし、シーンタブ・ボタン群・会話フレームなどは箱の子として呼び出し側が重ねる。
   * 省略時は`'default'`(従来どおりの中央寄せ・最大幅960px)。
   */
  variant?: 'default' | 'immersive'
}

// T011: 8画面共通のレイアウト骨格。
// DESIGN.md「余白・レイアウト」= モバイル縦第一・背景を持つ画面はプレイ枠=背景の箱を画面
// いっぱいに表示・背景を持たない画面はコンテンツ最大幅720〜960px・8ptグリッド・1画面1目的。
export function ScreenContainer({ title, children, variant = 'default' }: ScreenContainerProps) {
  const immersive = variant === 'immersive'
  return (
    <main
      className={cn(
        'relative mx-auto flex w-full flex-col',
        // immersive: items-centerは付けない(既定のalign-items:stretchのままにする)。
        // BackgroundBoxの`width: min(100%, ...)`が「定まった幅を持つ親」を必要とするため
        // (items-centerにすると子はshrink-to-fitになり、100%の基準が不定になって箱が
        // 潰れる、2026-09-14実機確認)。水平方向の中央寄せはBackgroundBox自身の`mx-auto`が
        // 担う。justify-centerで縦方向だけ中央寄せする。
        immersive
          ? 'h-dvh max-w-none justify-center overflow-hidden'
          : 'min-h-dvh max-w-[960px] gap-6 px-4 py-8 sm:px-8',
      )}
    >
      <h1 className={cn('font-heading text-2xl font-bold sm:text-3xl', immersive && 'sr-only')}>
        {title}
      </h1>
      {children}
    </main>
  )
}
