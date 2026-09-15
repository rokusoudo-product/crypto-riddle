// src/ui/components/resolve/resolve-choice-panel.tsx — 解決⑤の中央選択パネル(#134)。
//
// DESIGN.md「解決の会話モード（⑤）で背景の箱の中央に載せる選択パネル」節が正本:
// - 配置: 背景の箱の中央に、コントロールパネル風の半透明パネル(glass-panel)を置く。
//   問い＋選択肢＋相談ボタンはこのパネルの中にまとめる(旧「選択肢は下部の会話ウィンドウ内」は
//   撤回・#119の記述を置き換える)。
// - 会話ウィンドウとの役割分担: 下部の会話ウィンドウは台詞(タイプライター)専用にする。
//   会話ログは置かない。誤答時の返答も会話ウィンドウにタイプライターで表示する(このパネルは
//   開いたまま)。そのため本コンポーネントは「問い」をタイプライターではなく静的テキストとして
//   保持し続ける(呼び出し側=resolve-screen.tsx参照)。
// - 問いの文は本パネルだけに出す(代表決定2026-09-15・秘書レビュー2回目・PR#151)。会話
//   ウィンドウには問いの文を出さない(resolution.questions[]スキーマに前置きの台詞フィールドが
//   無く、台本の新規追加は代表承認が要るため書き起こさない。会話ウィンドウは話者名(NamePlate)
//   のみ表示し本文は空にする案を採用。他の案はPR本文参照)。
// - 表示タイミング: 選択肢・相談ボタンは常に操作可能(2026-09-15・秘書レビュー2回目・PR#151で
//   撤回)。旧実装は「問いの全文表示(またはスキップ)後」までchoicesEnabledで無効化していたが、
//   これは会話ウィンドウで問いをタイプライター表示していた頃の「送り途中の誤操作防止」の
//   ためのゲートだった。問いの文を会話ウィンドウに出さなくなった(代表決定2026-09-15)ことで
//   この問いの見出しはもとから静的テキスト(タイプライターなし)であり、ゲートの前提が無く
//   なったため撤回した(resolve-screen.tsx参照)。
// - 誤答フィードバック: 選択肢はパネルに残したまま、段階解説(explanations)を話者付きで
//   このパネルに表示する(相手の返答=replyは会話ウィンドウ側、上記役割分担参照)。
// - 選択肢の5状態: 通常/ホバー/フォーカス/押下/無効(index.cssの`resolve-choice`ユーティリティ、
//   ホバーとキーボードのフォーカスで同じネオン光彩、prefers-reduced-motionでは光彩の
//   アニメーションのみ止める)。各48px以上・素の<button>・Tab/Enter/Spaceで完遂できる。
//
// shadcn Buttonのoutline variantは使わない(#133で判明したdark:bg-input/30の上書き問題を
// 避けるため、index.cssのresolve-choiceユーティリティコメント参照)。
import { type ReactNode, type RefObject, useId } from 'react'

import type { ResolvedExplanation } from '@/ui/lib/explanation'
import { cn } from '@/ui/lib/utils'

/**
 * 地の文(直前の正解への一言・誤答の段階解説・相談で開いたヒント)専用のブロック
 * (秘書レビュー2回目・2026-09-15・PR#151指摘の修正)。
 *
 * 問い・選択肢・相談ボタンは縦長でパネルの高さに上限を付けても常に全体が見えるようにし、
 * 伸縮するのはこの地の文の部分だけにする。パネル全体を`max-h`で切り詰めていた前回の実装
 * (相談ボタンが切れる不具合の原因)は撤回し、可変長になりうるテキストブロック単位で
 * `max-h`+`overflow-y-auto`を掛ける方式に変更した。
 *
 * 3cqh(縦長390×844の実機計測で約20px、本文1行の半分程度)という小さい値にしている理由:
 * 問い＋選択肢3個＋相談ボタン(常時全体表示・実測約47cqh)に加え、誤答時は会話ウィンドウの
 * 返答(reply)もタイプライター表示で伸びる(#124の既存設計により会話ウィンドウは`shrink-0`
 * で縮めない)。縦長の箱の高さ予算(100cqh)から右上ボタンのオフセット・返答表示中の会話
 * ウィンドウ・立ち絵の取り分を差し引くと、この地の文ブロックに残せる余裕は数cqh程度しか
 * 無い(秘書レビュー2回目・PR#151の実測値参照)。「場所が足りない場合は地の文の上限を
 * 小さくする」(代表・秘書了承済み)の対応として、常にスクロール前提の値まで詰めている。 */
