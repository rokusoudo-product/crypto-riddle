// src/ui/hooks/use-card-placement.ts — T014: カード配置インタラクションの状態管理(純ロジック)。
//
// DESIGN.md「解決パートのカード配置はドラッグとタップの両対応（モバイルはタップ→スロットタップ）。
// キーボードのみでも カード選択・配置・確定まで完遂できること」に対応する。
// 判定(judgeCardSelection)は順序を問わない集合比較のため、スロットに位置的な意味はない
// (どのスロットに置くかではなく「何枚・どのカードを選んだか」が結果を左右する)。
// それでも DESIGN.md の「カードをスロットへ配置」という操作感を保つため、スロット配列として
// 状態を持つ(スロット数 = required_card_ids.length)。
//
// タップ操作(第一操作): カードを選択(タップ)→空きスロットをタップで配置。
//   配置済みスロットを選択なしでタップするとプールへ戻す(配置解除)。
//   カード選択中に配置済みスロットをタップすると、そのスロットの中身をプールへ戻してから
//   選択中のカードを配置する(入れ替え)。
// ドラッグ操作(補助): moveCardToSlot をドラッグの onDragEnd から呼び出す想定。
import { useCallback, useMemo, useState } from 'react'

export interface UseCardPlacementResult {
  /** スロットごとの配置カードID(未配置は null)。 */
  slots: readonly (string | null)[]
  /** まだどのスロットにも配置されていないカードID(元の順序を保つ)。 */
  poolCardIds: readonly string[]
  /** タップで選択中のカードID(プールのカードのみ選択できる)。 */
  selectedCardId: string | null
  /** 全スロットが埋まっているか(確定ボタンの活性判定に使う)。 */
  isComplete: boolean
  /** 配置済みカードIDの一覧(スロット順、判定へそのまま渡せる)。 */
  placedCardIds: readonly string[]
  /** プールのカードをタップ(選択/選択解除のトグル)。 */
  selectCard: (cardId: string) => void
  /** スロットをタップ(配置/配置解除/入れ替え)。 */
  tapSlot: (slotIndex: number) => void
  /** ドラッグ&ドロップでカードをスロットへ移動する(補助操作)。 */
  moveCardToSlot: (cardId: string, slotIndex: number) => void
  /** ドラッグ&ドロップでスロットのカードをプールへ戻す(補助操作)。 */
  moveCardToPool: (cardId: string) => void
  /** 選択・配置を初期状態に戻す(誤答フォロー後の再挑戦等)。 */
  reset: () => void
}

export function useCardPlacement(
  availableCardIds: readonly string[],
  slotCount: number,
): UseCardPlacementResult {
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(slotCount).fill(null))
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const poolCardIds = useMemo(
    () => availableCardIds.filter((id) => !slots.includes(id)),
    [availableCardIds, slots],
  )

  const selectCard = useCallback((cardId: string) => {
    setSelectedCardId((current) => (current === cardId ? null : cardId))
  }, [])

  const tapSlot = useCallback(
    (slotIndex: number) => {
      setSlots((current) => {
        const next = [...current]
        const existing = next[slotIndex] ?? null

        if (selectedCardId === null) {
          // 選択なし: 埋まっていれば配置解除、空なら何もしない。
          if (existing !== null) next[slotIndex] = null
          return next
        }

        // 選択あり: 対象スロットが埋まっていれば中身をプールへ戻してから入れ替える。
        next[slotIndex] = selectedCardId
        return next
      })
      if (selectedCardId !== null) setSelectedCardId(null)
    },
    [selectedCardId],
  )

  const moveCardToSlot = useCallback((cardId: string, slotIndex: number) => {
    setSlots((current) => {
      const next = current.map((value) => (value === cardId ? null : value))
      next[slotIndex] = cardId
      return next
    })
    setSelectedCardId(null)
  }, [])

  const moveCardToPool = useCallback((cardId: string) => {
    setSlots((current) => current.map((value) => (value === cardId ? null : value)))
  }, [])

  const reset = useCallback(() => {
    setSlots(Array(slotCount).fill(null))
    setSelectedCardId(null)
  }, [slotCount])

  const placedCardIds = useMemo(() => slots.filter((id): id is string => id !== null), [slots])
  const isComplete = placedCardIds.length === slotCount

  return {
    slots,
    poolCardIds,
    selectedCardId,
    isComplete,
    placedCardIds,
    selectCard,
    tapSlot,
    moveCardToSlot,
    moveCardToPool,
    reset,
  }
}
