import type { ReactNode } from 'react'

type ScreenContainerProps = {
  /** 画面見出し。--font-heading（明朝）で表示する。 */
  title: string
  children: ReactNode
}

// T011: 8画面共通のレイアウト骨格。
// DESIGN.md「余白・レイアウト」= モバイル縦第一・コンテンツ最大幅720〜960px・8ptグリッド・1画面1目的。
export function ScreenContainer({ title, children }: ScreenContainerProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[960px] flex-col gap-6 px-4 py-8 sm:px-8">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{title}</h1>
      {children}
    </main>
  )
}
