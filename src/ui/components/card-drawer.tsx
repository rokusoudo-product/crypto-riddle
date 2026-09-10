// src/ui/components/card-drawer.tsx — 手持ちカードドロワー(#42/T033)。
//
// DESIGN.md「会話フレーム」節: 「カードドロワー: 集めた手持ちカードをいつでも無料で閲覧できる
// 引き出し(会話・選択中も開ける)。相談との違い(閲覧=無料/相談=回数消費)をUIで明示する」。
// spec §8.2「カード閲覧(無料): 探索で集めた手掛かり(カード)は会話中・選択中もいつでも閲覧でき、
// 判断材料にできる。閲覧にコストはかからない」。
//
// `<details>/<summary>` ではなく制御された `<button aria-expanded aria-controls>` +
// 条件付きレンダリングで実装する(jsdom は `<details>` の open/close を DOM 属性としては
// 切り替えるが、`getByText` は閉じた `<details>` の子要素も見つけてしまい「閉じている」ことの
// アサートが `toBeVisible()` 判定に頼らざるを得ず煩雑になるため。ボタンで開閉を明示制御した方が
// キーボード完遂テストの意図がはっきりする)。
//
// is_dummy は正誤を左右する内部データであり UI には一切出さない(旧 card-placement-board.tsx の
// 方針を踏襲。表示すると解答が自明になる)。
import { FileText, Key, Lock, Mail, MessageCircle, Newspaper, ShieldCheck, X } from 'lucide-react'
import { useId, useState } from 'react'

import type { Card, CardType } from '@/core/model'
import { Button } from '@/ui/components/ui/button'

const CARD_TYPE_ICON: Record<CardType, typeof FileText> = {
  証言: MessageCircle,
  ログ: FileText,
  通信記録: Mail,
  外部情報: Newspaper,
  暗号文: Lock,
  鍵: Key,
  対策: ShieldCheck,
}

export interface CardDrawerProps {
  /** 獲得済みカード(ダミーカードを含む。探索で得たものは全て無料で見られる、spec §8.2)。 */
  cards: readonly Card[]
}

/** 手持ちカードを無料でいつでも閲覧できるドロワー(相談=回数消費とは異なることをラベルで明示)。 */
export function CardDrawer({ cards }: CardDrawerProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-12 min-w-12 self-start px-4"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        手持ちカードを見る（無料・{cards.length}枚）
      </Button>
      {open && (
        <div
          id={panelId}
          className="border-border bg-background flex flex-col gap-2 rounded-lg border p-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">手持ちカード</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="手持ちカードを閉じる"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {cards.length === 0 ? (
            <p className="text-muted-foreground text-sm">まだカードを獲得していません。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cards.map((card) => {
                const Icon = CARD_TYPE_ICON[card.type]
                return (
                  <li
                    key={card.id}
                    className="border-border bg-card flex items-start gap-2 rounded-lg border p-3"
                  >
                    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">
                        【{card.type}】{card.source}
                      </span>
                      <span className="text-muted-foreground text-sm">{card.body}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
