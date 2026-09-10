import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MAX_CONSULTS } from '@/core/scenario'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ⑤解決（ダーク文脈）。目的=会話モードで問いに答え攻撃手段を特定・防衛策を選ぶ（spec §8, #42）。
// 単一解・厳密一致（spec §8.2）。
//
// 2026-09-10(#42・#44・T032): 解決パートがカード配置(required_card_ids方式・T014)から
// 会話の中で問いに2〜3択で答える会話モードへ刷新された。本PRのスコープは core(T030-032)のため、
// ここでは型エラーを解消する最小限の実装(プレーンな選択肢ボタン)に留め、DESIGN.md「会話フレーム」
// (下部会話ウィンドウ・立ち絵・名札等)の本格実装は #45(T033)で行う。
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
    dispatch({ type: 'SUBMIT_CIPHER_ANSWER', answer: cipherAnswer })
    setCipherAnswer('')
  }

  function handleQuestionAnswer(choiceIndex: number) {
    const next = dispatch({ type: 'SUBMIT_QUESTION_ANSWER', choiceIndex })
    if (next.part === 'clear') navigate('/result')
  }

  function handleConsult() {
    dispatch({ type: 'CONSULT' })
  }

  const question =
    progress.resolutionStage === 'question'
      ? scenario.resolution.questions[progress.questionIndex]
      : undefined

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
          <div className="flex flex-col gap-4">
            <p>
              <span className="font-semibold">{question.speaker}</span>「{question.prompt}」
            </p>
            <ul className="flex flex-col gap-2">
              {question.choices.map((choice, index) => (
                <li key={index}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 min-h-12 w-full justify-start px-4 text-left text-base whitespace-normal"
                    onClick={() => handleQuestionAnswer(index)}
                  >
                    {choice.text}
                  </Button>
                </li>
              ))}
            </ul>
            {progress.lastAnswerFeedback?.correct === false && (
              <div role="alert" className="border-border bg-card rounded-lg border p-3 text-sm">
                {progress.lastAnswerFeedback.reply && <p>{progress.lastAnswerFeedback.reply}</p>}
                {progress.lastAnswerFeedback.explanation && (
                  <p className="text-muted-foreground">{progress.lastAnswerFeedback.explanation}</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="button"
                variant="secondary"
                className="h-12 min-w-12 px-6"
                disabled={progress.consultsUsed >= MAX_CONSULTS}
                onClick={handleConsult}
              >
                相談する(残り{MAX_CONSULTS - progress.consultsUsed}回)
              </Button>
              {progress.consultsUsed > 0 && (
                <p className="text-muted-foreground text-sm">{question.consult_hint}</p>
              )}
            </div>
          </div>
        )}
      </StateFrame>
    </ScreenContainer>
  )
}
