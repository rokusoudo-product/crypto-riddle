// T011: 4状態（通常／ローディング／空／エラー）の共通型。
// DESIGN.md「画面一覧と状態」の全8画面がこの型を共有する。
// erasableSyntaxOnly のため enum ではなく as const ユニオンで定義する。
export const SCREEN_STATES = ['normal', 'loading', 'empty', 'error'] as const

export type ScreenState = (typeof SCREEN_STATES)[number]

export function isScreenState(value: string | null): value is ScreenState {
  if (value === null) return false
  return (SCREEN_STATES as readonly string[]).includes(value)
}
