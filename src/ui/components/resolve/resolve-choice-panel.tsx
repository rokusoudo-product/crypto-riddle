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
//
// 2026-09-15(#135・代表決定2026-09-14・#132の未解決の質問7への回答): 相談ボタンに残り回数の
// カウンタアイコン・XP減の警告アイコンを付け、XPバー(ResolveXpBar)をパネル最上部(問いの前)に
// 追加した。カウンタ・警告アイコンはlucide-react(既存依存、DESIGN.md「相談ボタン」節)。
// XPバーをパネルの最上部に置くのは、DESIGN.md「縦長（9:16）の構成」節の「XPバー|選択パネルの
// 上辺」を、横長・縦長どちらの縦積みでも満たすため(resolve-screen.tsx側にXPバー専用の
// レイアウト分岐を増やさない。resolve-xp-bar.tsx冒頭コメント参照)。
import { MessageCircleQuestion, TriangleAlert } from 'lucide-react'
import { type ReactNode, type RefObject, useId } from 'react'

import type { ResolvedExplanation } from '@/ui/lib/explanation'
import { cn } from '@/ui/lib/utils'
import { CONSULT_XP_PENALTY } from '@/ui/store/save-integration'

import { ResolveXpBar } from './resolve-xp-bar'

/**
 * 地の文(直前の正解への一言・誤答の段階解説・相談で開いたヒント)専用のブロック
 * (秘書レビュー2回目・2026-09-15・PR#151指摘の修正、秘書レビュー3回目・PR#152指摘の
 * 修正でさらに改訂)。
 *
 * 問い・選択肢・相談ボタンは常に全体が見えるようにし、伸縮するのはこの地の文の部分だけに
 * する。パネル全体を`max-h`で切り詰めていた実装(相談ボタンが切れる不具合の原因)は撤回し、
 * 可変長になりうるテキストブロック単位で`max-h`+`overflow-y-auto`を掛ける方式にした。
 *
 * 秘書レビュー3回目(2026-09-15・PR#152): 段階解説は学習の中身そのものであり、1行程度の
 * スクロール欄に閉じ込めるのは不可という指摘を受け、優先順位を「1.問い・選択肢・相談ボタン
 * は常に全体表示 → 2.地の文は全文が読める(横長はスクロール無し、縦長も基本は全文表示) →
 * 3.立ち絵の大きさはできるだけ保つ(縦長で場所が足りなければ2を優先し縮んでよい)」に
 * 差し替えた。横長は場所に余裕があるため上限を外し常に全文表示、縦長は基本は全文表示の
 * まま収まるよう、上限を4〜5行相当(24cqh)まで引き上げた(どうしても入らない長さの
 * ときだけ欄内でスクロールする)。立ち絵の縮み具合の実測はPR本文参照。 */
