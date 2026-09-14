import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BackgroundBox } from '@/ui/components/background-box'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import type { BackgroundSrcMap } from '@/ui/lib/background-box'
import {
  hasPortraitAsset,
  resolveBackgroundSrc,
  resolveBoxOrientation,
} from '@/ui/lib/background-box'
import { useIsPortraitScreen } from '@/ui/lib/orientation'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

import introBackgroundFallback from '../../../assets/backgrounds/bg-sl-office.png'

// 導入の背景アセット対応表(#119/#124): 本来は対策室の新規背景`bg-hq-taskforce`
// (横)/`bg-hq-taskforce-portrait`(縦)を使う予定だが、これらはまだ生成されていない
// (#122で承認ゲートを経て生成予定)。画像は本Issue(#124)の範囲では生成しない方針のため、
// 生成されるまでの暫定として旧・流用背景bg-sl-office(法務SLシナリオの自社執務室背景)を
// 'bg-hq-taskforce'の横用として使う(#123で実アセットに差し替え予定。DESIGN.md「アセット」節)。
// 縦(-portrait)は未登録のため、縦長の画面でも箱は16:9のまま(resolveBoxOrientation参照)。
const INTRO_BACKGROUND_SRC: BackgroundSrcMap = {
  'bg-hq-taskforce': introBackgroundFallback,
}
const INTRO_BACKGROUND_ASSET_ID = 'bg-hq-taskforce'

// 箱の上下にある固定要素の合計高さ見積もり(#119/#124、BackgroundBoxのchromePx):
// ScreenContainerのpy-8(上下32px×2=64px)+見出しh1(約40px)+gap-6(24px)+被害企業名/説明
// ブロック(h2約28px+p約40px+gap-1=8px)+gap-6(24px、箱の上)+gap-6(24px、箱の下)+
// SKIPボタン行(48px)。8ptグリッドに丸めた概算値(S1試作で画面を見ながら調整する前提)。
const INTRO_CHROME_PX = 320

