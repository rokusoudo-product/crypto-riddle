import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MAX_CONSULTS } from '@/core/scenario'
import { CardDrawer } from '@/ui/components/card-drawer'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ⑤解決（ダーク文脈）。目的=会話モードで問いに答え攻撃手段を特定・防衛策を選ぶ（spec §8, #42）。
// 単一解・厳密一致（spec §8.2）。
//
// 2026-09-10(#42・#45・T033): DESIGN.md「会話フレーム」を使った会話モードUIとして本実装した。
// - 選択肢: 問いごとに2〜3個、縦積み・各48px以上・キーボード(Tab/Enter/Space)で完遂できる素の<button>。
// - 相談ボタン: 残数(マップ3回)を会話ウィンドウ内に表示。0回で disabled + 理由テキスト(aria-describedby)。
// - カードドロワー: 探索で得た手持ちカードをいつでも無料で閲覧できる(相談=回数消費とは明示的に区別)。
// - 誤答時: 選択肢は残したまま、相手の reply + 段階解説(explanations)を会話ウィンドウ内に
//   aria-live="polite" で表示する(role="alert" にしない。ゲーム内の返答は緊急の警告ではないため)。
//   会話フレームの line(発話内容)は常に問い文(prompt)のまま保つ(誤答時に line を reply に
//   差し替えると、プレイヤーが何を問われていたか見失うため)。
// - 正解時(次の問いがある場合): 直前の正解 reply(あれば)を新しい問いの上に一言添える。
//   最後の問い(クリア)の場合は reply を表示する間もなく /result へ遷移するため、
//   結果画面(⑦)側で progress.lastAnswerFeedback を参照して表示する(result-screen.tsx)。
export function ResolveScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)
  const [cipherAnswer, setCipherAnswer] = useState('')
  // 相談で開いたヒントは「今の問いで相談を押した後」だけ表示する(問いが変わったら自動的に隠れる)。
  const [hintRevealedForQuestionId, setHintRevealedForQuestionId] = useState<string | null>(null)

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
    dispatch({ type: 'SUBMIT_CIPHER_ANSWER', answer: cipherAnswer })
    setCipherAnswer('')
  }

  function handleQuestionAnswer(choiceIndex: number) {
    const next = dispatch({ type: 'SUBMIT_QUESTION_ANSWER', choiceIndex })
    if (next.part === 'clear') navigate('/result')
  }

  function handleConsult() {
    const next = dispatch({ type: 'CONSULT' })
    if (next.consultsUsed > progress.consultsUsed && question) {
      setHintRevealedForQuestionId(question.id)
    }
  }

  const question =
    progress.resolutionStage === 'question'
      ? scenario.resolution.questions[progress.questionIndex]
      : undefined

  const ownedCards = scenario.cards.filter((card) => progress.ownedCardIds.includes(card.id))
  const consultRemaining = MAX_CONSULTS - progress.consultsUsed
  const consultDisabled = consultRemaining <= 0

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
            {progress.lastAnswerFeedback?.correct === false && (
              <p role="alert" className="text-destructive text-sm">
                不正解です。もう一度考えてみてください。
              </p>
            )}
          </form>
        )}

        {progress.resolutionStage === 'question' && question && (
          <ConversationFrame speaker={question.speaker} line={question.prompt}>
            {progress.lastAnswerFeedback?.correct === true && progress.lastAnswerFeedback.reply && (
              <p className="border-border bg-background rounded-lg border p-3 text-sm">
                {progress.lastAnswerFeedback.reply}
              </p>
            )}

            {/* 選択肢を先にレンダーし、相談・カードドロワーより前の Tab 順にする。 */}
            <ul className="flex flex-col gap-2">
              {question.choices.map((choice, index) => (
                <li key={index}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-12 w-full justify-start px-4 py-3 text-left text-base whitespace-normal"
                    onClick={() => handleQuestionAnswer(index)}
                  >
                    {choice.text}
                  </Button>
                </li>
              ))}
            </ul>

            {progress.lastAnswerFeedback?.correct === false && (
              <div
                aria-live="polite"
                className="border-border bg-background rounded-lg border p-3 text-sm"
              >
                {progress.lastAnswerFeedback.reply && <p>{progress.lastAnswerFeedback.reply}</p>}
                {progress.lastAnswerFeedback.explanation && (
                  <p className="text-muted-foreground">{progress.lastAnswerFeedback.explanation}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 min-w-12 px-6"
                  disabled={consultDisabled}
                  aria-describedby={consultDisabled ? 'consult-disabled-reason' : undefined}
                  onClick={handleConsult}
                >
                  相談する（残り{Math.max(consultRemaining, 0)}回・XP減）
                </Button>
                {consultDisabled && (
                  <p id="consult-disabled-reason" className="text-muted-foreground text-sm">
                    相談はこのマップで使い切りました（マップ単位3回まで）。
                  </p>
                )}
              </div>
              {hintRevealedForQuestionId === question.id && (
                <p
                  role="status"
                  className="border-border bg-background rounded-lg border p-3 text-sm"
                >
                  {question.consult_hint}
                </p>
              )}
            </div>

            <CardDrawer cards={ownedCards} />
          </ConversationFrame>
        )}
      </StateFrame>
    </ScreenContainer>
  )
}
