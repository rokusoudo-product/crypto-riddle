import { Outlet } from 'react-router-dom'

// 全画面共通レイアウト(DESIGN.md「基本方針」節「単一のダーク文脈に統一」・#132/#133)。
// 2026-09-14(#132)代表決定により、旧「ライト文脈（タイトル/マップ選択/カード図鑑）＝
// LightLayout」「ダーク文脈（導入/探索/解決/結果）＝DarkLayout」の2レイアウト使い分けは廃止し、
// 全8画面（タイトル/マップ選択/導入/探索/解決/結果/カード図鑑）にこの1レイアウトを適用する
// （src/ui/routes.tsx参照。旧light-layout.tsxは削除済み）。
// `class="dark"` は OS のライト/ダークモード設定を検出して付け外ししているのではなく、
// 常時固定で適用する（本作はネオン配色を活かすため、OS 設定には追従しない仕様。DESIGN.md
// 「基本方針」節）。src/index.css の :root にはこの単一のダークテーマの値のみを定義しており、
// `class="dark"` は button.tsx/card-drawer.tsx/scene-explorer.tsx が使う一部の `dark:` バリアント
// （例: outline variant の `dark:bg-input/30`）を有効化する目的でのみ残してある
// （src/index.css 冒頭のコメント参照）。
export function DarkLayout() {
  return (
    <div className="dark bg-background text-foreground min-h-dvh">
      <Outlet />
    </div>
  )
}
