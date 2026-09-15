// src/ui/components/resolve/resolve-choice-panel.tsx — 解決⑤の中央選択パネル(#134)。
//
// DESIGN.md「解決の会話モード（⑤）で背景の箱の中央に載せる選択パネル」節が正本:
// - 配置: 背景の箱の中央に、コントロールパネル風の半透明パネル(glass-panel)を置く。
//   問い＋選択肢＋相談ボタンはこのパネルの中にまとめる(旧「選択肢は下部の会話ウィンドウ内」は
//   撤回・#119の記述を置き換える)。
// - 会話ウィンドウとの役割分担: 下部の会話ウィンドウは台詞(タイプライター)専用にする。
//   会話ログは置かない。誤答時の返答も会話ウィンドウにタイプライターで表示する(このパネルは
//   開いたまま)。そのため本コンポーネントは「問い」をタイプライターではなく静的テキストとして
//   保持し続ける(会話ウィンドウ側が誤答時にline=replyへ切り替わっても、このパネルの問い文は
//   変わらない。呼び出し側=resolve-screen.tsx参照)。
// - 表示タイミング: 問いの全文表示(またはスキップ)後に選択肢・相談ボタンを操作可能にする。
//   全文表示前はパネル自体は表示してよいが、選択肢・相談ボタンは無効状態にする(送り途中の
//   誤操作防止)。呼び出し側が`choicesEnabled`で制御する(全文表示は会話ウィンドウ=
//   ConversationFrameの責務のため、resolve-screen.tsxがonLineRevealedで検知して渡す)。
// - 誤答フィードバック: 選択肢はパネルに残したまま、段階解説(explanations)を話者付きで
//   このパネルに表示する(相手の返答=replyは会話ウィンドウ側、上記役割分担参照)。
// - 選択肢の5状態: 通常/ホバー/フォーカス/押下/無効(index.cssの`resolve-choice`ユーティリティ、
//   ホバーとキーボードのフォーカスで同じネオン光彩、prefers-reduced-motionでは光彩の
//   アニメーションのみ止める)。各48px以上・素の<button>・Tab/Enter/Spaceで完遂できる。
//
// shadcn Buttonのoutline variantは使わない(#133で判明したdark:bg-input/30の上書き問題を
// 避けるため、index.cssのresolve-choiceユーティリティコメント参照)。
import { type RefObject, useId } from 'react'

import type { ResolvedExplanation } from '@/ui/lib/explanation'
import { cn } from '@/ui/lib/utils'

export interface ResolveChoicePanelProps {
  className?: string
  /** 問い(キャラの台詞、resolution.questions[].prompt)。会話ウィンドウのタイプライターとは
   * 独立した静的テキストとして常に表示する(上記コメント参照)。 */
  prompt: string
  /** 直前の問いの正解時の一言(あれば)。新しい問いの上に一言添える(#42/#46からの既存挙動)。 */
  priorCorrectReply?: string | null
  choices: readonly { readonly text: string }[]
  /** 問いの全文表示(またはスキップ)が完了するまでfalse(選択肢・相談ボタンを無効にする)。 */
  choicesEnabled: boolean
  onSelectChoice: (index: number) => void
  /** 誤答時の段階解説(話者付き)。相手の返答(reply)は会話ウィンドウ側で表示するため、
   * このパネルには含めない(役割分担、上記コメント参照)。 */
  wrongExplanation?: ResolvedExplanation | null
  consultRemaining: number
  consultDisabled: boolean
  onConsult: () => void
  /** 相談で開いたヒント(あれば)。 */
  hintText?: string | null
  /** 問いの全文表示が完了した瞬間、キーボード操作の流れを保つため最初の選択肢へフォーカスを
   * 移すための参照(resolve-screen.tsx参照)。 */
  firstChoiceRef?: RefObject<HTMLButtonElement | null>
}

/** 解決⑤の中央選択パネル(問い＋選択肢＋相談ボタン、DESIGN.md「解決の会話モード」節・#134)。 */
export function ResolveChoicePanel({
  className,
  prompt,
  priorCorrectReply,
  choices,
  choicesEnabled,
  onSelectChoice,
  wrongExplanation,
  consultRemaining,
  consultDisabled,
  onConsult,
  hintText,
  firstChoiceRef,
}: ResolveChoicePanelProps) {
  const disabledReasonId = useId()
  const consultDisabledReasonId = useId()

  return (
    <div
      data-testid="resolve-choice-panel"
      className={cn(
        // コントロールパネル風の半透明パネル(glass-panel、DESIGN.md「半透明（ガラス風）
        // パネル」節)。primaryの枠でコンソールらしさを出す(会話ウィンドウのborder-t-4と
        // 揃え、上下左右を枠で囲む点のみ差別化する)。
        'glass-panel border-primary/60 flex w-full flex-col gap-3 rounded-lg border p-3 shadow-lg sm:gap-4 sm:p-4',
        className,
      )}
    >
      <p className="font-heading text-sm leading-relaxed sm:text-base">{prompt}</p>

      {priorCorrectReply && (
        <p className="border-border bg-background/60 rounded-lg border p-2 text-sm">
          {priorCorrectReply}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {choices.map((choice, index) => (
          <li key={index}>
            <button
              type="button"
              ref={index === 0 ? firstChoiceRef : undefined}
              disabled={!choicesEnabled}
              aria-describedby={!choicesEnabled ? disabledReasonId : undefined}
              onClick={() => onSelectChoice(index)}
              className={cn(
                'resolve-choice h-auto min-h-12 w-full rounded-lg px-4 py-3 text-left text-sm leading-relaxed whitespace-normal sm:text-base',
              )}
            >
              {choice.text}
            </button>
          </li>
        ))}
      </ul>
      {!choicesEnabled && (
        <p id={disabledReasonId} className="sr-only">
          問いの表示が終わるまで選択できません。
        </p>
      )}

      {wrongExplanation && (
        <p className="text-muted-foreground text-sm">
          <span className="font-semibold">{wrongExplanation.character}</span>「
          {wrongExplanation.line}」
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* 相談ボタン: 位置をパネル内へ移すのみ(#134スコープ)。見た目の刷新(残数の
              カウンタアイコン・XP警告アイコン等)は#135の範囲のため入れない。 */}
          <button
            type="button"
            disabled={consultDisabled || !choicesEnabled}
            aria-describedby={consultDisabled ? consultDisabledReasonId : undefined}
            onClick={onConsult}
            className="bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:ring-ring h-12 min-w-12 rounded-lg px-6 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-3 focus-visible:outline-none"
          >
            相談する（残り{Math.max(consultRemaining, 0)}回・XP減）
          </button>
          {consultDisabled && (
            <p id={consultDisabledReasonId} className="text-muted-foreground text-sm">
              相談はこのマップで使い切りました（マップ単位3回まで）。
            </p>
          )}
        </div>
        {hintText && (
          <p role="status" className="border-border bg-background/60 rounded-lg border p-2 text-sm">
            {hintText}
          </p>
        )}
      </div>
    </div>
  )
}
