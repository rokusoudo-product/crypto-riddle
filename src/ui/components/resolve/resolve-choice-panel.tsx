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
 * 地の文(直前の正解への一言・誤答の段階解説・相談で開いたヒント・相談使い切りの注意)専用の
 * ブロック(秘書レビュー2回目・2026-09-15・PR#151指摘の修正、秘書レビュー3回目・PR#152指摘の
 * 修正、秘書レビュー4回目・PR#154指摘の修正でさらに改訂)。
 *
 * 問い・選択肢・相談ボタン・XPバーは常に全体が見えるようにし、伸縮するのはこの地の文の部分
 * だけにする。パネル全体を`max-h`で切り詰めていた実装(相談ボタンが切れる不具合の原因)は
 * 撤回し、可変長になりうるテキストブロック単位で`max-h`+`overflow-y-auto`を掛ける方式にした。
 *
 * 秘書レビュー3回目(2026-09-15・PR#152): 段階解説は学習の中身そのものであり、1行程度の
 * スクロール欄に閉じ込めるのは不可という指摘を受け、優先順位を「1.問い・選択肢・相談ボタン
 * は常に全体表示 → 2.地の文は全文が読める(横長はスクロール無し、縦長も基本は全文表示) →
 * 3.立ち絵の大きさはできるだけ保つ(縦長で場所が足りなければ2を優先し縮んでよい)」に
 * 差し替えた。横長は場所に余裕があるため上限を外し常に全文表示、縦長は基本は全文表示の
 * まま収まるよう、上限を4〜5行相当(24cqh)まで引き上げた(どうしても入らない長さの
 * ときだけ欄内でスクロールする)。
 *
 * 秘書レビュー4回目(2026-09-15・PR#154): 縦長では、誤答の段階解説・相談ヒント・相談使い切りの
 * 注意が同時に表示される状態で、地の文ブロックがそれぞれ独立に最大24cqhを取っていたため
 * 合計height(最大72cqh超)がパネルを押し上げ、立ち絵がほぼ消える・パネルが右上のボタン群に
 * 重なる不具合が見つかった。縦長のみ、地の文(直前の正解への一言/誤答の段階解説・相談ヒント・
 * 相談使い切りの注意)を本コンポーネント自体を1回だけ使って1つの領域にまとめる方式へ
 * 変更した(ResolveChoicePanel参照。横長は個別ブロックのまま変更なし)。
 *
 * 縦長の上限値(`portraitMaxHeightClassName`、既定7.5cqh=約3行相当): 実測(PR#154本文参照)で
 * 立ち絵の枠を「問い1表示時の高さの50%以上」に保つには、誤答の段階解説1件だけの状態でも
 * 24cqh(旧上限)では余白が足りないことが分かったため、より小さい上限に変更した。1つの文が
 * 上限を超える場合はその領域内でスクロールする(#152の「1つの文だけなら全文が出る」は、
 * 内容が上限に収まる範囲で保たれる。上限自体は縦長の高さ制約から来る妥協点であり、DESIGN.md
 * の優先順位「1.問い・選択肢・相談ボタン→2.地の文→3.立ち絵」に、本PRの必須条件
 * 「立ち絵は50%以上」を両立させるための調整値)。
 *
 * 2026-09-15(#138・秘書レビュー2回目): #138(名前箱を立ち絵の下に追加・立ち絵の高さを
 * `calc(100%-5cqh)`で圧縮)が main へ入ったことで、#154 時点の実測(7.5cqh)では縦長の
 * 誤答後・相談後・相談使い切りのいずれも立ち絵が「問1の50%」をわずかに下回った
 * (実測: 誤答後48.8%・相談後47.6%・使い切り45.7%、PR#155本文参照)。会話ウィンドウ側
 * (誤答時の返答replyの表示)は#138のスコープ外のため調整できず、地の文ブロックの上限を
 * 7.5cqhから5.5cqhへさらに削ることで、立ち絵50%以上(実測52.4%が最小)を確保した。
 * 5.5cqhはtext-xs(縦長の地の文フォントサイズ)で約2行強に相当し、1〜2文程度の説明文なら
 * 折り返し無しで収まる目安(長い説明は欄内スクロールで読める、#152の方針を維持)。 */
function FreeTextBlock({
  children,
  className,
  role,
  boxOrientation,
  portraitMaxHeightClassName = 'max-h-[5.5cqh] overflow-y-auto',
}: {
  children: ReactNode
  className?: string
  role?: string
  boxOrientation: 'landscape' | 'portrait'
  /** 縦長のときに適用する上限クラス(既定12cqh)。個別ブロック用途では使われず(landscapeのみ
   * だったため)、#154の縦長merged region専用に導入した。 */
  portraitMaxHeightClassName?: string
}) {
  return (
    <div
      role={role}
      className={cn(
        // 横長: 場所に余裕があるため上限を外し、常にスクロール無しで全文表示する
        // (秘書レビュー3回目・PR#152の代表判断)。
        // 縦長: 立ち絵50%以上を保つための上限(上記コメント参照)。超える場合のみ欄内で
        // スクロールする。
        boxOrientation === 'landscape' ? '' : portraitMaxHeightClassName,
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
  const isPortrait = boxOrientation === 'portrait'

  // 地の文の中身(秘書レビュー4回目・PR#154): 縦長では1つの領域にまとめて表示するため、
  // ノードを先に組み立てておく(横長は従来どおり個別のFreeTextBlockとしてそのままの位置に
  // 表示する。下記JSX参照)。priorCorrectReplyとwrongExplanationは
  // lastAnswerFeedback.correctがtrue/falseの排他状態から来るため同時には発生しない。
  //
  // 縦長のみtext-xs(DESIGN.mdタイポグラフィのスケール12/14/16/20/24/32の最小段)に縮める
  // (秘書レビュー4回目・PR#154): 立ち絵50%以上の必須条件を満たすための調整(実測はPR本文参照。
  // 横長はtext-smのまま変更なし)。
  const freeTextClass = cn('text-muted-foreground', isPortrait ? 'text-xs leading-snug' : 'text-sm')

  const priorCorrectNode = priorCorrectReply ? (
    <p className={freeTextClass}>{priorCorrectReply}</p>
  ) : null

  const wrongExplanationNode = wrongExplanation ? (
    <p className={freeTextClass}>
      <span className="font-semibold">{wrongExplanation.character}</span>「{wrongExplanation.line}」
    </p>
  ) : null

  // 相談ヒント(秘書レビュー4回目・PR#154指摘の修正=修正3): 枠線・背景付きの箱だと選択肢
  // ボタンと見分けが付きにくい(#152で直した「その通りだ、新人…」と同じ問題)。枠線・背景を
  // やめ、アイコン(相談ボタンと同じMessageCircleQuestion)＋「相談：」の見出しを付けた
  // 地の文にして、選択肢とは明確に区別しつつ読みやすさ(コントラスト)は保つ
  // (text-muted-foregroundはglass-panel上で検証済み、scripts/check-contrast.mjs参照)。
  const hintNode = hintText ? (
    <div role="status" className="flex items-start gap-2">
      <MessageCircleQuestion
        aria-hidden="true"
        className={cn('text-muted-foreground mt-0.5 shrink-0', isPortrait ? 'size-3.5' : 'size-4')}
      />
      <p className={freeTextClass}>
        <span className="font-semibold">相談：</span>
        {hintText}
      </p>
    </div>
  ) : null

  const disabledReasonNode = consultDisabled ? (
    <p id={consultDisabledReasonId} className={freeTextClass}>
      相談はこのマップで使い切りました（マップ単位3回まで）。
    </p>
  ) : null

  return (
    <div
      data-testid="resolve-choice-panel"
      className={cn(
        // コントロールパネル風の半透明パネル(glass-panel、DESIGN.md「半透明（ガラス風）
        // パネル」節)。primaryの枠でコンソールらしさを出す(会話ウィンドウのborder-t-4と
        // 揃え、上下左右を枠で囲む点のみ差別化する)。
        // 縦長のみgap-2に詰める(秘書レビュー4回目・PR#154): 立ち絵50%以上の必須条件を
        // 満たすため、パネル内の各要素間の余白をわずかに削って縦の専有を減らす
        // (横長はgap-3 sm:gap-4のまま変更なし)。
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
        // 縦長は場所が非常に限られる(#152の優先順位を崩さないこと・#135のスコープ注記)ため、
        // ラベル文+数値の行を省き、バーと数値を1行にまとめて縦の専有を抑える
        // (resolve-xp-bar.tsxのcompact参照。GameTimeBadgeのcompactと同じ考え方)。
        compact={boxOrientation === 'portrait'}
      />

      <p className="font-heading text-sm leading-relaxed sm:text-base">{prompt}</p>

      {/* 横長: 従来どおり、直前の正解への一言を選択肢の直前に個別ブロックで表示する
          (秘書レビュー4回目・PR#154「横長は今のまま変えない」)。 */}
      {!isPortrait && priorCorrectNode && (
        <FreeTextBlock boxOrientation={boxOrientation}>{priorCorrectNode}</FreeTextBlock>
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

      {/* 横長: 従来どおり、誤答の段階解説を選択肢の直後に個別ブロックで表示する。 */}
      {!isPortrait && wrongExplanationNode && (
        <FreeTextBlock boxOrientation={boxOrientation}>{wrongExplanationNode}</FreeTextBlock>
      )}

      {/* 縦長(秘書レビュー4回目・PR#154指摘の修正=修正1・修正2): 地の文(直前の正解への
          一言・誤答の段階解説・相談ヒント・相談使い切りの注意)を1つの領域にまとめ、
          合計で12cqh程度に抑える(個別に最大24cqhずつ積み上がっていた旧実装は縦長で
          立ち絵がほぼ消える・パネルが右上のボタン群に重なる不具合の原因だったため、
          1つのFreeTextBlock(内部でoverflow-y-auto)にまとめて合計の縦専有を固定した。
          上限値の実測根拠はFreeTextBlockのコメント参照)。選択肢・相談ボタン・XPバーは
          この領域の外にあるため常に全体が見える。 */}
      {/* 表示順(縦長のみ): hintNode・disabledReasonNodeを先頭に置く。領域が上限を超えて
          スクロール可能になったとき、既定のスクロール位置は先頭(=最新の操作結果)になる
          ようにするため(相談直後にhintNodeが末尾にあると、スクロールしないと見えない
          位置に隠れてしまう不具合を秘書レビュー4回目・PR#154の実機確認で発見)。
          priorCorrectNode/wrongExplanationNodeは前の問い/前回の試行の文脈のため、
          スクロールしないと見えなくても実害が小さい(既に一度表示済みの情報)。 */}
      {isPortrait &&
        (priorCorrectNode || wrongExplanationNode || hintNode || disabledReasonNode) && (
          <FreeTextBlock boxOrientation={boxOrientation} className="flex flex-col gap-1">
            {hintNode}
            {disabledReasonNode}
            {priorCorrectNode}
            {wrongExplanationNode}
          </FreeTextBlock>
        )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* 相談ボタン(#135・DESIGN.md「相談ボタン」節): 残り回数をカウンタアイコン
              (数字付きバッジ)、XPが減ることを警告アイコン(TriangleAlert)で示す。
              色だけに頼らず、可視テキスト(バッジの数字・「XP-15」表記)でも同じ情報を
              伝え、aria-labelにも「相談する・残りn回・使うとXPが15減る」相当を持たせる
              (WCAG 1.4.1)。0回のときはdisabled(既存のconsultDisabled)のまま、理由の
              表示(aria-describedby先の<p>。縦長ではdisabledReasonNodeとして上の
              地の文領域内、横長では直下に表示。id自体はconsultDisabledReasonIdで
              どちらの場合も同じなのでaria-describedbyの参照先は変わらない)も維持する。 */}
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
          {/* 横長: 従来どおり、相談ボタンの直後に理由文を表示する。 */}
          {!isPortrait && disabledReasonNode}
        </div>
        {/* 横長: 従来どおり、ボタン行の下に相談ヒントを個別ブロックで表示する。 */}
        {!isPortrait && hintNode}
      </div>
    </div>
  )
}
