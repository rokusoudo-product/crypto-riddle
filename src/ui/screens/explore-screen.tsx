import { Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { canEnterResolution } from '@/core/scenario'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { SceneExplorer } from '@/ui/components/explore/scene-explorer'
import { GameTimeBadge } from '@/ui/components/game-time-badge'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { Button } from '@/ui/components/ui/button'
import { resolveBoxOrientation } from '@/ui/lib/background-box'
import { useIsPortraitScreen } from '@/ui/lib/orientation'
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
// 「材料は揃ったわ。そろそろ問題を整理しましょう。」と橘(司令塔・既定話者)が1回促す(spec §7.1・DESIGN.md
// 「探索シーン」節)。新しい活性条件は作らず、既存の canProceed をそのまま流用する。
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
//
// 2026-09-11(#52 追補): 誘導会話「わかった」を、探索状態へ戻す(setWrapUpPromptDismissed)
// ではなく「解決へ進む」ボタンと同じ handleEnterResolution をそのまま呼ぶ形に変更した
// (DESIGN.md「探索シーン」節「探索完了→解決への誘導」)。dispatch({type:'ENTER_RESOLUTION'})
// が成功すると progress.part が 'resolution' になり、本コンポーネント冒頭の早期returnにより
// 探索画面自体が表示されなくなる。ボタン文言「わかった」は維持し、SceneExplorer側の会話
// オーバーレイの「閉じる」とのアクセシブルネーム衝突を避ける意図(#71・T045)もそのまま残る
// (誘導会話だけがボタンで画面遷移し、クリックで閉じる他の会話オーバーレイと非対称になるのは
// 代表了承済み)。
//
// 2026-09-11(PR#92 追補・代表FB): 上記で「わかった」を解決画面遷移に変えた結果、誘導会話が
// 出ている間は SceneExplorer 側が会話状態(isConversationActive)とみなしホットスポットを
// 描画しなくなり、「わかった」でしか進めず背景ホットスポットの再探索ができない(ロック)
// 状態になっていた。代表FB「閉じて再探索も可・ロックしない」を受け、いったん削除した
// 「表示済みフラグ」を isWrapUpPromptDismissed として復活させる。旧実装との違いは:
// - 「わかった」ボタンの遷移先はそのまま解決画面(handleEnterResolution)で変えない。
// - 会話ウィンドウの**外側**(画面の見えている部分、conversation-frame.tsxの
//   `onOutsideDismiss`)をクリック/タップ、またはEscapeで誘導会話を閉じ、探索状態
//   (conversationSlotをnullにしてSceneExplorerのisConversationActiveをfalseに戻す)へ
//   戻れるようにする。会話ウィンドウ自体(や「わかった」ボタン)のクリックでは閉じない
//   (`onDismiss`は指定しない。指定すると「わかった」という実`<button>`を持つchildrenが
//   role="button"のウィンドウにネストしてしまうため。conversation-frame.tsxのJSDoc参照)。
// - 一度閉じたら isWrapUpPromptDismissed が true のまま維持され、誘導会話は自動的には
//   再表示しない(ナグ防止)。canProceed はコレクション操作でしか変わらず不成立へは戻らない
//   ため、フラグを false へ戻す経路は用意していない(そのまま「解決へ進む」から進めばよい)。
// - 「解決へ進む」ボタンはこの誘導会話の状態と無関係に、canProceed 成立中は常に活性のまま
//   描画され続ける(下記JSXの通り conversationSlot/wrapUpPrompt の外で組み立てているため、
//   誘導会話を閉じた後もそのまま解決へ進める)。
export function ExploreScreen() {
  const state = useScreenState()
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const dispatch = useGameStore((s) => s.dispatch)
  const [isExplorerConversationOpen, setIsExplorerConversationOpen] = useState(false)
  // 誘導会話「材料は揃ったわ。そろそろ問題を整理しましょう。」を外側クリック/Escapeで閉じたかどうか(PR#92追補・
  // 代表FB。上記コンポーネント冒頭コメント参照)。一度trueにしたら自動的にはfalseへ戻さない
  // (ナグ防止=再表示しない)。
  const [isWrapUpPromptDismissed, setIsWrapUpPromptDismissed] = useState(false)
  const setLastExploredSceneId = useGameStore((s) => s.setLastExploredSceneId)
  const screenIsPortrait = useIsPortraitScreen()
  // ゲーム内時刻(#136/#137): 誘導会話(wrapUpPrompt、下記)のcornerSlotに現在のシーンの
  // game_timeを渡すため、SceneExplorerの`onActiveSceneChange`からこの画面のstateとしても
  // 保持する(lastExploredSceneIdはストア側の別用途=解決⑤の背景引き継ぎのため、ここでは
  // 読み取り専用の別stateとして持つ。両者は同じタイミングで更新されるが責務を分けたままにする)。
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)

  // SceneExplorerの`onActiveSceneChange`から都度反映する: `lastExploredSceneId`
  // (解決⑤の背景の引き継ぎ、game-store.ts参照)を更新する。#124(縦長の画面は常に9:16)で
  // 箱の向きが画面の向きのみで決まるようになったため、シーンidそのものをこの画面のstateとして
  // 持つ必要は無くなった(wrapUpPromptのboxOrientationはresolveBoxOrientation(screenIsPortrait)
  // だけで求まる)。#136/#137でactiveSceneIdをwrapUpPromptのゲーム内時刻表示のために復活させた。
  function handleActiveSceneChange(sceneId: string) {
    setLastExploredSceneId(sceneId)
    setActiveSceneId(sceneId)
  }

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

  /** 誘導会話を外側クリック/Escapeで閉じ、探索状態へ戻す(PR#92追補・代表FB「ロックしない」)。 */
  function handleDismissWrapUpPrompt() {
    setIsWrapUpPromptDismissed(true)
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

  // 探索完了→解決への誘導(#52 Phase4.7/#71・T045、T047で会話オーバーレイに統合、追補で
  // 解決画面遷移化): 「解決へ」の活性条件を満たした瞬間に橘が会話フレームで1回促す。
  // #64のタイプライター会話フレームにそのまま乗せ、演出・アクセシビリティ(全文表示後にのみ
  // ボタンを描画)を統一する。「わかった」は探索状態へ戻す表示切替ではなく、下の
  // 「解決へ進む」ボタンと同じ handleEnterResolution をそのまま呼んで解決画面へ遷移する
  // (DESIGN.md「探索シーン」節「探索完了→解決への誘導」)。
  // SceneExplorer側の会話オーバーレイ(調査結果・danger)が開いている間は出さない
  // (isExplorerConversationOpen。会話オーバーレイの2重表示を避けるため、上記コンポーネント
  // 冒頭コメント参照)。ボタン文言は SceneExplorer 側の会話オーバーレイの「閉じる」と
  // 意図的に変え(「わかった」)、両方の会話が万一同時に描画されてもアクセシブルネームが
  // 衝突しないようにしている。scenesがある場合はSceneExplorerのconversationSlotへ
  // layout="overlay"のまま渡し、背景を保持したまま重ねる(DESIGN.md「会話オーバーレイの
  // レイアウト」節)。scenesが無い場合のみ、旧来のstacked layoutで本ファイルが直接描画する。
  // isWrapUpPromptDismissedがtrueの間はconversationSlot自体を渡さない(=undefined)ため、
  // SceneExplorerのisConversationActiveがfalseに戻りホットスポットが再び操作できる
  // (PR#92追補・代表FB。上記コンポーネント冒頭コメント参照)。onOutsideDismissは
  // ウィンドウ**外側**のクリック/タップ・Escapeでのみ発火し、ウィンドウ自体や「わかった」
  // ボタンのクリックとは競合しない(conversation-frame.tsxのJSDoc参照)。
  // wrapUpPrompt自身のboxOrientation(#124・代表決定2026-09-14「縦長の画面は常に9:16」):
  // 箱の向きは画面の向きのみで決まるため、SceneExplorer側の会話オーバーレイと常に同じ値になる
  // (シーンごとの背景アセット有無には依存しない。#119時点の「活動中シーンの背景アセット有無」
  // 計算は不要になった)。
  const wrapUpBoxOrientation = resolveBoxOrientation(screenIsPortrait)
  // ゲーム内時刻(#136/#137): 誘導会話もSceneExplorer自身の会話オーバーレイと同じ「現在の
  // シーンのgame_time・会話ウィンドウ帯の右上端」表示にする(DESIGN.md「探索シーン」節
  // 「探索完了→解決への誘導」も同じ会話オーバーレイの仕組みに載ることを踏まえる)。
  // scenesが無いシナリオ(一覧フォールバックのみ)ではscenesがundefinedのためactiveGameTimeも
  // undefinedになり、GameTimeBadgeは何も描画しない(背景の箱自体を持たない画面のため、
  // DESIGN.md「ゲーム内時刻」節の表示先=背景の箱の右下/会話ウィンドウ帯自体が無い。意図的な
  // 未対応であり、対象4マップ(S1/S2/S3/SL)はいずれもscenesを持つため実害は無い)。
  const activeGameTime =
    scenes?.find((scene) => scene.id === activeSceneId)?.game_time ?? scenes?.[0]?.game_time

  const wrapUpPrompt =
    canProceed && !isExplorerConversationOpen && !isWrapUpPromptDismissed ? (
      <ConversationFrame
        layout={hasScenes ? 'overlay' : 'stacked'}
        boxOrientation={wrapUpBoxOrientation}
        speaker="橘"
        line="材料は揃ったわ。そろそろ問題を整理しましょう。"
        onOutsideDismiss={handleDismissWrapUpPrompt}
        cornerSlot={
          <GameTimeBadge gameTime={activeGameTime} compact={wrapUpBoxOrientation === 'portrait'} />
        }
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            必要な手がかりは出揃った。まとめるなら「わかった」、もう少し調べたいなら画面をタップ
            （Escapeでも可）して探索を続けよう。あとからでも右下の「解決へ進む」から進める。
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-12 px-6"
            onClick={handleEnterResolution}
          >
            わかった
          </Button>
        </div>
      </ConversationFrame>
    ) : null

  // 「解決へ進む」(#124・代表決定2026-09-14): scenesがある場合は箱の右下に重ねる
  // (SceneExplorerのenterResolutionSlotへ渡す)。誘導会話(wrapUpPrompt)の表示状態に関わらず
  // 表示する(PR#92追補・代表FB「誘導が導線を隠さない」を維持)。ただし
  // SceneExplorer自身の会話(調査結果・danger)が開いている間はSceneExplorer側の判定で
  // 非表示になる(#124秘書レビュー2回目・2026-09-14: 会話ウィンドウとの重なり解消。
  // scene-explorer.tsxのenterResolutionSlot JSDoc参照。本ファイルはボタン要素を渡すだけで
  // その表示条件には関与しない)。scenesが無い場合(一覧フォールバックのみ)は背景の箱自体が
  // 無いため、従来どおりページ下部に直接描画する。
  const enterResolutionButton = (
    <Button
      type="button"
      className="h-12 min-w-12 self-start px-6 text-base"
      disabled={!canProceed}
      onClick={handleEnterResolution}
    >
      解決へ進む
    </Button>
  )

  return (
    <ScreenContainer title="探索" variant={hasScenes ? 'immersive' : 'default'}>
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
            onActiveSceneChange={handleActiveSceneChange}
            investigationList={investigationListNode}
            conversationSlot={wrapUpPrompt}
            enterResolutionSlot={enterResolutionButton}
          />
        ) : (
          <>
            {investigationListNode}
            {wrapUpPrompt}
            {enterResolutionButton}
          </>
        )}
      </StateFrame>
    </ScreenContainer>
  )
}
