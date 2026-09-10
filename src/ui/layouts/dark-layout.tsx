import { Outlet } from 'react-router-dom'

// ダーク文脈（導入／探索／解決／結果）。DESIGN.md「アートディレクション」＝
// プレイに集中する暖色寄りの暗色。T011 時点では shadcn 既存の .dark グレースケールトークンを
// この階層に強制適用してライト/ダークの区別を「クラス設計」として用意する
// （ゴールド等の実カラー確定は T012、advisor 承認済み）。
// OS のダークモード切替に対する追従（両文脈へのライト/ダーク値定義）も T012 で本格対応する。
export function DarkLayout() {
  return (
    <div className="dark bg-background text-foreground min-h-dvh">
      <Outlet />
    </div>
  )
}
