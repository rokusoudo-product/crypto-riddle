import { PrimaryAction, SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ⑦結果（ダーク文脈）。目的=判定・用語・出典／主要アクション=次へ・図鑑。
// T013: クリア時の core ステートマシンの内容(clear_explanation・出典)を表示する。
// SaveStorage への保存(クリア時)は store 側(dispatch)で行われるため、ここでは保存状態
// (saveStatus)を確認して保存完了/失敗のフィードバックのみを表示する。
export function ResultScreen() {
  const state = useScreenState()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const saveStatus = useGameStore((s) => s.saveStatus)

  const cleared = progress.part === 'clear'

  return (
    <ScreenContainer title="結果">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">保存しています…</p>}
        error={<p className="text-destructive">保存に失敗しました。</p>}
      >
        {cleared ? (
          <>
            <ul className="flex flex-col gap-3">
              {scenario.resolution.clear_explanation.map((line, index) => (
                <li key={index} className="border-border bg-card rounded-lg border p-3">
                  <span className="font-semibold">{line.character}</span>「{line.line}」
                </li>
              ))}
            </ul>
            <ul className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4 text-sm">
              <li>攻撃手段: {scenario.resolution.attack_identification.attack_name}</li>
              <li>対策: {scenario.resolution.countermeasure.summary}</li>
              {scenario.source.type !== 'original' && (
                <li className="text-muted-foreground">
                  出典: {scenario.source.type}
                  {scenario.source.exam_period ? `(${scenario.source.exam_period})` : ''}
                </li>
              )}
              {scenario.source.note && (
                <li className="text-muted-foreground">{scenario.source.note}</li>
              )}
            </ul>
            {saveStatus === 'error' && (
              <p role="alert" className="text-destructive">
                セーブデータの保存に失敗しました(端末のストレージ容量等をご確認ください)。
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">まだこのマップをクリアしていません。</p>
        )}
        <div className="flex flex-wrap gap-4">
          <PrimaryAction to="/maps">次へ</PrimaryAction>
          <SecondaryAction to="/cards">図鑑</SecondaryAction>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
