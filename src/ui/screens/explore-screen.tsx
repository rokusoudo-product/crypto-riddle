import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { canEnterResolution } from '@/core/scenario'
import { SceneExplorer } from '@/ui/components/explore/scene-explorer'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ④探索（ダーク文脈）。目的=手がかり収集／主要アクション=調査ポイント→カード獲得。
// T013: core のシナリオ進行ステートマシンと接続する。調査ポイントは s0-sample の実データを使う。
//
// 2026-09-10(#52/#56・T038): 探索を「背景シーン＋ホットスポット」方式に刷新した。
// `scenario.scenes`(#55/T037で追加された省略可能フィールド)がある場合は SceneExplorer
// (背景シーン・シーンタブ・ホットスポット・アクションシート・調査結果の会話フレーム)を
// 表示し、無い場合は従来どおり本ファイルの一覧のみを表示する(docs/scenario_schema.md §2.5)。
// 「調査ポイント一覧」は scenes の有無に関わらず**常に併設**し、背景に頼らずキーボードのみで
// 全ポイント調査→解決へ進めることを保証する(Issue #56 完了条件・WCAG)。
// scenes・一覧のどちらも同じ dispatch({type:'INVESTIGATE'}) に接続するだけで、core の
// シナリオ進行ステートマシン(src/core/scenario/state.ts)には一切手を入れていない。
//
// 2026-09-11(#52 Phase4.7/#66・T044): ホットスポットを常時不可視にしたため(scene-explorer.tsx)、
// 「調査ポイント一覧」はモバイル(タッチ端末)でも折りたたまず初期表示することが完了条件になった
// (DESIGN.md「探索シーン」節)。本ファイルは元々この一覧を折りたたみ機構なしで常時表示している
// ため、追加のコード変更は不要(デスクトップも同じ常時表示のままでよい、Issue #66)。
// e2e(e2e/s1-playthrough.spec.ts のモバイル幅テスト)でこの前提を回帰確認する。
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
  const scenes = scenario.scenes
  const hasScenes = (scenes?.length ?? 0) > 0
  const investigatedCount = progress.investigatedPointIds.length
  const totalCount = scenario.investigation_points.length

  return (
    <ScreenContainer title="探索">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">判定しています…</p>}
        empty={<p>まだ調査していません。調査ポイントをタップしよう。</p>}
        error={<p className="text-destructive">エラーが発生しました。</p>}
      >
        {hasScenes && scenes && (
          <SceneExplorer
            scenario={scenario}
            scenes={scenes}
            investigatedPointIds={progress.investigatedPointIds}
            ownedCardIds={progress.ownedCardIds}
            onCollect={handleInvestigate}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <h2 id="investigation-point-list-heading" className="font-heading text-lg">
            調査ポイント一覧
          </h2>
          <span className="text-muted-foreground text-sm">
            {investigatedCount}/{totalCount} 件調査済み
          </span>
        </div>
        <ul aria-labelledby="investigation-point-list-heading" className="flex flex-col gap-4">
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
