// src/ui/lib/orientation.ts — 画面の向き(横/縦)を購読するフック(#119/#124)。
//
// DESIGN.md「探索シーン」節「背景の箱」: 横長・縦長の判定は画面幅ではなく画面の向き
// (`orientation`)で行う(タブレットを横に持ったときは16:9のまま)。
// conversation-frame.tsx の usePrefersReducedMotion と同じ購読パターン
// (matchMedia未実装のjsdom等では常にlandscape=falseを返す)。
import { useEffect, useState } from 'react'

const PORTRAIT_QUERY = '(orientation: portrait)'

function getIsPortraitScreen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(PORTRAIT_QUERY).matches
}

/** 現在の画面が縦長(`orientation: portrait`)かどうかを購読するフック。 */
export function useIsPortraitScreen(): boolean {
  const [isPortrait, setIsPortrait] = useState(getIsPortraitScreen)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQueryList = window.matchMedia(PORTRAIT_QUERY)
    const handleChange = () => setIsPortrait(mediaQueryList.matches)
    handleChange()
    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [])

  return isPortrait
}
