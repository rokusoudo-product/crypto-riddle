import { Outlet } from 'react-router-dom'

// ライト文脈（タイトル／マップ選択／カード図鑑）。DESIGN.md「アートディレクション」。
// OS のダークモード切替にはこの区分のまま追従する（shadcn の :root トークンが担当）。
// ゴールド等の実カラー・トーン差し替えは T012 の範囲。
export function LightLayout() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <Outlet />
    </div>
  )
}
