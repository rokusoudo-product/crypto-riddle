import { useNavigate } from 'react-router-dom'

import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ③導入（ダーク文脈）。目的=事件の前提提示／主要アクション=タップで進行・SKIP。
// T013: core のシナリオ進行ステートマシン(scenarioReducer)と接続し、s0-sample の導入テキストを表示する。
export function IntroScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)

  function handleAdvance() {
    if (progress.part !== 'intro') {
      // 既に intro を通過済み(直接 URL 遷移・戻る操作等)なら現在の進行先へ案内する。
      navigate(routeForProgress(progress))
      return
    }
    const next = dispatch({ type: 'ADVANCE_INTRO' })
    navigate(routeForProgress(next))
  }

  return (
    <ScreenContainer title="導入">
      <StateFrame
        state={state}
        error={<p className="text-destructive">シナリオの読込に失敗しました。</p>}
      >
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg">{scenario.intro.victim_company.name}</h2>
          <p className="text-muted-foreground text-sm">
            {scenario.intro.victim_company.description}
          </p>
        </div>
        <p className="max-w-[60ch]">{scenario.intro.background}</p>
        <ul className="flex flex-col gap-3">
          {scenario.intro.character_intros.map((line, index) => (
            <li key={index} className="border-border bg-card rounded-lg border p-3">
              <span className="font-semibold">{line.character}</span>「{line.line}」
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-4">
          <Button type="button" className="h-12 min-w-12 px-6 text-base" onClick={handleAdvance}>
            タップで進行
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-12 px-6"
            onClick={handleAdvance}
          >
            SKIP
          </Button>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
