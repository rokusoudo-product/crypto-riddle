// src/ui/screens/navigation.ts — T013: ScenarioProgressState(core) から対応する画面パスを導く。
// 各画面が「今の進行状況ならどの URL にいるべきか」を判定するための小さな純関数。
// ui→core の一方向依存(plan.md §2)を守りつつ、ルーティング(react-router-dom)は ui 側だけの関心事として扱う。
import type { ScenarioProgressState } from '@/core/scenario'

export function routeForProgress(progress: ScenarioProgressState): string {
  switch (progress.part) {
    case 'intro':
      return '/intro'
    case 'exploration':
      return '/explore'
    case 'resolution':
      return '/resolve'
    case 'clear':
      return '/result'
    default: {
      const exhaustiveCheck: never = progress.part
      throw new Error(`未対応の part です: ${String(exhaustiveCheck)}`)
    }
  }
}
