import { Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { canEnterResolution } from '@/core/scenario'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { SceneExplorer } from '@/ui/components/explore/scene-explorer'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { routeForProgress } from '@/ui/screens/navigation'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// ④探索（ダーク文脈）。目的=手がかり収集／主要アクション=調査ポイント→カード獲得。
// T013: core のシナリオ進行ステートマシンと接続する。調査ポイントは s0-sample の実データを使う。
//
// 2026-09-10(#52/#56・T038): 探索を「背景シーン＋ホットスポット」方式に刷新した。
// `scenario.scenes`(#55/T037で追加された省略可能フィールド)がある場合は SceneExplorer
// (背景シーン・シーンタブ・ホットスポット・アクションシート・調査結果の会話フレーム)を
// 表示し、無い場合は従来どおり本ファイルの一覧のみを表示する(docs/scenario_schema.md §2.5)。
// scenes・一覧のどちらも同じ dispatch({type:'INVESTIGATE'}) に接続するだけで、core の
// シナリオ進行ステートマシン(src/core/scenario/state.ts)には一切手を入れていない。
//
// 2026-09-11(#52 Phase4.7 追補・T047): 探索を「探索状態/会話状態」の2状態に刷新した
// (DESIGN.md「探索シーン」節「2つの状態」)。scenesがある場合、「調査ポイント一覧」は
// もはや常時併設ではなく、SceneExplorer右上の「調査ポイント一覧」トグルで開閉する
// (旧#66の「モバイルでは初期表示」はこのトグル方式に置き換えた=発見性はトグルの常時可視で
// 担保する)。一覧の中身(investigationListNode、見出し・件数・調査ボタン)自体は本ファイルが
// 組み立てたものをそのままSceneExplorerへ渡すだけで、内容や dispatch 配線は変えていない。
// scenesが無い場合(hasScenes=false)は、SceneExplorerが無くトグルの必要もないため、
// 従来どおり一覧を直接・常時表示する(回帰なし)。
//
// 2026-09-11(#52 Phase4.7/#71・T045、T047で会話オーバーレイに統合): 探索完了→解決への誘導。
// 「解決へ」の活性条件(canEnterResolution、下記 canProceed)を満たした時点で、会話フレームで
// 「そろそろ問題をまとめようか」と橘(司令塔・既定話者)が1回促す(spec §7.1・DESIGN.md
// 「探索シーン」節)。新しい活性条件は作らず、既存の canProceed をそのまま流用する。
// 表示可否は `canProceed && !wrapUpPromptDismissed && !isExplorerConversationOpen` の派生値にし、
// 専用の「表示済みフラグ」を持たない: canProceed は調査が進むほど単調に true へ向かう
// 一方向の値のため(一度 true になった探索パート中に false へ戻ることはない、
// src/core/scenario/state.ts)、「閉じるまで表示し続け、閉じたら二度と出さない」で
// 「1回だけ促す(再調査のたびには出さない)」を満たせる。
// isExplorerConversationOpen は SceneExplorer 側の会話オーバーレイ(調査結果=collect・dangerの
// 教育的フィードバック)が開いているかどうかの通知(onConversationOpenChange)を受けるための
// UI専用state(#71・T045で導入、T047でdangerも対象に拡張)。最後の1件をホットスポット経由で
// 調べ終えた瞬間はSceneExplorer自身の会話とこの促しの両方の表示条件が同時に真になり得るため、
// これが無いと会話オーバーレイが2つ同時に重なり、かつ両方に同名の「閉じる」ボタンが並んで
// しまう(advisor指摘)。調査結果を閉じてから促しを出す形にして両方を解消する。
// scenesがある場合、この促しもSceneExplorerのconversationSlotへ`layout="overlay"`のまま渡し、
// 背景を保持したまま重ねて表示する(DESIGN.md「会話オーバーレイのレイアウト」節。旧来の
// 「背景の下に立ち絵バンド＋ウィンドウを積む」形=stacked layoutは、scenesが無い場合の
// フォールバックにのみ残す)。
// (このコンポーネントの再マウントを跨いだ「既読」の永続化は core スキーマ変更が要るため、
// 本Issueの停止条件によりスコープ外とする。)
export function ExploreScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)
  const [wrapUpPromptDismissed, setWrapUpPromptDismissed] = useState(false)
  const [isExplorerConversationOpen, setIsExplorerConversationOpen] = useState(false)

  if (progress.part !== 'exploration') {
    return (
      <ScreenContainer title="探索">
        <p className="text-muted-foreground">
          まだ探索パートではありません。
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

  function handleInvestigate(pointId: string) {
    dispatch({ type: 'INVESTIGATE', pointId })
  }

  function handleEnterResolution() {
    const next = dispatch({ type: 'ENTER_RESOLUTION' })
    if (next.part === 'resolution') navigate('/resolve')
  }

  const canProceed = canEnterResolution(progress, scenario)
  const scenes = scenario.scenes
  const hasScenes = (scenes?.length ?? 0) > 0
  const investigatedCount = progress.investigatedPointIds.length
  const totalCount = scenario.investigation_points.length

  // 「調査ポイント一覧」の中身(#66→T047でトグル化)。scenesがある場合はSceneExplorer右上の
  // トグルパネルの中身として渡し(常時表示ではなくなる)、無い場合は本ファイルで直接・常時
  // 表示する(従来どおり)。中身自体(見出し・件数・調査ボタン・dispatch配線)はどちらの経路でも
  // 変えていない。
  const investigationListNode = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 id="investigation-point-list-heading" className="font-heading text-lg">
          調査ポイント一覧
        </h2>
        <span className="text-muted-foreground text-sm">
          {investigatedCount}/{totalCount} 件調査済み
        </span>
      </div>
      <ul aria-labelledby="investigation-point-list-heading" className="flex flex-col gap-4">
        {scenario.investigation_points.map((point) => {
          const investigated = progress.investigatedPointIds.includes(point.id)
          return (
            <li
              key={point.id}
              className="border-border bg-card flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">{point.category}</span>
                <span>{point.label}</span>
              </div>
              {investigated ? (
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Check aria-hidden="true" className="size-4" />
                  調査済み
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 min-w-12 px-4"
                  onClick={() => handleInvestigate(point.id)}
                >
                  調査する
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )

  // 探索完了→解決への誘導(#52 Phase4.7/#71・T045、T047で会話オーバーレイに統合): 「解決へ」の
  // 活性条件を満たした瞬間に橘が会話フレームで1回促す。「わかった」を押すまでは表示し続け、
  // 押したら二度と出さない(再調査のたびに毎回出すことはしない)。#64のタイプライター会話フレームに
  // そのまま乗せ、演出・アクセシビリティ(全文表示後にのみボタンを描画)を統一する。
  // SceneExplorer側の会話オーバーレイ(調査結果・danger)が開いている間は出さない
  // (isExplorerConversationOpen。会話オーバーレイの2重表示を避けるため、上記コンポーネント
  // 冒頭コメント参照)。ボタン文言は SceneExplorer 側の会話オーバーレイの「閉じる」と
  // 意図的に変え(「わかった」)、両方の会話が万一同時に描画されてもアクセシブルネームが
  // 衝突しないようにしている。scenesがある場合はSceneExplorerのconversationSlotへ
  // layout="overlay"のまま渡し、背景を保持したまま重ねる(DESIGN.md「会話オーバーレイの
  // レイアウト」節)。scenesが無い場合のみ、旧来のstacked layoutで本ファイルが直接描画する。
  const wrapUpPrompt =
    canProceed && !wrapUpPromptDismissed && !isExplorerConversationOpen ? (
      <ConversationFrame
        layout={hasScenes ? 'overlay' : 'stacked'}
        speaker="橘"
        line="そろそろ問題をまとめようか。"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            必要な手がかりは出揃った。下の「解決へ進む」から進もう。
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-12 px-6"
            onClick={() => setWrapUpPromptDismissed(true)}
          >
            わかった
          </Button>
        </div>
      </ConversationFrame>
    ) : null

  return (
    <ScreenContainer title="探索">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">判定しています…</p>}
        empty={<p>まだ調査していません。調査ポイントをタップしよう。</p>}
        error={<p className="text-destructive">エラーが発生しました。</p>}
      >
        {hasScenes && scenes ? (
          <SceneExplorer
            scenario={scenario}
            scenes={scenes}
            investigatedPointIds={progress.investigatedPointIds}
            ownedCardIds={progress.ownedCardIds}
            onCollect={handleInvestigate}
            onConversationOpenChange={setIsExplorerConversationOpen}
            investigationList={investigationListNode}
            conversationSlot={wrapUpPrompt}
          />
        ) : (
          <>
            {investigationListNode}
            {wrapUpPrompt}
          </>
        )}

        <Button
          type="button"
          className="h-12 min-w-12 self-start px-6 text-base"
          disabled={!canProceed}
          onClick={handleEnterResolution}
        >
          解決へ進む
        </Button>
      </StateFrame>
    </ScreenContainer>
  )
}
