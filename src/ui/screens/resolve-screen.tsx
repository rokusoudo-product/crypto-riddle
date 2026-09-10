import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Card } from '@/core/model'
import { CardPlacementBoard } from '@/ui/components/card-placement-board'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

function ownedCards(cardIds: readonly string[], scenarioCards: readonly Card[]): Card[] {
  const byId = new Map(scenarioCards.map((c) => [c.id, c]))
  return cardIds.map((id) => byId.get(id)).filter((c): c is Card => c !== undefined)
}

// ⑤解決（ダーク文脈）。目的=攻撃手段の特定／主要アクション=カードをスロットへ配置→確定。
// 単一解・厳密一致（spec §7）。T013/T014: core のステートマシン(暗号→特定→防衛)と
// カード配置UI(dnd-kit、タップ第一・ドラッグ補助)を接続する。
export function ResolveScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)
  const [cipherAnswer, setCipherAnswer] = useState('')

  if (progress.part !== 'resolution' || progress.resolutionStage === null) {
    return (
      <ScreenContainer title="解決">
        <p className="text-muted-foreground">
          まだ解決パートではありません。
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 align-baseline"
            onClick={() => navigate(routeForProgress(progress))}
          >
            続きへ進む
          </Button>
        </p>
      </ScreenContainer>
    )
  }

  function handleCipherSubmit(e: FormEvent) {
    e.preventDefault()
    const next = dispatch({ type: 'SUBMIT_CIPHER_ANSWER', answer: cipherAnswer })
    setCipherAnswer('')
    if (next.part === 'follow_up') navigate('/resolve/fail')
  }

  function handleAttackIdentificationConfirm(cardIds: string[]) {
    const next = dispatch({ type: 'SUBMIT_ATTACK_IDENTIFICATION', cardIds })
    if (next.part === 'follow_up') navigate('/resolve/fail')
  }

  function handleCountermeasureConfirm(cardIds: string[]) {
    const next = dispatch({ type: 'SUBMIT_COUNTERMEASURE', cardIds })
    if (next.part === 'follow_up') navigate('/resolve/fail')
    else if (next.part === 'clear') navigate('/result')
  }

  return (
    <ScreenContainer title="解決">
      <StateFrame state={state}>
        {progress.resolutionStage === 'cipher' && (
          <form className="flex flex-col gap-4" onSubmit={handleCipherSubmit}>
            <div className="border-border bg-card rounded-lg border p-4">
              <p className="text-sm">暗号文: {scenario.resolution.cipher_stages[0]?.ciphertext}</p>
              <p className="text-muted-foreground text-sm">
                ヒント: {scenario.resolution.cipher_stages[0]?.key_hint}
              </p>
            </div>
            <label htmlFor="cipher-answer" className="text-sm">
              復号した平文を入力してください
            </label>
            <input
              id="cipher-answer"
              type="text"
              value={cipherAnswer}
              onChange={(e) => setCipherAnswer(e.target.value)}
              className="border-border bg-background focus-visible:ring-ring h-12 min-w-12 rounded-lg border px-4 focus-visible:ring-3 focus-visible:outline-none"
            />
            <Button
              type="submit"
              className="h-12 min-w-12 self-start px-6 text-base"
              disabled={cipherAnswer.trim().length === 0}
            >
              解答する
            </Button>
          </form>
        )}

        {progress.resolutionStage === 'attack_identification' && (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              集めた手がかりから、攻撃手段の特定に必要なカードを選んで配置してください。
            </p>
            <CardPlacementBoard
              cards={ownedCards(progress.ownedCardIds, scenario.cards)}
              slotCount={scenario.resolution.attack_identification.required_card_ids.length}
              onConfirm={handleAttackIdentificationConfirm}
              confirmLabel="攻撃手段を特定する"
            />
          </div>
        )}

        {progress.resolutionStage === 'countermeasure' && (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              「{scenario.resolution.attack_identification.attack_name}
              」への有効な対策カードを配置してください。
            </p>
            <CardPlacementBoard
              // 防衛策の選択肢は type='対策' のカードのみに絞る(scenario.ts の superRefine で
              // countermeasure.required_card_ids も type='対策' に限定されている前提と揃える)。
              // 絞らないと他 type のカードを誤って配置でき、countermeasure 用の
              // wrong_answer_follow_ups(例: S1 の電源シャットダウンに対する解説)と
              // 無関係な誤答でも同じ文言が出てしまう。
              cards={ownedCards(progress.ownedCardIds, scenario.cards).filter(
                (card) => card.type === '対策',
              )}
              slotCount={scenario.resolution.countermeasure.required_card_ids.length}
              onConfirm={handleCountermeasureConfirm}
              confirmLabel="対策を選ぶ"
            />
          </div>
        )}
      </StateFrame>
    </ScreenContainer>
  )
}
