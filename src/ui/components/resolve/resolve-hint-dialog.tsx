// src/ui/components/resolve/resolve-hint-dialog.tsx — 解決⑤のヒントダイアログ(代表決定
// 2026-09-15)。誤答の段階解説・相談ヒント・相談使い切りの注意・直前の正解への一言(地の文)を、
// 選択肢の上に重ねるモーダルへ移した。
//
// 旧実装(resolve-choice-panel.tsxのFreeTextBlock、#134/#152/#154/#138で調整を重ねた)は
// パネル内に常時表示していたが、縦長の箱では地の文の表示欄が2行程度しか確保できず、学習の
// 中身そのものである段階解説が読み切れない問題が繰り返し発覚した(#154/#138の経緯、
// resolve-choice-panel.tsxのFreeTextBlockのJSDoc参照・本PRで削除)。代表は「文章欄を狭めて
// 立ち絵を守る」方式をやめ、地の文を選択肢の上に重ねるモーダルへ完全に切り出す方式へ転換した
// (これにより、モーダル表示中は常に画面全体の高さを使って全文を表示できる。長文のみ内部で
// スクロールする)。
//
// 開閉(呼び出し側=resolve-screen.tsx): 誤答直後・相談直後(使い切り時も同じ導線)・正解直後
// (次の問いが表示される前)に自動で開く。「解説を見る」ボタン(resolve-choice-panel.tsx)は
// 同じ内容をもう一度開くだけで、内容自体は呼び出し側が現在の問いの状態から都度計算する
// (蓄積用のstateはこのコンポーネントも呼び出し側も持たない=現在の状態から導出するだけ)。
// 閉じる: dialog.tsxのDialogContentが閉じるボタン(48px以上)とEscapeの両方を提供し、閉じると
// 直前にフォーカスのあった要素へ戻る(Radix Dialogの既定動作)。
//
// 背景の暗転・操作不能化(代表決定2026-09-15「背景のダイアログ表示中の扱い」): Dialog.Overlay
// (dialog.tsx)がindex.cssの`scrim`ユーティリティ(background token×alpha 0.7)で下層を覆う。
// 下層(選択パネル・会話ウィンドウ・立ち絵・右上の時刻/手持ちカード)の操作・フォーカス不可化は
// 呼び出し側(resolve-screen.tsx)がinert属性で行う(判断・理由はresolve-screen.tsxのコメント・
// PR本文「代表指示（2026-09-15）で追加した範囲」節参照: 右上ボタン群も含めて暗転・操作不可に
// した。RadixのDialog既定(modal=true)はbodyへpointer-events:noneとaria-hidden(hideOthers)を
// 掛けるため、右上だけ操作可能にする実装はaria-modal="true"のフォーカストラップと両立しない)。
import type { ReactNode, RefObject } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/ui/components/ui/dialog'

export interface ResolveHintDialogEntry {
  /** 見出しに使う話者名、または「相談」等の分類名(代表決定2026-09-15「見出しに話者を示す」)。 */
  heading: string
  node: ReactNode
}

export interface ResolveHintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: readonly ResolveHintDialogEntry[]
  /**
   * 閉じたときにフォーカスを戻す先(代表決定2026-09-15「閉じると直前にフォーカスのあった
   * 要素へ戻る」)。Radixの既定動作(ダイアログを開いた瞬間にフォーカスがあった要素へ戻す)を
   * 使わず、常にこのrefへ明示的に戻す(resolve-screen.tsxからfirstChoiceRefを渡す)。
   * 理由: 開いた瞬間にフォーカスがあった要素(誤答した選択肢・相談ボタン等)は、
   * resolve-choice-panel.tsxのinteractionDisabledによってダイアログの表示と同じ
   * 描画コミット内でdisabledになる。disabled化された要素はブラウザ仕様上その場でblurされ
   * documentへフォーカスが落ちるため、Radixがマウント時に捕捉する「直前の要素」は既に
   * document.bodyになっており、既定動作のままでは閉じてもフォーカスがbodyのまま
   * (=Tabがページ先頭からやり直しになる)になってしまう(advisor指摘・実機/jsdom両方で確認)。
   * 常に選択パネルの最初の選択肢へ戻すことで、正解時(次の問いへ進む場合、選択肢の中身が
   * 入れ替わる)も含めて一貫した・キーボード操作を継続できる着地点にする。
   */
  restoreFocusRef?: RefObject<HTMLElement | null>
}

/** 解決⑤のヒントダイアログ本体。entriesが空のときは何も開かない(呼び出し側の実装ミスで
 * 空のままopen=trueにされても、内容の無いダイアログ+背景inertで画面が固まるロックアウトに
 * ならないよう、ここでも二重に防御する)。 */
export function ResolveHintDialog({
  open,
  onOpenChange,
  entries,
  restoreFocusRef,
}: ResolveHintDialogProps) {
  if (entries.length === 0) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="text-sm sm:text-base"
        onCloseAutoFocus={(event) => {
          if (!restoreFocusRef?.current) return
          event.preventDefault()
          restoreFocusRef.current.focus()
        }}
      >
        <DialogTitle>解説</DialogTitle>
        <div className="flex flex-col gap-3 sm:gap-4">
          {entries.map((entry, index) => (
            <div key={index} className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs font-semibold sm:text-sm">
                {entry.heading}
              </p>
              <div className="leading-relaxed">{entry.node}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
