import { PrimaryAction, SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useScreenState } from '@/ui/state/use-screen-state'

// プレースホルダのマップ一覧。実データは T015 以降（S1〜S3・法務）で接続する。
const PLACEHOLDER_MAPS = ['S1 標的型メール侵入', 'S2 (未確定)', 'S3 (未確定)']

// ②マップ選択（ライト文脈）。目的=事例選択／主要アクション=「マップを選ぶ」。
export function MapSelectScreen() {
  const state = useScreenState()

  return (
    <ScreenContainer title="マップ選択">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">進捗を取得しています…</p>}
        empty={<p>解放済みのマップがまだありません。事件を解決して次のマップを解放しよう。</p>}
        error={<p className="text-destructive">進捗の取得に失敗しました。</p>}
      >
        <ul className="flex flex-col gap-4">
          {PLACEHOLDER_MAPS.map((map) => (
            <li
              key={map}
              className="border-border bg-card flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <span>{map}</span>
              <PrimaryAction to="/intro">マップを選ぶ</PrimaryAction>
            </li>
          ))}
        </ul>
        <SecondaryAction to="/cards">カード図鑑</SecondaryAction>
      </StateFrame>
    </ScreenContainer>
  )
}