function FreeTextBlock({
  children,
  className,
  role,
  boxOrientation,
}: {
  children: ReactNode
  className?: string
  role?: string
  boxOrientation: 'landscape' | 'portrait'
}) {
  return (
    <div
      role={role}
      className={cn(
        // 横長: 場所に余裕があるため上限を外し、常にスクロール無しで全文表示する
        // (秘書レビュー3回目・PR#152の代表判断)。
        // 縦長: 基本は全文表示のまま収まるよう4〜5行相当(24cqh)を確保し、それでも
        // 入らない長さのときだけ欄内でスクロールする。
        boxOrientation === 'landscape' ? '' : 'max-h-[24cqh] overflow-y-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface ResolveChoicePanelProps {
  className?: string
  /** 背景の箱の向き(#134・秘書レビュー3回目・PR#152)。地の文(FreeTextBlock)の高さの
   * 扱いを横長・縦長で分けるために使う(横長=上限なし、縦長=24cqh)。 */
  boxOrientation: 'landscape' | 'portrait'
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
  /** このままクリアした場合の獲得XP見込み(#135・DESIGN.md「XPバー」節)。
   * save-integration.tsのcomputeClearXpReward(progress)をresolve-screen.tsxが呼んだ結果を
   * そのまま渡す(このパネル自体はXPの計算ロジックを持たない。クリア時に加算されるXPと
   * 必ず一致させるため、計算はsave-integration.ts側の1関数に一本化する)。 */
  estimatedXp: number
  /** 誤答・相談が0回のときの上限値(save-integration.tsのCLEAR_XP_REWARD)。 */
  maxXp: number
}

/** 解決⑤の中央選択パネル(XPバー＋問い＋選択肢＋相談ボタン、DESIGN.md「解決の会話モード」節・
 * 「XPバー」節・#134/#135)。 */
export function ResolveChoicePanel({
  className,
  boxOrientation,
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
  estimatedXp,
  maxXp,
}: ResolveChoicePanelProps) {
  const consultDisabledReasonId = useId()
  const consultRemainingClamped = Math.max(consultRemaining, 0)

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
      {/* XPバー(#135・DESIGN.md「XPバー」節「縦長（9:16）の構成」節「選択パネルの上辺」):
          パネル最上部(問いより前)に置くことで、横長・縦長どちらの縦積みでも「選択パネルの
          上辺」の位置になる(resolve-screen.tsx側にXPバー専用の分岐は増やさない)。 */}
      <ResolveXpBar
        estimatedXp={estimatedXp}
        maxXp={maxXp}
        // 縦長は場所が非常に限られる(#152の優先順位を崩さないこと・#135のスコープ注記)ため、
        // ラベル文+数値の行を省き、バーと数値を1行にまとめて縦の専有を抑える
        // (resolve-xp-bar.tsxのcompact参照。GameTimeBadgeのcompactと同じ考え方)。
        compact={boxOrientation === 'portrait'}
      />

      <p className="font-heading text-sm leading-relaxed sm:text-base">{prompt}</p>

      {priorCorrectReply && (
        // 秘書レビュー(2026-09-15・PR#151)指摘の修正: 枠線・背景付きの箱だと選択肢ボタンと
        // 見分けが付きにくい(押せそうに見える)。会話ウィンドウには表示されない情報のため
        // パネルからは消さず残すが、誤答の段階解説(下記wrongExplanation)と同じ「枠線・背景の
        // 無い地の文」にして、ボタンと明確に区別する。
        // 秘書レビュー2回目(2026-09-15)指摘の修正: 問い・選択肢・相談ボタンは常に全体が
        // 見えるようにし、伸縮するのは地の文(このブロック)だけにする(下記FreeTextBlock参照)。
        <FreeTextBlock boxOrientation={boxOrientation}>
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
        <FreeTextBlock boxOrientation={boxOrientation}>
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold">{wrongExplanation.character}</span>「
            {wrongExplanation.line}」
          </p>
        </FreeTextBlock>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* 相談ボタン(#135・DESIGN.md「相談ボタン」節): 残り回数をカウンタアイコン
              (数字付きバッジ)、XPが減ることを警告アイコン(TriangleAlert)で示す。
              色だけに頼らず、可視テキスト(バッジの数字・「XP-15」表記)でも同じ情報を
              伝え、aria-labelにも「相談する・残りn回・使うとXPが15減る」相当を持たせる
              (WCAG 1.4.1)。0回のときはdisabled(既存のconsultDisabled)のまま、理由の
              表示(下のaria-describedby先の<p>)も維持する。 */}
          <button
            type="button"
            disabled={consultDisabled}
            aria-describedby={consultDisabled ? consultDisabledReasonId : undefined}
            aria-label={`相談する・残り${consultRemainingClamped}回・使うとXPが${CONSULT_XP_PENALTY}減る`}
            onClick={onConsult}
            className="bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:ring-ring inline-flex h-12 min-w-12 items-center gap-2 rounded-lg px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-3 focus-visible:outline-none sm:px-6"
          >
            <span aria-hidden="true" className="relative inline-flex shrink-0 items-center">
              <MessageCircleQuestion className="size-5" />
              <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-xs leading-none font-bold">
                {consultRemainingClamped}
              </span>
            </span>
            <span aria-hidden="true">相談する（残り{consultRemainingClamped}回）</span>
            <span
              aria-hidden="true"
              className="text-warning inline-flex items-center gap-1 text-xs font-semibold"
            >
              <TriangleAlert className="size-3.5" />
              XP−{CONSULT_XP_PENALTY}
            </span>
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
            boxOrientation={boxOrientation}
            className="border-border bg-background/60 rounded-lg border p-2"
          >
            <p className="text-sm">{hintText}</p>
          </FreeTextBlock>
        )}
      </div>
    </div>
  )
}
