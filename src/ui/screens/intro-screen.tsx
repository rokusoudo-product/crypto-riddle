import { PrimaryAction, SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useScreenState } from '@/ui/state/use-screen-state'

// ③導入（ダーク文脈）。目的=事件の前提提示／主要アクション=タップで進行・SKIP。
export function IntroScreen() {
  const state = useScreenState()

  return (
    <ScreenContainer title="導入">
      <StateFrame
        state={state}
        error={<p className="text-destructive">シナリオの読込に失敗しました。</p>}
      >
        <p className="max-w-[60ch]">
          （プレースホルダ）霧島「新しい事件だ。状況を整理しよう。」 事件の前提テキストは T015
          でシナリオデータと接続する。
        </p>
        <div className="flex flex-wrap gap-4">
          <PrimaryAction to="/explore">タップで進行</PrimaryAction>
          <SecondaryAction to="/explore">SKIP</SecondaryAction>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
