import { useState } from 'react'

import { PrimaryAction, SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { useScreenState } from '@/ui/state/use-screen-state'

// ⑥失敗解説（ダーク文脈）。目的=教育的失敗の解説／主要アクション=初動をやり直す・進む。
// 「やり直す」は確認を用意する（DESIGN.md）。ここでの確認状態は画面内 UI のみで完結し、
// core のステートマシン（T013）には接続しない。
export function FailScreen() {
  const state = useScreenState()
  const [confirmingRetry, setConfirmingRetry] = useState(false)

  return (
    <ScreenContainer title="失敗解説">
      <StateFrame state={state}>
        <p className="max-w-[60ch]">
          （プレースホルダ）橘「その初動は危険だ。なぜダメだったのか整理しよう。」
          教育的な解説テキストは T015 でシナリオデータと接続する。
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {confirmingRetry ? (
            <div
              role="alertdialog"
              aria-label="初動をやり直す確認"
              className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
            >
              <p>探索からやり直します。よろしいですか？</p>
              <div className="flex flex-wrap gap-4">
                <PrimaryAction to="/explore">やり直す（探索へ）</PrimaryAction>
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
              onClick={() => setConfirmingRetry(true)}
            >
              初動をやり直す
            </Button>
          )}
          <SecondaryAction to="/result">進む</SecondaryAction>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
