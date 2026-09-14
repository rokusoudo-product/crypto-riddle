import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MAX_CONSULTS } from '@/core/scenario'
import { BackgroundBox } from '@/ui/components/background-box'
import { CardDrawer } from '@/ui/components/card-drawer'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import {
  hasPortraitAsset,
  resolveBackgroundImageRect,
  resolveBackgroundSrc,
  resolveBoxOrientation,
} from '@/ui/lib/background-box'
import { resolveExplanation } from '@/ui/lib/explanation'
import { EXPLORE_BACKGROUND_SRC } from '@/ui/lib/explore-background-assets'
import { useIsPortraitScreen } from '@/ui/lib/orientation'
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
  // 解決⑤の背景(代表決定2026-09-13・#119/#124): 独自の背景画像は持たず、「解決へ進む」を
  // 押した時点で表示していた探索シーンの背景をそのまま使う(新しい画像は作らない)。
  // `lastExploredSceneId`(探索④が更新するUI専用の値、game-store.ts参照)で探すシーンが
  // 見つからなければ先頭シーンへフォールバックする。scenario.scenesが無いマップ(一覧
  // フォールバックのみのマップ)では背景の箱自体を出さず、従来どおりのstacked layoutにする。
  const lastExploredSceneId = useGameStore((s) => s.lastExploredSceneId)
  const screenIsPortrait = useIsPortraitScreen()
  const resolveScene =
    scenario.scenes?.find((scene) => scene.id === lastExploredSceneId) ?? scenario.scenes?.[0]
  // #124・代表決定2026-09-14「縦長の画面は常に9:16」: 箱の向きは画面の向きのみで決まる。
  const resolveBoxOrientationValue = resolveBoxOrientation(screenIsPortrait)
  const resolveSceneHasPortraitAsset = resolveScene
    ? hasPortraitAsset(resolveScene.background, EXPLORE_BACKGROUND_SRC)
    : false
  const resolveBackgroundSrcValue = resolveScene
    ? resolveBackgroundSrc(
        resolveScene.background,
        resolveBoxOrientationValue,
        EXPLORE_BACKGROUND_SRC,
      )
    : undefined
  const resolveImageRect = resolveBackgroundImageRect(
    resolveBoxOrientationValue,
    resolveSceneHasPortraitAsset,
  )

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

  // 誤答時の段階解説を話者付きで解決する(#100/#102、docs/scenario_schema.md §2.6)。
  // dispatch後は wrongAttemptsByQuestionId が既に+1されているため、coreのpickExplanationが
  // 使った「今回の誤答より前の回数」に戻すには1引く(resolveExplanationのJSDoc参照)。
  const priorWrongAttempts = question
    ? (progress.wrongAttemptsByQuestionId[question.id] ?? 1) - 1
    : 0
  const resolvedExplanation =
    question && progress.lastAnswerFeedback?.correct === false
      ? resolveExplanation(question, priorWrongAttempts)
      : null

  // 解決の会話モードで会話フレーム上に載せる要素(選択肢・誤答フィードバック・相談・
  // カードドロワー)。背景の箱の有無(resolveScene)でConversationFrameのlayout/親要素が
  // 変わるだけで中身は共通のため、変数として切り出して両分岐で使い回す(#119/#124)。
  const questionChildren = question ? (
    <>
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
          {/* 段階解説の話者表示(#100/#102): explanationsのunion要素(string |
              DialogueLine)を{character, line}へ正規化してから、結果画面(result-screen.tsx)の
              clear_explanationと同じ表示形式(話者名+「台詞」)を流用する。 */}
          {resolvedExplanation && (
            <p className="text-muted-foreground">
              <span className="font-semibold">{resolvedExplanation.character}</span>「
              {resolvedExplanation.line}」
            </p>
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
          <p role="status" className="border-border bg-background rounded-lg border p-3 text-sm">
            {question.consult_hint}
          </p>
        )}
      </div>

      <CardDrawer cards={ownedCards} />
    </>
  ) : null

  // #124・代表決定2026-09-14「背景は画面いっぱいに表示」: 背景の箱を持つのは
  // resolutionStage==='question'かつresolveSceneがある場合のみ(cipherステージ・一覧
  // フォールバックのみのマップは従来どおりコンテナ最大幅960pxのstacked layout)。
  const isImmersive = progress.resolutionStage === 'question' && Boolean(resolveScene)

  return (
    <ScreenContainer title="解決" variant={isImmersive ? 'immersive' : 'default'}>
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

        {progress.resolutionStage === 'question' &&
          question &&
          (resolveScene ? (
            // 解決⑤の背景(代表決定2026-09-13・#119/#124): 「解決へ進む」を押した時点で
            // 表示していた探索シーンの背景をそのまま使い(新しい画像は作らない)、導入③・
            // 探索④と同じ「背景の箱」＋立ち絵・会話ウィンドウの重ね配置を適用する。
            <BackgroundBox
              orientation={resolveBoxOrientationValue}
              src={resolveBackgroundSrcValue}
              alt={`${resolveScene.title}の背景`}
              placeholderLabel={`${resolveScene.title}（背景 準備中）`}
              imageRect={resolveImageRect}
            >
              <ConversationFrame
                layout="overlay"
                boxOrientation={resolveBoxOrientationValue}
                speaker={question.speaker}
                // 左右2枠の並び(#108/#110): 解決は問1→問2に進んでも並びを保つ(DESIGN.md
                // 「左右2枠の入れ替わり方式」節「並びのリセット」)。questions全体の話者列の
                // うち現在の問いまでを履歴として渡すことで、問いをまたいでも並びが連続する。
                speakerHistory={scenario.resolution.questions
                  .slice(0, progress.questionIndex + 1)
                  .map((q) => q.speaker)}
                line={question.prompt}
              >
                {questionChildren}
              </ConversationFrame>
            </BackgroundBox>
          ) : (
            // scenario.scenesが無いマップ(一覧フォールバックのみ)は背景の箱を持たないため、
            // 従来どおりstacked layout(背景の箱を持たない画面向け)のまま描画する。
            <ConversationFrame
              speaker={question.speaker}
              speakerHistory={scenario.resolution.questions
                .slice(0, progress.questionIndex + 1)
                .map((q) => q.speaker)}
              line={question.prompt}
            >
              {questionChildren}
            </ConversationFrame>
          ))}
      </StateFrame>
    </ScreenContainer>
  )
}
