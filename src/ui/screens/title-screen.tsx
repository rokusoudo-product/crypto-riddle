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
        {/* citation-policy.md §4「タイトル/README」の包括表記。 */}
        <p className="text-muted-foreground max-w-[60ch] text-xs">
          IPA
          情報処理技術者試験の過去問題を題材の参考として使用しています（設問の転載はありません）。
        </p>
      </StateFrame>
      {/* Issue #81: 作成時点の注意書き。法制度・技術情報が制作時点のものである旨を画面左下に
          小さく表示する（DESIGN.md ①タイトル）。ScreenContainer（min-h-dvh flex flex-col）の
          直接の子として置き、mt-auto で残り高さを吸収して真の左下に固定する（4状態いずれでも
          表示されるよう StateFrame の外に配置）。text-muted-foreground はライト/ダーク両文脈の
          トークン定義済み（index.css）で、色・サイズの直書きはしない。 */}
      <p className="text-muted-foreground mt-auto max-w-[60ch] text-xs">
        本作の内容（法制度・技術情報を含む）は2026年9月時点の情報に基づく学習用の創作です。
      </p>
    </ScreenContainer>
  )
}
