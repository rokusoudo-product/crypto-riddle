import { PrimaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { useScreenState } from '@/ui/state/use-screen-state'

// プレースホルダの調査ポイント。実データ・カード獲得ロジックは T013/T016 で接続する。
const PLACEHOLDER_SPOTS = ['被害者PCのログ', '受信メール', '関係者の証言']

// ④探索（ダーク文脈）。目的=手がかり収集／主要アクション=調査ポイント→カード獲得。
export function ExploreScreen() {
  const state = useScreenState()

  return (
    <ScreenContainer title="探索">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">判定しています…</p>}
        empty={<p>まだ調査していません。調査ポイントをタップしよう。</p>}
        error={<p className="text-destructive">エラーが発生しました。</p>}
      >
        <ul className="flex flex-col gap-4">
          {PLACEHOLDER_SPOTS.map((spot) => (
            <li
              key={spot}
              className="border-border bg-card flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <span>{spot}</span>
              <Button type="button" variant="outline" className="h-12 min-w-12 px-4">
                調査する
              </Button>
            </li>
          ))}
        </ul>
        <PrimaryAction to="/resolve">解決へ進む</PrimaryAction>
      </StateFrame>
    </ScreenContainer>
  )
}