function FreeTextBlock({
  children,
  className,
  role,
}: {
  children: ReactNode
  className?: string
  role?: string
}) {
  return (
    <div role={role} className={cn('max-h-[3cqh] overflow-y-auto', className)}>
      {children}
    </div>
  )
}

export interface ResolveChoicePanelProps {
  className?: string
  /** 問い(キャラの台詞、resolution.questions[].prompt)。会話ウィンドウのタイプライターとは
   * 独立した静的テキストとして常に表示する(上記コメント参照)。 */
  prompt: string
  /** 直前の問いの正解時の一言(あれば)。新しい問いの上に一言添える(#42/#46からの既存挙動)。 */
  priorCorrectReply?: string | null
  choices: readonly { readonly text: string }[]
  onSelectChoice: (index: number) => void
  /** 誤答時の段階解説(話者付き)。相手の返答(reply)は会話ウィンドウ側で表示するため、
   * このパネルには含めない(役割分担、上記コメント参照)。 */
  wrongExplanation?: ResolvedExplanation | null
  consultRemaining: number
  consultDisabled: boolean
  onConsult: () => void
  /** 相談で開いたヒント(あれば)。 */
  hintText?: string | null
  /** 新しい問いが表示されるたびに最初の選択肢へフォーカスを移すための参照
   * (resolve-screen.tsx参照)。 */
  firstChoiceRef?: RefObject<HTMLButtonElement | null>
}

/** 解決⑤の中央選択パネル(問い＋選択肢＋相談ボタン、DESIGN.md「解決の会話モード」節・#134)。 */
export function ResolveChoicePanel({
  className,
  prompt,
  priorCorrectReply,
  choices,
  onSelectChoice,
  wrongExplanation,
  consultRemaining,
  consultDisabled,
  onConsult,
  hintText,
  firstChoiceRef,
}: ResolveChoicePanelProps) {
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
        // 秘書レビュー(2026-09-15・PR#151)指摘の修正: 枠線・背景付きの箱だと選択肢ボタンと
        // 見分けが付きにくい(押せそうに見える)。会話ウィンドウには表示されない情報のため
        // パネルからは消さず残すが、誤答の段階解説(下記wrongExplanation)と同じ「枠線・背景の
        // 無い地の文」にして、ボタンと明確に区別する。
        // 秘書レビュー2回目(2026-09-15)指摘の修正: 問い・選択肢・相談ボタンは常に全体が
        // 見えるようにし、伸縮するのは地の文(このブロック)だけにする(下記FreeTextBlock参照)。
        <FreeTextBlock>
          <p className="text-muted-foreground text-sm">{priorCorrectReply}</p>
        </FreeTextBlock>
      )}

      <ul className="flex flex-col gap-2">
        {choices.map((choice, index) => (
          <li key={index}>
            <button
              type="button"
              ref={index === 0 ? firstChoiceRef : undefined}
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

      {wrongExplanation && (
        <FreeTextBlock>
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold">{wrongExplanation.character}</span>「
            {wrongExplanation.line}」
          </p>
        </FreeTextBlock>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* 相談ボタン: 位置をパネル内へ移すのみ(#134スコープ)。見た目の刷新(残数の
              カウンタアイコン・XP警告アイコン等)は#135の範囲のため入れない。 */}
          <button
            type="button"
            disabled={consultDisabled}
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
          <FreeTextBlock
            role="status"
            className="border-border bg-background/60 rounded-lg border p-2"
          >
            <p className="text-sm">{hintText}</p>
          </FreeTextBlock>
        )}
      </div>
    </div>
  )
}
