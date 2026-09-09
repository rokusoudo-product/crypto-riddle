import { useSearchParams } from 'react-router-dom'

import { isScreenState, type ScreenState } from '@/ui/state/screen-state'

// 開発中に4状態を確認する簡易スイッチ: `?state=loading|empty|error` クエリパラメータで切替。
// 省略時・不正値は 'normal'。core のステートマシン（T013）とは接続しない、UI 表示専用の状態。
export function useScreenState(): ScreenState {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get('state')
  return isScreenState(raw) ? raw : 'normal'
}
