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
//
// 2026-09-15(代表決定・ヒントダイアログ化): 地の文(直前の正解への一言・誤答の段階解説・相談で
// 開いたヒント・相談使い切りの注意)は、本パネル内の`FreeTextBlock`(旧実装。#134/#152/#154/
// #138で縦長の高さ制約と繰り返し衝突した経緯はgit history参照)からモーダルのヒントダイアログ
// (resolve-hint-dialog.tsx)へ完全に移した。本パネルはXPバー・問い・選択肢・相談ボタン・
// 「解説を見る」ボタンだけの構成にし、地の文は一切表示しない(呼び出し側=resolve-screen.tsxが
// 内容を計算し、ResolveHintDialogへ渡す)。「解説を見る」ボタンは、現在の問いに表示できる
// 内容がある(hasHintContent)ときだけ出し、押すと同じ内容をもう一度開く。
// interactionDisabled(ヒントダイアログ表示中)は選択肢・相談ボタン・「解説を見る」ボタンの
// すべてを無効化する: 呼び出し側がラップするinert属性(実ブラウザでのクリック・フォーカス
// 抑止)と二重の防御。jsdomはinert属性の実効果(pointer-events/フォーカス抑止)を再現しない
// ため、単体テスト(「ダイアログ表示中は選択肢を押せない」)で確実に検証できるよう、disabled
// 属性でも明示的にブロックする(advisor指摘)。
import { BookOpenText, MessageCircleQuestion, TriangleAlert } from 'lucide-react'
import { type RefObject, useId } from 'react'

import { cn } from '@/ui/lib/utils'
import { CONSULT_XP_PENALTY } from '@/ui/store/save-integration'

import { ResolveXpBar } from './resolve-xp-bar'

