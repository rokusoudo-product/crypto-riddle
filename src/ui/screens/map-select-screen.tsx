import { useNavigate } from 'react-router-dom'

import { SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// T015 以降、複数マップ(S2〜S3・法務)が揃うまでは s0-sample のみが実データとして選択できる。
// プレースホルダの残り2件は、量産前でも画面の見た目(一覧UI)を確認できるよう残す。
const UNAVAILABLE_MAPS = ['S2 (未確定)', 'S3 (未確定)']

// ②マップ選択（ライト文脈）。目的=事例選択／主要アクション=「マップを選ぶ」。
export function MapSelectScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const restartScenario = useGameStore((s) => s.restartScenario)

  function handleSelect() {
    // 一度クリア済みでも再挑戦できるよう、常に intro から始め直す(T013 の結線範囲)。
    restartScenario(scenario)
    navigate('/intro')
  }

  return (
    <ScreenContainer title="マップ選択">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">進捗を取得しています…</p>}
        empty={<p>解放済みのマップがまだありません。事件を解決して次のマップを解放しよう。</p>}
        error={<p className="text-destructive">進捗の取得に失敗しました。</p>}
      >
        <ul className="flex flex-col gap-4">
          <li className="border-border bg-card flex items-center justify-between gap-4 rounded-lg border p-4">
            <span>{scenario.title}</span>
            <Button type="button" className="h-12 min-w-12 px-6 text-base" onClick={handleSelect}>
              マップを選ぶ
            </Button>
          </li>
          {UNAVAILABLE_MAPS.map((map) => (
            <li
              key={map}
              className="border-border bg-card text-muted-foreground flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <span>{map}</span>
              <span className="text-sm">準備中</span>
            </li>
          ))}
        </ul>
        <SecondaryAction to="/cards">カード図鑑</SecondaryAction>
      </StateFrame>
    </ScreenContainer>
  )
}