// ③導入（ダーク文脈）。目的=事件の前提提示／主要アクション=画面クリックで進行・SKIP。
// T013: core のシナリオ進行ステートマシン(scenarioReducer)と接続し、s0-sample の導入テキストを表示する。
//
// 2026-09-13(#100/#102・#50吸収): 導入を会話フレーム(ConversationFrame)へ刷新した。
// - 背景: 新規生成せず既存 bg-sl-office(自社執務室・人物なし)を流用する(2026-09-12代表承認)。
//   アセットIDはシナリオスキーマに持たせない(introはscenes[]を使わないため)方針どおり、
//   このファイル側のUI定数(INTRO_BACKGROUND_SRC)として持つ(scene-explorer.tsxの
//   BACKGROUND_SRCと同じ、Viteのimportでアセットurlを解決する方式)。
// - `intro.background`(ナレーション本文、省略可・0.7.0)が省略されていればナレーションブロックを
//   描画せず会話へ直行し、値があれば従来どおり表示する(S2/S3/SL は`background`を持つため
//   後方互換が必要)。
//
// 2026-09-13(S1実装台本レビュー第1回・代表FB・#108/#110): 会話フレームのレイアウトを
// 「左右2枠の入れ替わり方式」に刷新し、旧「対策室レイアウト」(霧島=左/橘=右/小鳥遊=中央後方
// やや小さめの3枠、`layout="intro"`)は廃止した(DESIGN.md「会話フレーム」節「左右2枠の
// 入れ替わり方式」が正本)。`layout="overlay"`(探索の会話オーバーレイと共通)を背景の箱の
// **直後の兄弟要素**として配置する(拡大された立ち絵〔デスクトップ240×320px・モバイル
// 120×160px〕が箱の高さに収まらないため、箱に`absolute inset-0`で重畳する形ではなく通常の
// ドキュメントフローに置く。conversation-frame.tsxのlayout="overlay"コメント参照)。
// `speakerHistory`(character_introsのこれまでの話者列)を`ConversationFrame`へ渡すことで
// 並びを決める(並びを決めるロジック自体は`src/ui/lib/two-slot-frame.ts`の純粋関数、単体テストは
// two-slot-frame.test.ts)。
// - `character_intros`を1行ずつ送る(多ターン対応)。タイプライター・スキップ・
//   `prefers-reduced-motion`・sr-only全文提供は`ConversationFrame`を再利用し、ロジックを
//   二重化しない。
// - 台詞送り(#108/#110): 旧「タップで進行」ボタンは廃止し、探索と同じく**画面のどこを
//   クリック/タップしても次の行に進む**(`ConversationFrame`の`onDismiss`+`dismissAnywhere`を
//   使う。DESIGN.md「台詞送り」節)。Enter/Spaceでも送れる(`onDismiss`が元々持つキーボード
//   対応)。タイプライター送出中のクリックは全文表示(スキップ)、全文表示後のクリックで
//   次の行(`handleAdvanceTurn`)。最終行では`handleAdvance`(探索へ進む)を呼ぶ。
//   Escapeは「閉じる」概念が無いため無効化する(`onEscape={() => {}}`。onDismissだけを
//   流用してEscapeまで次の行として扱うと、Escapeキーが不用意に導入を進めてしまうため)。
// - 「SKIP」は会話フレームの外(常時表示・独立したボタン)に置き、タイプライターの進行状況に
//   関わらずいつでも押せる(途中の行でも即座に導入全体を飛ばして探索へ進める、既存の導線を
//   壊さない)。会話フレーム内側のクリック領域とは別要素のため、SKIPクリックが
//   `dismissAnywhere`側の進行処理と二重発火することはない。
export function IntroScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)
  // character_intros の何行目を表示中か(#100/#102の多ターン送り)。
  const [turnIndex, setTurnIndex] = useState(0)
  // 背景の箱の向き(#119/#124): 縦の背景(bg-hq-taskforce-portrait)はまだ無いため、
  // 縦長の画面でも常にlandscape(16:9のまま)になる(resolveBoxOrientation参照)。
  const screenIsPortrait = useIsPortraitScreen()
  const boxOrientation = resolveBoxOrientation({
    screenIsPortrait,
    hasPortraitAsset: hasPortraitAsset(INTRO_BACKGROUND_ASSET_ID, INTRO_BACKGROUND_SRC),
  })
  const introBackgroundSrc = resolveBackgroundSrc(
    INTRO_BACKGROUND_ASSET_ID,
    boxOrientation,
    INTRO_BACKGROUND_SRC,
  )

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
  // 左右2枠の並びを決める発話者履歴(#108/#110、DESIGN.md「左右2枠の入れ替わり方式」節)。
  // 「導入の開始」でリセットするため、character_intros先頭からturnIndexまでの話者だけを渡す
  // (src/ui/lib/two-slot-frame.tsが履歴から並びを導出する純粋関数)。
  const speakerHistory = characterIntros.slice(0, turnIndex + 1).map((line) => line.character)

  /** 画面クリック/Enter/Space: 最終行より前は次の行へ、最終行なら探索へ進む(#108/#110)。 */
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
          // 背景の箱(#119/#124): 画面に収まる最大の16:9(縦の背景が無いため常にlandscape)の
          // 矩形。会話フレーム(立ち絵+ウィンドウ)は箱の子として`absolute inset-0`で重畳する
          // (縦スクロールを出さないため、#108/#110の「箱の直後の兄弟要素」案は撤回した。
          // conversation-frame.tsxのlayout="overlay"コメント参照)。
          <BackgroundBox
            orientation={boxOrientation}
            src={introBackgroundSrc}
            alt="対策室の背景"
            chromePx={INTRO_CHROME_PX}
          >
            {/* 台詞送り(#108/#110): 「タップで進行」ボタンは廃止し、探索と同じく画面のどこを
                クリック/タップしても次の行へ進む(dismissAnywhere)。Enter/Spaceでも送れる
                (onDismissが元々持つキーボード対応)。Escapeは「閉じる」概念が無いため
                無効化する(onEscape={() => {}})。 */}
            <ConversationFrame
              layout="overlay"
              boxOrientation={boxOrientation}
              speaker={currentLine.character}
              speakerHistory={speakerHistory}
              line={currentLine.line}
              expression={currentLine.expression}
              onDismiss={handleAdvanceTurn}
              onEscape={() => {}}
              dismissAnywhere
            />
          </BackgroundBox>
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
