import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { canEnterResolution } from '@/core/scenario'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ④探索（ダーク文脈）。目的=手がかり収集／主要アクション=調査ポイント→カード獲得。
// T013: core のシナリオ進行ステートマシンと接続する。調査ポイントは s0-sample の実データを使う。
export function ExploreScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)

  if (progress.part !== 'exploration') {
    return (
      <ScreenContainer title="探索">
        <p className="text-muted-foreground">
          まだ探索パートではありません。
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 align-baseline"
            onClick={() => navigate(routeForProgress(progress))}
          >
            続きへ進む
          </Button>
        </p>
      </ScreenContainer>
    )
  }

  function handleInvestigate(pointId: string) {
    dispatch({ type: 'INVESTIGATE', pointId })
  }

  function handleEnterResolution() {
    const next = dispatch({ type: 'ENTER_RESOLUTION' })
    if (next.part === 'resolution') navigate('/resolve')
  }

  const canProceed = canEnterResolution(progress, scenario)

  return (
    <ScreenContainer title="探索">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">判定しています…</p>}
        empty={<p>まだ調査していません。調査ポイントをタップしよう。</p>}
        error={<p className="text-destructive">エラーが発生しました。</p>}
      >
        <ul className="flex flex-col gap-4">
          {scenario.investigation_points.map((point) => {
            const investigated = progress.investigatedPointIds.includes(point.id)
            return (
              <li
                key={point.id}
                className="border-border bg-card flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">{point.category}</span>
                  <span>{point.label}</span>
                </div>
                {investigated ? (
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Check aria-hidden="true" className="size-4" />
                    調査済み
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 min-w-12 px-4"
                    onClick={() => handleInvestigate(point.id)}
                  >
                    調査する
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        <Button
          type="button"
          className="h-12 min-w-12 self-start px-6 text-base"
          disabled={!canProceed}
          onClick={handleEnterResolution}
        >
          解決へ進む
        </Button>
      </StateFrame>
    </ScreenContainer>
  )
}
