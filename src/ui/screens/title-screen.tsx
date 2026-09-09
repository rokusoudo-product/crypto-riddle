import { useEffect } from 'react'

import { PrimaryAction, SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ①タイトル（ライト文脈）。目的=起動・導線／主要アクション=「つづきから」。
export function TitleScreen() {
  const state = useScreenState()
  const saveStatus = useGameStore((s) => s.saveStatus)
  const hydrate = useGameStore((s) => s.hydrate)

  // 起動時にセーブデータを読み込む(plan.md §6「起動時に読込」)。?state= プレビューが
  // 指定されている間は実データ読込の結果で上書きしない(state はここでは分岐のみに使い、
  // 表示は既存の useScreenState() 側に委ねる)。
  useEffect(() => {
    if (saveStatus === 'idle') void hydrate()
  }, [saveStatus, hydrate])

  return (
    <ScreenContainer title="crypto-riddle">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">セーブデータを読み込んでいます…</p>}
        empty={
          <>
            <p>セーブデータがありません。</p>
            <PrimaryAction to="/maps">はじめから</PrimaryAction>
          </>
        }
        error={
          <>
            <p className="text-destructive">セーブデータの読込に失敗しました。</p>
            <SecondaryAction to="/">もう一度試す</SecondaryAction>
          </>
        }
      >
        <p className="text-muted-foreground max-w-[60ch]">
          静かで硬派な推理アドベンチャー。事件現場の緊張感の中で、暗号と情報セキュリティの知識を手がかりに真相へ迫る。
        </p>
        <div className="flex flex-wrap gap-4">
          <PrimaryAction to="/maps">つづきから</PrimaryAction>
          <SecondaryAction to="/cards">カード図鑑</SecondaryAction>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
