import { SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useScreenState } from '@/ui/state/use-screen-state'

// ⑥失敗解説（ダーク文脈）。
//
// 2026-09-10(#42・T018プレイテスト): 会話モードへの刷新に伴い、誤答時は独立画面(follow_up
// パート)へ遷移せず解決パート内に留まって選択肢のまま再挑戦できるようになったため、この画面は
// 廃止予定(spec §8.2「⑥失敗解説の独立画面は廃止する」)。旧 core ステートマシンの
// follow_up/pendingFollowUp/resumeStage は #42/T032 で撤去済みで、このコンポーネントから
// 参照する状態が無くなったため、暫定的に型エラーだけを解消したスタブに縮小した
// (#44 の PR スコープは core のみ。会話モードUIの実装は #45 / T033 で行う)。
// ルート `/resolve/fail` 自体は #45 で正式に削除するまで残す。
export function FailScreen() {
  const state = useScreenState()

  return (
    <ScreenContainer title="失敗解説">
      <StateFrame state={state}>
        <p className="text-muted-foreground max-w-[60ch]">
          この画面は廃止予定です(#42)。誤答しても解決パート内で選択肢のまま再挑戦できるように
          なったため、失敗解説は会話の中で表示されます(UI実装は #45)。
        </p>
        <SecondaryAction to="/resolve">解決へ戻る</SecondaryAction>
      </StateFrame>
    </ScreenContainer>
  )
}
