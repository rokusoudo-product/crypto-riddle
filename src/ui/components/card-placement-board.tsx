// src/ui/components/card-placement-board.tsx — T014: カード配置インタラクション。
//
// DESIGN.md「インタラクション・アクセシビリティ」:
// - タップ配置が第一操作(カードをタップ→スロットをタップ)。ドラッグ(dnd-kit)は補助操作
// - タップ/クリック対象 最低48×48px
// - キーボードのみでもカード選択・配置・確定まで完遂できること
// - 色だけで情報を伝えない: カード種別は色+アイコン+ラベルで区別する
//
// dnd-kit の KeyboardSensor は不使用: KeyboardSensor はドラッグ対象自身の Space/Enter keydown を
// 「つかむ」操作として奪う(dnd-kit 標準の挙動)。本コンポーネントはタップ操作(第一操作)を
// 素の <button> の onClick(Enter/Space で自然に発火)で実装しているため、同じ要素に
// KeyboardSensor を有効化すると Space が dnd-kit のドラッグ開始に奪われ、タップ選択の
// キーボード操作(Enter/Space で選択)と衝突する(実装時に RTL テストで確認)。
// そのため sensors は PointerSensor(ポインタ操作の補助ドラッグ)のみを有効化し、
// キーボードでの完遂は dnd-kit を経由しない素の <button> セマンティクスに一本化する。
//
// カード種別アイコンの正式デザインは DESIGN.md「アセット」節のとおり Issue #30 で確定する
// (SVG 予定・未定)。本 PR ではスコープ外のため、既存依存の lucide-react アイコンを
// 暫定プレースホルダとして使う(画像生成は行わない。IMAGE_WORKFLOW.md 対象外の code-only アイコン)。
//
// is_dummy は正誤を左右する内部データであり UI には一切出さない(表示すると解答が自明になる)。
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Check,
  FileText,
  Key,
  Lock,
  Mail,
  MessageCircle,
  Newspaper,
  ShieldCheck,
} from 'lucide-react'
import { useId } from 'react'

import type { Card, CardType } from '@/core/model'
import { Button } from '@/ui/components/ui/button'
import { cn } from '@/ui/lib/utils'

import { useCardPlacement } from '../hooks/use-card-placement'

const CARD_TYPE_ICON: Record<CardType, typeof FileText> = {
  証言: MessageCircle,
  ログ: FileText,
  通信記録: Mail,
  外部情報: Newspaper,
  暗号文: Lock,
  鍵: Key,
  対策: ShieldCheck,
}

const CARD_ID_PREFIX = 'card-placement-card:'
const SLOT_ID_PREFIX = 'card-placement-slot:'
const POOL_DROPPABLE_ID = 'card-placement-pool'

function toDragId(cardId: string): string {
  return `${CARD_ID_PREFIX}${cardId}`
}

function toSlotDroppableId(slotIndex: number): string {
  return `${SLOT_ID_PREFIX}${slotIndex}`
}

function parseSlotIndex(droppableId: string): number | null {
  if (!droppableId.startsWith(SLOT_ID_PREFIX)) return null
  const index = Number(droppableId.slice(SLOT_ID_PREFIX.length))
  return Number.isInteger(index) ? index : null
}

function parseCardId(dragId: string): string | null {
  if (!dragId.startsWith(CARD_ID_PREFIX)) return null
  return dragId.slice(CARD_ID_PREFIX.length)
}

interface CardChipProps {
  card: Card
  selected: boolean
  onTap: () => void
  draggableId: string
}

/** プール・スロットの両方で使うカード本体の表示(タップ選択の見た目はアイコン+テキストで示し、色だけに頼らない)。 */
function CardChip({ card, selected, onTap, draggableId }: CardChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { cardId: card.id },
  })
  const Icon = CARD_TYPE_ICON[card.type]

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'border-border bg-card flex min-h-12 w-full items-start gap-2 rounded-lg border p-3 text-left',
        'focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none',
        selected && 'border-primary ring-primary ring-2',
        isDragging && 'opacity-50',
      )}
      {...attributes}
      {...listeners}
      aria-pressed={selected}
      onClick={onTap}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold">
          【{card.type}】{card.source}
        </span>
        <span className="text-muted-foreground text-sm">{card.body}</span>
      </span>
      {selected && (
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold">
          <Check aria-hidden="true" className="size-4" />
          選択中
        </span>
      )}
    </button>
  )
}

interface SlotBoxProps {
  index: number
  card: Card | null
  onTap: () => void
}

