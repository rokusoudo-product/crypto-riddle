import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConversationFrame } from '@/ui/components/conversation-frame'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

import introBackground from '../../../assets/backgrounds/bg-sl-office.png'

// ③導入（ダーク文脈）。目的=事件の前提提示／主要アクション=タップで進行・SKIP。
// T013: core のシナリオ進行ステートマシン(scenarioReducer)と接続し、s0-sample の導入テキストを表示する。
//
// 2026-09-13(#100/#102・#50吸収): 導入を会話フレーム(ConversationFrame)へ刷新した。
// DESIGN.md「会話フレーム」節「対策室レイアウト」が正本。
// - 背景: 新規生成せず既存 bg-sl-office(自社執務室・人物なし)を流用する(2026-09-12代表承認)。
//   アセットIDはシナリオスキーマに持たせない(introはscenes[]を使わないため)方針どおり、
//   このファイル側のUI定数(INTRO_BACKGROUND_SRC)として持つ(scene-explorer.tsxの
//   BACKGROUND_SRCと同じ、Viteのimportでアセットurlを解決する方式)。
// - レイアウト: `ConversationFrame`の`layout="intro"`(霧島=左/橘=右/小鳥遊=中央後方やや小さめの
//   3枠。#100/#102で追加)を背景の箱に重ねる。探索の会話オーバーレイ(scene-explorer.tsx)と
//   同じ「position: relativeな箱にabsolute inset-0で重ねる」パターンを再利用する。
// - `intro.background`(ナレーション本文、省略可・0.7.0)が省略されていればナレーションブロックを
//   描画せず会話へ直行し、値があれば従来どおり表示する(S2/S3/SL は`background`を持つため
//   後方互換が必要)。
// - `character_intros`を1行ずつタップ送りする(多ターン対応)。タイプライター・スキップ・
//   `prefers-reduced-motion`・sr-only全文提供は`ConversationFrame`を再利用し、ロジックを
//   二重化しない。「タップで進行」ボタンは維持し(DESIGN.md画面一覧③導入の主要アクション表記)、
//   最終行より前ではターンを1つ進め、最終行でのみ`handleAdvance`(探索へ進む)を呼ぶ。
//   「タップで進行」は選択肢等と同じくChildrenとしてConversationFrameへ渡すため、その行の
//   全文表示(またはスキップ)が終わるまでは出ない(送り途中の誤タップ防止)。「SKIP」は
//   会話フレームの外(常時表示)に置き、タイプライターの進行状況に関わらずいつでも押せる
//   (途中の行でも即座に導入全体を飛ばして探索へ進める、既存の導線を壊さない)。
export function IntroScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)
  // character_intros の何行目を表示中か(#100/#102の多ターン送り)。
  const [turnIndex, setTurnIndex] = useState(0)

  function handleAdvance() {
    if (progress.part !== 'intro') {
      // 既に intro を通過済み(直接 URL 遷移・戻る操作等)なら現在の進行先へ案内する。
      navigate(routeForProgress(progress))
      return
    }
    const next = dispatch({ type: 'ADVANCE_INTRO' })
    navigate(routeForProgress(next))
  }

  const characterIntros = scenario.intro.character_intros
  const currentLine = characterIntros[turnIndex]
  const isLastLine = turnIndex >= characterIntros.length - 1

  /** 「タップで進行」: 最終行より前は次の行へ、最終行なら探索へ進む。 */
  function handleAdvanceTurn() {
    if (isLastLine) {
      handleAdvance()
      return
    }
    setTurnIndex((index) => index + 1)
  }

  return (
    <ScreenContainer title="導入">
      <StateFrame
        state={state}
        error={<p className="text-destructive">シナリオの読込に失敗しました。</p>}
      >
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg">{scenario.intro.victim_company.name}</h2>
          <p className="text-muted-foreground text-sm">
            {scenario.intro.victim_company.description}
          </p>
        </div>
        {/* intro.background(ナレーション本文)は0.7.0で省略可になった(台本v2.2・完全会話劇化)。
            省略時はこのブロックを描画せず会話フレームへ直行する(S2/S3/SLは持つため後方互換)。 */}
        {scenario.intro.background && <p className="max-w-[60ch]">{scenario.intro.background}</p>}

        {currentLine && (
          <div className="border-border bg-muted relative aspect-video w-full overflow-hidden rounded-lg border">
            <img
              src={introBackground}
              alt="対策室の背景"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <ConversationFrame
              layout="intro"
              speaker={currentLine.character}
              line={currentLine.line}
              expression={currentLine.expression}
            >
              <Button
                type="button"
                className="h-12 min-w-12 px-6 text-base"
                onClick={handleAdvanceTurn}
              >
                タップで進行
              </Button>
            </ConversationFrame>
          </div>
        )}

        {/* SKIPは会話ウィンドウの外(常時表示)。タイプライターの進行状況に関わらずいつでも
            押せ、即座に導入全体を飛ばして探索へ進む(既存の導線を壊さない)。 */}
        <div className="flex flex-wrap gap-4">
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-12 px-6"
            onClick={handleAdvance}
          >
            SKIP
          </Button>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
