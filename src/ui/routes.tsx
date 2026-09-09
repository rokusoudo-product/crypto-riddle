import { Navigate, Route, Routes } from 'react-router-dom'

import { DarkLayout } from '@/ui/layouts/dark-layout'
import { LightLayout } from '@/ui/layouts/light-layout'
import { CardIndexScreen } from '@/ui/screens/card-index-screen'
import { ExploreScreen } from '@/ui/screens/explore-screen'
import { FailScreen } from '@/ui/screens/fail-screen'
import { IntroScreen } from '@/ui/screens/intro-screen'
import { MapSelectScreen } from '@/ui/screens/map-select-screen'
import { ResolveScreen } from '@/ui/screens/resolve-screen'
import { ResultScreen } from '@/ui/screens/result-screen'
import { TitleScreen } from '@/ui/screens/title-screen'

// T011: DESIGN.md の8画面のルーティング骨格。
// 基本遷移: タイトル→マップ選択→導入→探索→解決→(失敗解説)→結果→マップ選択。図鑑はタイトル/マップ選択から。
// 状態管理（Zustand・core ステートマシン接続）は T013 の範囲のため、ここでは静的なルートのみを定義する。
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<LightLayout />}>
        <Route path="/" element={<TitleScreen />} />
        <Route path="/maps" element={<MapSelectScreen />} />
        <Route path="/cards" element={<CardIndexScreen />} />
      </Route>
      <Route element={<DarkLayout />}>
        <Route path="/intro" element={<IntroScreen />} />
        <Route path="/explore" element={<ExploreScreen />} />
        <Route path="/resolve" element={<ResolveScreen />} />
        <Route path="/resolve/fail" element={<FailScreen />} />
        <Route path="/result" element={<ResultScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