export interface ResolveChoicePanelProps {
  className?: string
  /** 背景の箱の向き(#134・秘書レビュー3回目・PR#152)。縦長/横長でXPバーのcompact表示等を
   * 切り替えるために使う。 */
  boxOrientation: 'landscape' | 'portrait'
  /** 問い(キャラの台詞、resolution.questions[].prompt)。会話ウィンドウのタイプライターとは
   * 独立した静的テキストとして常に表示する(上記コメント参照)。 */
  prompt: string
  choices: readonly { readonly text: string }[]
  onSelectChoice: (index: number) => void
  consultRemaining: number
  consultDisabled: boolean
  onConsult: () => void
  /** ヒントダイアログに表示できる内容(誤答の段階解説・相談ヒント・相談使い切りの注意・直前の
   * 正解への一言)が現在の問いにあるかどうか(代表決定2026-09-15)。trueのときだけ「解説を見る」
   * ボタンを表示する(resolve-screen.tsxがResolveHintDialogへ渡すentriesと同じ判定を共有する)。 */
  hasHintContent: boolean
  /** 「解説を見る」ボタン押下時に呼ぶ(resolve-screen.tsx側でヒントダイアログをopenにする)。 */
  onOpenHint: () => void
  /** ヒントダイアログ表示中(背景暗転中)は選択肢・相談ボタン・「解説を見る」ボタンをすべて
   * 無効化する(上記コメント参照)。省略時はfalse(無効化しない)。 */
  interactionDisabled?: boolean
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

/** 解決⑤の中央選択パネル(XPバー＋問い＋選択肢＋相談ボタン＋解説を見るボタン、DESIGN.md
 * 「解決の会話モード」節・「XPバー」節・#134/#135/代表決定2026-09-15)。 */
export function ResolveChoicePanel({
  className,
  boxOrientation,
  prompt,
  choices,
  onSelectChoice,
  consultRemaining,
  consultDisabled,
  onConsult,
  hasHintContent,
  onOpenHint,
  interactionDisabled = false,
  firstChoiceRef,
  estimatedXp,
  maxXp,
}: ResolveChoicePanelProps) {
  const consultDisabledReasonId = useId()
  const consultRemainingClamped = Math.max(consultRemaining, 0)
  const isPortrait = boxOrientation === 'portrait'

  return (
    <div
      data-testid="resolve-choice-panel"
      className={cn(
        // コントロールパネル風の半透明パネル(glass-panel、DESIGN.md「半透明（ガラス風）
        // パネル」節)。primaryの枠でコンソールらしさを出す(会話ウィンドウのborder-t-4と
        // 揃え、上下左右を枠で囲む点のみ差別化する)。
        // 縦長のみgap-2に詰める(秘書レビュー4回目・PR#154): パネル内の各要素間の余白を
        // わずかに削って縦の専有を減らす(横長はgap-3 sm:gap-4のまま変更なし)。
        'glass-panel border-primary/60 flex w-full flex-col rounded-lg border p-3 shadow-lg',
        isPortrait ? 'gap-2' : 'gap-3 sm:gap-4 sm:p-4',
        className,
      )}
    >
      {/* XPバー(#135・DESIGN.md「XPバー」節「縦長（9:16）の構成」節「選択パネルの上辺」):
          パネル最上部(問いより前)に置くことで、横長・縦長どちらの縦積みでも「選択パネルの
          上辺」の位置になる(resolve-screen.tsx側にXPバー専用の分岐は増やさない)。 */}
      <ResolveXpBar
        estimatedXp={estimatedXp}
        maxXp={maxXp}
        // 縦長は場所が非常に限られるため、ラベル文+数値の行を省き、バーと数値を1行に
        // まとめて縦の専有を抑える(resolve-xp-bar.tsxのcompact参照。GameTimeBadgeの
        // compactと同じ考え方)。
        compact={boxOrientation === 'portrait'}
      />

      <p className="font-heading text-sm leading-relaxed sm:text-base">{prompt}</p>

      <ul className="flex flex-col gap-2">
        {choices.map((choice, index) => (
          <li key={index}>
            <button
              type="button"
              ref={index === 0 ? firstChoiceRef : undefined}
              disabled={interactionDisabled}
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

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* 相談ボタン(#135・DESIGN.md「相談ボタン」節): 残り回数をカウンタアイコン
              (数字付きバッジ)、XPが減ることを警告アイコン(TriangleAlert)で示す。
              色だけに頼らず、可視テキスト(バッジの数字・「XP-15」表記)でも同じ情報を
              伝え、aria-labelにも「相談する・残りn回・使うとXPが15減る」相当を持たせる
              (WCAG 1.4.1)。0回のとき、またはヒントダイアログ表示中はdisabledにする
              (interactionDisabled、上記コメント参照)。理由の表示(aria-describedby先の
              <p>)は、地の文がダイアログへ移ったことに伴い可視表示は無くしたが、
              aria-describedbyの参照先自体は残す(sr-only、下記参照。相談ボタン単体に
              フォーカスした際もスクリーンリーダーで理由が読めるようにするため)。 */}
          <button
            type="button"
            disabled={consultDisabled || interactionDisabled}
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
            <p id={consultDisabledReasonId} className="sr-only">
              相談はこのマップで使い切りました（マップ単位3回まで）。
            </p>
          )}
          {/* 「解説を見る」ボタン(代表決定2026-09-15): 誤答の段階解説・相談ヒント・相談
              使い切りの注意・直前の正解への一言のいずれかが現在の問いにあるときだけ表示する
              (hasHintContent)。押すとヒントダイアログ(resolve-hint-dialog.tsx)が同じ内容で
              再度開く。 */}
          {hasHintContent && (
            <button
              type="button"
              disabled={interactionDisabled}
              onClick={onOpenHint}
              className="border-border hover:bg-secondary focus-visible:ring-ring inline-flex h-12 min-w-12 items-center gap-2 rounded-lg border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-3 focus-visible:outline-none sm:px-6"
            >
              <BookOpenText aria-hidden="true" className="size-5" />
              解説を見る
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
