import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ⑥失敗解説（ダーク文脈）。目的=教育的失敗の解説／主要アクション=初動をやり直す・進む。
// 「やり直す」は確認を用意する（DESIGN.md）。T013: RESUME_FROM_FOLLOW_UP で core の
// ステートマシンへ復帰させ、誤答したステージから解決パートを再開する。
export function FailScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)
  const [confirmingRetry, setConfirmingRetry] = useState(false)

  function handleRetry() {
    const next = dispatch({ type: 'RESUME_FROM_FOLLOW_UP' })
    if (next.part === 'resolution') navigate('/resolve')
  }

  return (
    <ScreenContainer title="失敗解説">
      <StateFrame state={state}>
        {progress.part === 'follow_up' && progress.pendingFollowUp ? (
          <p className="max-w-[60ch]">
            <span className="font-semibold">{progress.pendingFollowUp.character}</span>「
            {progress.pendingFollowUp.line}」
          </p>
        ) : (
          <p className="text-muted-foreground max-w-[60ch]">
            表示できる失敗解説がありません。解決パートからやり直してください。
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {confirmingRetry ? (
            <div
              role="alertdialog"
              aria-label="初動をやり直す確認"
              className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
            >
              <p>探索からやり直します。よろしいですか？</p>
              <div className="flex flex-wrap gap-4">
                <Button
                  type="button"
                  className="h-12 min-w-12 px-6 text-base"
                  onClick={handleRetry}
                >
                  やり直す
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 min-w-12 px-6"
                  onClick={() => setConfirmingRetry(false)}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              className="h-12 min-w-12 px-6 text-base"
              disabled={progress.part !== 'follow_up'}
              onClick={() => setConfirmingRetry(true)}
            >
              初動をやり直す
            </Button>
          )}
          {/* 誤答から結果画面へ直接進む経路は core のステートマシンに存在しない
              (spec の単一解・厳密一致に基づき、必ずやり直しが必要)。
              代わりに離脱先としてマップ選択への導線を用意する。 */}
          <SecondaryAction to="/maps">マップ選択に戻る</SecondaryAction>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
