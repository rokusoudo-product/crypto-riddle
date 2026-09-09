import type { ReactNode } from 'react'

import type { ScreenState } from '@/ui/state/screen-state'

type StateFrameProps = {
  state: ScreenState
  /** 通常状態の内容。 */
  children: ReactNode
  /** ローディング状態の内容。省略時は汎用表示。 */
  loading?: ReactNode
  /** 空状態の内容。省略時は汎用表示。 */
  empty?: ReactNode
  /** エラー状態の内容。省略時は汎用表示。 */
  error?: ReactNode
}

// T011: 全8画面共通の4状態切替フレーム。DESIGN.md「画面一覧と状態」の
// 通常／ローディング／空／エラーを画面ごとに差し替え可能にする。
export function StateFrame({ state, children, loading, empty, error }: StateFrameProps) {
  switch (state) {
    case 'loading':
      return (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          {loading ?? <p className="text-muted-foreground">読み込み中…</p>}
        </div>
      )
    case 'empty':
      return <div className="flex flex-col gap-4">{empty ?? <p>データがありません。</p>}</div>
    case 'error':
      return (
        <div role="alert" className="flex flex-col gap-4">
          {error ?? <p className="text-destructive">エラーが発生しました。</p>}
        </div>
      )
    case 'normal':
    default:
      return <div className="flex flex-col gap-4">{children}</div>
  }
}
