// src/ui/components/resolve/resolve-xp-bar.tsx — 解決⑤のXPバー(#135)。
//
// DESIGN.md「XPバー」節が正本:
// - 解決中、「このままクリアした場合の獲得XP見込み」をバーと数値で表示する。
// - 誤答・相談のたびに更新する。
// - 計算は save-integration.ts の computeClearXpReward()（CLEAR_XP_REWARD - 誤答×
//   WRONG_ANSWER_XP_PENALTY - 相談×CONSULT_XP_PENALTY、下限0）と同じ純粋関数を共有し、
//   クリア時のXPと必ず一致させる(呼び出し側=resolve-screen.tsxがcomputeClearXpRewardを
//   直接呼んでestimatedXpとして渡す。このコンポーネント自体は数値を受け取るだけで、
//   計算ロジックを重複させない)。
// - 数値をテキストでも表示し、支援技術にも伝える(バーの視覚表現だけに頼らない)。
// - 表示位置: DESIGN.md「縦長（9:16）の構成」節の表のとおり「選択パネルの上辺」
//   (横長・縦長とも)。resolve-choice-panel.tsx がパネルの最上部(問いの前)に配置する
//   ことで、横長・縦長どちらの縦積みでも「パネルの上辺」の位置になる
//   (resolve-choice-panel.tsx参照。resolve-screen.tsx側の変更を増やさないため、
//   XPバー専用のレイアウト分岐はresolve-screen.tsxに持たせない)。
//
// 色: success(ネオングリーン)は状態色としてXP等の表示に使う運用(DESIGN.md「カラートークン」節
// 「ネオングリーンはアクセントではなく状態色」)。track地はsecondary(surface-2)、枠はborder。
// いずれもscripts/check-contrast.mjsで検証済みの組み合わせ(surface-2上のsuccess/border)。
//
// compact(#135・秘書レビュー): 縦長(9:16)は場所が非常に限られ(DESIGN.md「縦長（9:16）の構成」
// 節)、誤答の段階解説・相談ヒント・相談使い切りの理由文など地の文が複数同時に表示される場面
// (conversation-frame.tsxのoverlayレイアウト、立ち絵の行がflex-1で縮む形)では、
// XPバーの分もわずかに縦の専有を増やすことになる。conversation-frame.tsxは並行作業中の#138が
// 変更するため#135では触れられない(cf. 呼び出し元resolve-choice-panel.tsxの冒頭コメント)。
// そのため、このコンポーネント自体の縦専有を最小化する`compact`を用意し、縦長ではラベル文の行を
// 省いてバー+数値を1行にまとめる(GameTimeBadgeのcompactと同じ考え方)。フルラベルは
// sr-onlyとして残し、支援技術には従来どおり伝わる。
import { useId } from 'react'

import { cn } from '@/ui/lib/utils'

export interface ResolveXpBarProps {
  /** このままクリアした場合に獲得できるXP見込み(save-integration.tsのcomputeClearXpReward()の
   * 戻り値をそのまま渡す。0〜maxXpの範囲であることは呼び出し側の計算が保証する)。 */
  estimatedXp: number
  /** 誤答・相談が0回のときの上限値(save-integration.tsのCLEAR_XP_REWARD)。 */
  maxXp: number
  /** ラベル文の行を省き、バー+数値を1行にまとめて縦の専有を抑える(縦長向け、上記コメント参照)。
   * フルラベルはsr-onlyとして維持する。 */
  compact?: boolean
  className?: string
}

/** 解決⑤のXPバー(このままクリアした場合の獲得XP見込み、DESIGN.md「XPバー」節・#135)。 */
export function ResolveXpBar({
  estimatedXp,
  maxXp,
  compact = false,
  className,
}: ResolveXpBarProps) {
  // computeClearXpReward()自体が下限0を保証するため通常はclamp不要だが、表示コンポーネント
  // 単体としても不正値(maxXp<estimatedXp等)でバーが100%を超えて描画されない防御を持たせる。
  const clampedXp = Math.min(Math.max(estimatedXp, 0), maxXp)
  const percent = maxXp > 0 ? Math.round((clampedXp / maxXp) * 100) : 0
  const labelId = useId()
  const labelText = 'このままクリアした場合の獲得XP見込み'

  return (
    <div data-testid="resolve-xp-bar" className={cn('flex flex-col gap-1', className)}>
      {compact ? (
        <span id={labelId} className="sr-only">
          {labelText}
        </span>
      ) : (
        <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
          <span id={labelId} className="text-muted-foreground">
            {labelText}
          </span>
          {/* 数値は視覚的にも表示する(バーの視覚表現だけに頼らない、DESIGN.md「XPバー」節)。
              支援技術への値そのものは下のprogressbar(aria-valuetext)が伝えるため、ここは
              aria-hiddenにして二重読み上げを避ける。 */}
          <span className="text-success font-semibold" aria-hidden="true">
            {clampedXp}
            <span className="text-muted-foreground font-normal"> / {maxXp}</span>
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={maxXp}
          aria-valuenow={clampedXp}
          aria-valuetext={`${clampedXp} / ${maxXp}`}
          className="border-border bg-secondary h-2 w-full overflow-hidden rounded-full border"
        >
          <div
            className="bg-success h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        {compact && (
          <span className="text-success shrink-0 text-xs font-semibold" aria-hidden="true">
            {clampedXp}/{maxXp}
          </span>
        )}
      </div>
    </div>
  )
}
