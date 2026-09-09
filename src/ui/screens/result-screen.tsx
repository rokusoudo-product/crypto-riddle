import { PrimaryAction, SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useScreenState } from '@/ui/state/use-screen-state'

// ⑦結果（ダーク文脈）。目的=判定・用語・出典／主要アクション=次へ・図鑑。
export function ResultScreen() {
  const state = useScreenState()

  return (
    <ScreenContainer title="結果">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">保存しています…</p>}
        error={<p className="text-destructive">保存に失敗しました。</p>}
      >
        <p>（プレースホルダ）事件を解決した。獲得した用語カードと出典は次のとおり。</p>
        <ul className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4 text-sm">
          <li>用語（プレースホルダ）: フィッシング</li>
          <li className="text-muted-foreground">
            出典（プレースホルダ）: IPA 情報処理安全確保支援士試験 過去問（T015 で接続）
          </li>
        </ul>
        <div className="flex flex-wrap gap-4">
          <PrimaryAction to="/maps">次へ</PrimaryAction>
          <SecondaryAction to="/cards">図鑑</SecondaryAction>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