function SlotBox({ index, card, onTap }: SlotBoxProps) {
  const { setNodeRef, isOver } = useDroppable({ id: toSlotDroppableId(index) })
  const Icon = card ? CARD_TYPE_ICON[card.type] : null

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'flex min-h-24 flex-col gap-1 rounded-lg border border-dashed p-3',
        card ? 'border-border bg-card border-solid' : 'border-border',
        isOver && 'border-primary',
      )}
    >
      <span className="text-muted-foreground text-xs">スロット{index + 1}</span>
      <button
        type="button"
        onClick={onTap}
        aria-label={
          card
            ? `スロット${index + 1}: ${card.type}「${card.source}」を配置解除する`
            : `スロット${index + 1}(空)へ配置する`
        }
        className={cn(
          'focus-visible:ring-ring flex min-h-12 flex-1 items-center gap-2 rounded-md px-2 text-left focus-visible:ring-3 focus-visible:outline-none',
        )}
      >
        {card && Icon ? (
          <>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="text-sm">
              【{card.type}】{card.source}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">カードをここへ配置</span>
        )}
      </button>
    </li>
  )
}

export interface CardPlacementBoardProps {
  /** プールに並べる候補カード(このステージで選べるカード全体。owned のうち未配置分がプールに表示される)。 */
  cards: readonly Card[]
  /** スロット数(通常 required_card_ids.length)。 */
  slotCount: number
  /** 確定ボタンの押下ハンドラ。配置済みカードID(スロット順)を渡す。 */
  onConfirm: (cardIds: string[]) => void
  confirmLabel?: string
}

/**
 * カード配置ボード本体。タップ配置(第一操作)+ dnd-kit ドラッグ(補助操作)の両方に対応する。
 * 判定(judgeCardSelection)は順序を問わない集合比較のため、スロットの位置自体に意味はないが、
 * DESIGN.md の「スロットへ配置」という操作感に合わせて位置的な UI を維持する。
 */
export function CardPlacementBoard({
  cards,
  slotCount,
  onConfirm,
  confirmLabel = '確定',
}: CardPlacementBoardProps) {
  const cardsById = new Map(cards.map((card) => [card.id, card]))
  const placement = useCardPlacement(
    cards.map((c) => c.id),
    slotCount,
  )
  const headingId = useId()
  const { setNodeRef: setPoolNodeRef, isOver: isOverPool } = useDroppable({ id: POOL_DROPPABLE_ID })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const cardId = parseCardId(String(event.active.id))
    if (!cardId || !event.over) return
    const overId = String(event.over.id)
    if (overId === POOL_DROPPABLE_ID) {
      placement.moveCardToPool(cardId)
      return
    }
    const slotIndex = parseSlotIndex(overId)
    if (slotIndex !== null) placement.moveCardToSlot(cardId, slotIndex)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 id={`${headingId}-slots`} className="text-sm font-semibold">
            スロット({placement.placedCardIds.length}/{slotCount})
          </h2>
          <ul
            aria-labelledby={`${headingId}-slots`}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {placement.slots.map((cardId, index) => (
              <SlotBox
                key={index}
                index={index}
                card={cardId ? (cardsById.get(cardId) ?? null) : null}
                onTap={() => placement.tapSlot(index)}
              />
            ))}
          </ul>
        </div>

        <div
          ref={setPoolNodeRef}
          className={cn(
            'flex flex-col gap-2 rounded-lg border border-dashed p-2',
            isOverPool ? 'border-primary' : 'border-transparent',
          )}
        >
          <h2 id={`${headingId}-pool`} className="text-sm font-semibold">
            手持ちカード
          </h2>
          {placement.poolCardIds.length === 0 ? (
            <p className="text-muted-foreground text-sm">配置できるカードはありません。</p>
          ) : (
            <ul aria-labelledby={`${headingId}-pool`} className="flex flex-col gap-2">
              {placement.poolCardIds.map((cardId) => {
                const card = cardsById.get(cardId)
                if (!card) return null
                return (
                  <li key={cardId}>
                    <CardChip
                      card={card}
                      selected={placement.selectedCardId === cardId}
                      onTap={() => placement.selectCard(cardId)}
                      draggableId={toDragId(cardId)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <Button
          type="button"
          className="h-12 min-w-12 self-start px-6 text-base"
          disabled={!placement.isComplete}
          onClick={() => onConfirm(placement.placedCardIds as string[])}
        >
          {confirmLabel}
        </Button>
      </div>
    </DndContext>
  )
}
