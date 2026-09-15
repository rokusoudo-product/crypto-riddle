import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MAX_CONSULTS } from '@/core/scenario'
import { BackgroundBox } from '@/ui/components/background-box'
import { CardDrawer } from '@/ui/components/card-drawer'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { ResolveChoicePanel } from '@/ui/components/resolve/resolve-choice-panel'
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
//
// 2026-09-15(#134・代表決定2026-09-14・#132): 中央選択パネル(ResolveChoicePanel)へ刷新。
// 旧実装(選択肢・相談・カードドロワーを会話ウィンドウのchildrenとして表示)は撤回し、以下に
// 置き換えた(DESIGN.md「解決の会話モード」節「配置」「会話ウィンドウとの役割分担」):
// - 問い(prompt)＋選択肢＋相談ボタンは、背景の箱の中央のResolveChoicePanel(ConversationFrameの
//   centerPanel prop)にまとめる。パネルは問いを静的テキストとして常に表示し続ける
//   (会話ウィンドウのタイプライターとは独立)。
// - 会話ウィンドウ(ConversationFrameのline)は台詞(タイプライター)専用にする: 通常は空文字
//   (代表決定2026-09-15・秘書レビュー2回目・PR#151。問いの文はパネルだけに出す。話者名=
//   NamePlateのみ残す)、誤答時は相手の返答(reply)に切り替えてタイプライターで表示する
//   (windowLine参照。パネルは開いたまま=選択肢は残る)。誤答の段階解説(explanations)は
//   話者が問いの出題キャラと異なる場合があるため(explanation.ts参照)、会話ウィンドウの
//   発話者を変えずに済むようパネル側に静的表示する(誤答のreplyのみ会話ウィンドウ、
//   explanationはパネル)。
// - 選択肢・相談ボタンは常に操作可能にする(2026-09-15・秘書レビュー2回目・PR#151で撤回)。
//   旧実装は「問いの全文表示(またはスキップ)が完了するまで無効化」していたが、これは
//   会話ウィンドウで問いをタイプライター表示していた頃の「送り途中の誤操作防止」のための
//   ゲートだった。問いの文を会話ウィンドウに出さなくなった(代表決定2026-09-15)ことで
//   パネルの問い見出しはもとから静的テキスト(タイプライターなし)であり、待つべき「表示中」
//   状態自体が無くなったため、このゲートは意味を持たなくなった。加えて、windowLineが
//   問いの表示中は常に空文字になったことで、ConversationFrameの「line変更検知」
//   (`line !== trackedLine`)が2問目以降で発火しない(空文字→空文字は「変化なし」と
//   判定される)というバグも判明し、無効化ゲートを維持すると2問目以降で選択肢が永久に
//   有効化されない不具合になっていた。
// - カードドロワーは背景の箱の右上へ独立したボタンとして移設(探索④の「ヒント確認」と同じ
//   位置・見た目・不透明表示、文言のみ「手持ちカード」)。
// - 正解時(次の問いがある場合): 直前の正解 reply(あれば)を新しい問いのパネル上部に一言添える。
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
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
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

  const question =
    progress.resolutionStage === 'question'
      ? scenario.resolution.questions[progress.questionIndex]
      : undefined

  // 新しい問いが表示されるたびに、選択パネルの最初の選択肢へフォーカスを移す(キーボード操作の
  // 流れを保つ。#134・2026-09-15改訂)。以前はConversationFrameの「問いの全文表示完了」
  // コールバック(onLineRevealed)を起点にしていたが、問いの文を会話ウィンドウに出さなくなり
  // windowLineが問い表示中は常に空文字になったことで、2問目以降はConversationFrame側の
  // line変更検知(`line !== trackedLine`、空文字→空文字は「変化なし」)が発火せず
  // onLineRevealedが呼ばれない不具合があったため、question.idの変化を直接の起点にする
  // 方式へ改めた(ConversationFrame側の仕組みには依存しない)。
  // Rules of Hooksのため、下の早期return(まだ解決パートではない場合)より前に置く。
  useEffect(() => {
    if (question) firstChoiceRef.current?.focus()
    // scenario.resolution.questionsは安定した配列参照のため、questionIndexが変わらない限り
    // questionも同一オブジェクト参照のまま(=不要な再フォーカスは起きない)。
  }, [question])

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

  // 会話ウィンドウ(ConversationFrame)のlineが全文表示された瞬間に呼ばれる(#134)。誤答時の
  // 返答(reply)の全文表示完了時にのみ意味を持つ: 会話ウィンドウは全文表示後、スキップ用
  // <button>が消えてただの<p>になる。スキップボタンにフォーカスがあった場合、消滅に伴い
  // フォーカスがdocument.bodyへ落ち、次のTabがページ先頭からやり直しになってしまう
  // (ConversationFrame側の「children内の最初のフォーカス可能要素へ戻す」仕組みは、選択肢が
  // childrenの外=centerPanelへ移ったことで対象を見つけられなくなったため)。選択パネルの
  // 最初の選択肢へ明示的に戻し、キーボード操作の連続性を保つ。問い表示中(windowLine=='')
  // でも呼ばれるが、上のquestion.id起点のeffectと同じ対象へ再フォーカスするだけで実害はない。
  function handleLineRevealed() {
    firstChoiceRef.current?.focus()
  }

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

  // 会話ウィンドウ(ConversationFrame)のline(#134・代表決定2026-09-15): 問いの文は中央選択
  // パネルだけに出し、会話ウィンドウには出さない。resolution.questions[]スキーマ(.strict())
  // には問いの前に置ける前置きの台詞フィールドが無く(prompt自身が「問い＝キャラの台詞」を
  // 兼ねる、docs/scenario_schema.md §2.4)、台本の追加は代表承認が要るため新規に書き起こさない。
  // 通常時(問い表示中)は空文字にする(話者名=NamePlateだけは残す。WCAG 1.4.1: 発話者を
  // 色/グレーアウトだけでなくテキストでも示す既存の仕組みを維持するため、会話ウィンドウ
  // 自体を消すのではなく本文だけを空にする案を採用。他の案・判断はPR本文参照)。
  // 誤答直後は相手の返答(reply)に切り替えてタイプライターで表示する(変更なし。
  // DESIGN.md「会話ウィンドウとの役割分担」)。replyが無い誤答(choiceにreply省略時)は
  // 空文字のまま(問い文へフォールバックしない)。
  const windowLine =
    question && progress.lastAnswerFeedback?.correct === false && progress.lastAnswerFeedback.reply
      ? progress.lastAnswerFeedback.reply
      : ''

  // 中央選択パネル(#134): 問い＋選択肢＋相談ボタン。誤答の段階解説(explanations)もここに表示
  // する(相手の返答=replyは会話ウィンドウ側、上記windowLine参照)。
  const centerPanel = question ? (
    <ResolveChoicePanel
      className={
        // DESIGN.md「縦長（9:16）の構成」節: 横長は箱の50〜55%程度、縦長は立ち絵の上に
        // 積むため幅いっぱい(padding分を除く)に近い幅を使う。
        // 秘書レビュー2回目(2026-09-15・PR#151)指摘の修正: パネル全体に上限を付ける方式
        // (前回の実装)は、問い・選択肢・相談ボタンまで一緒に切り詰めてしまい、縦長の問2で
        // 相談ボタンが半分隠れる不具合になった。パネル自体の上限は撤回し、可変長になりうる
        // 地の文(直前の正解への一言・誤答の段階解説・相談ヒント)だけを
        // ResolveChoicePanel内部のFreeTextBlockで個別にmax-h+overflow-y-autoにする方式へ
        // 変更した(問い・選択肢・相談ボタンは常に全体が見える)。
        // 秘書レビュー3回目(2026-09-15・PR#152)指摘の修正: 地の文(段階解説)は学習の中身
        // そのものであり、1行程度のスクロール欄に閉じ込めるのは不可との指摘を受け、
        // FreeTextBlock側の上限を横長=無し・縦長=24cqh(4〜5行相当)へ引き上げた
        // (boxOrientation propとして渡す、下記参照)。立ち絵の大きさは優先順位3位に
        // 後退し、縦長の誤答直後など場所が足りない場面では縮んでよい(ページの縦スクロール
        // 無しは維持。実測値はPR本文参照)。
        resolveBoxOrientationValue === 'landscape' ? 'w-[52cqw]' : 'w-full'
      }
      boxOrientation={resolveBoxOrientationValue}
      prompt={question.prompt}
      priorCorrectReply={
        progress.lastAnswerFeedback?.correct === true
          ? (progress.lastAnswerFeedback.reply ?? null)
          : null
      }
      choices={question.choices}
      onSelectChoice={handleQuestionAnswer}
      wrongExplanation={progress.lastAnswerFeedback?.correct === false ? resolvedExplanation : null}
      consultRemaining={consultRemaining}
      consultDisabled={consultDisabled}
      onConsult={handleConsult}
      hintText={hintRevealedForQuestionId === question.id ? question.consult_hint : null}
      firstChoiceRef={firstChoiceRef}
    />
  ) : null

  // カードドロワー(#134): 背景の箱の右上へ独立したボタンとして移設(探索④の「ヒント確認」と
  // 同じ位置・見た目・不透明表示。文言のみ「手持ちカード」、DESIGN.md「解決の会話モード」節
  // 「カードドロワー」)。中央の選択パネルとは重ねない。
  const cardDrawerButton = (
    <div className="absolute top-2 right-2 z-50">
      <CardDrawer cards={ownedCards} triggerVariant="label" triggerLabel="手持ちカード" />
    </div>
  )

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
                line={windowLine}
                onLineRevealed={handleLineRevealed}
                centerPanel={centerPanel}
              />
              {cardDrawerButton}
            </BackgroundBox>
          ) : (
            // scenario.scenesが無いマップ(一覧フォールバックのみ)は背景の箱を持たないため、
            // 従来どおりstacked layout(背景の箱を持たない画面向け)のまま描画する。
            <div className="relative flex flex-col gap-4">
              <ConversationFrame
                speaker={question.speaker}
                speakerHistory={scenario.resolution.questions
                  .slice(0, progress.questionIndex + 1)
                  .map((q) => q.speaker)}
                line={windowLine}
                onLineRevealed={handleLineRevealed}
                centerPanel={centerPanel}
              />
              <div className="self-end">
                <CardDrawer cards={ownedCards} />
              </div>
            </div>
          ))}
      </StateFrame>
    </ScreenContainer>
  )
}
