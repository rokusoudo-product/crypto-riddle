import { PrimaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useScreenState } from '@/ui/state/use-screen-state'

// プレースホルダのカード・スロット。ドラッグ&タップ配置（dnd-kit）は T014 で接続する。
const PLACEHOLDER_SLOTS = ['暗号', '特定', '対策']

// ⑤解決（ダーク文脈）。目的=攻撃手段の特定／主要アクション=カードをスロットへ配置→確定。
// 単一解・厳密一致（spec #7）。誤答フィードバックは StateFrame の error 状態で確認できる。
export function ResolveScreen() {
  const state = useScreenState()

  return (
    <ScreenContainer title="解決">
      <StateFrame
        state={state}
        error={
          <>
            <p className="text-destructive">
              誤答フィードバック（プレースホルダ）: 手がかりを見直そう。
            </p>
            <PrimaryAction to="/resolve/fail">初動をやり直す</PrimaryAction>
          </>
        }
      >
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLACEHOLDER_SLOTS.map((slot) => (
            <li
              key={slot}
              className="border-border bg-card flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center"
            >
              <span className="text-muted-foreground text-sm">{slot}スロット</span>
              <span className="text-muted-foreground text-xs">カードをここへ配置</span>
            </li>
          ))}
        </ul>
        <PrimaryAction to="/result">確定</PrimaryAction>
      </StateFrame>
    </ScreenContainer>
  )
}
