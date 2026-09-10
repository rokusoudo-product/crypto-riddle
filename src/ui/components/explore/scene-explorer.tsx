// src/ui/components/explore/scene-explorer.tsx — 探索④の背景シーン表示(#52/#56・T038)。
//
// DESIGN.md「探索シーン」節が正: 背景シーン(16:9・モバイル縦はレターボックス)の上に
// クリック可能なホットスポット(実<button>・48px以上・ラベル・フォーカス可視)を重ね、
// タップして調べる。シーンタブでシーン切替(キーボード到達可能)。
//
// scenario.scenes が無い場合(省略時)は呼び出し側(explore-screen.tsx)が本コンポーネントを
// レンダーしないことで一覧表示にフォールバックする(docs/scenario_schema.md §2.5)。
//
// 背景画像(#57/T040・T039で生成済みの assets/backgrounds/bg-s1-*.png)は BACKGROUND_SRC に
// 実データがある場合のみ<img>で読み込む。無い場合(テスト専用フィクスチャの `bg-test-*` 等、
// 実背景が未生成のシーン)はトークン色のプレースホルダ(単色地+シーン名ラベル)にフォールバック
// する(#56 実装方針を維持。立ち絵と同じくrepoルートの assets/ を相対importする、
// conversation-frame.tsx と同じパターン)。
//
// ホットスポットの動作(docs/scenario_schema.md §2.5・spec §8.4):
// - collect: investigation_point_id のカードを獲得する(呼び出し側の onCollect 経由、
//   既存のINVESTIGATEイベントに接続。coreの状態機械は変更しない)。
// - danger: feedback(教育的な台詞)を表示するのみ。ペナルティ無し・操作継続可(詰み防止)。
//   dispatchは一切呼ばないため、電源を落とした後も同じホットスポットは何度でも操作できる。
// - noop: 何もせず閉じる。
// - 1ホットスポットのactionsが1件のみの場合はアクションシートを出さず、即座にそのactionを
//   実行する(spec本文「PC等で複数actionがあるものはアクションシートで選ばせる」の裏返しで、
//   1件のみ=personの「話を聞く」等は選ぶ余地が無いため即実行にする)。
//
// 人物(person)ホットスポットの証言表示(#50の探索④部分をここに統合):
// scenarioのcard/investigation_pointにはUI表示用の「話者」フィールドが無く(coreスキーマは
// #55/T037でこのIssueの対象外として凍結)、証言を語る霧島/橘の割り当てはUI側の見せ方の
// 選択に過ぎない。橘は「場を動かす司令塔」(docs/characters.md §5)であり聞き取りの進行役に
// 自然という理由で、本コンポーネントでは証言表示の話者を橘に固定する(コアデータに依存しない
// 表示上の割り当てのため、後で変更してもスキーマへの影響は無い)。
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { BookOpen, Check, Monitor, Smartphone, User, X } from 'lucide-react'

import type {
  Card,
  Character,
  HotspotAction,
  HotspotObjectType,
  Scenario,
  Scene,
  SceneHotspot,
} from '@/core/model'
import { ConversationFrame } from '@/ui/components/conversation-frame'
import { Button } from '@/ui/components/ui/button'
import { cn } from '@/ui/lib/utils'

import bgS1Office from '../../../../assets/backgrounds/bg-s1-office.png'
import bgS1Server from '../../../../assets/backgrounds/bg-s1-server.png'

/** 生成済み背景アセットのID→importの対応。無いIDはプレースホルダ表示にフォールバックする。 */
const BACKGROUND_SRC: Record<string, string> = {
  'bg-s1-office': bgS1Office,
  'bg-s1-server': bgS1Server,
}

const OBJECT_TYPE_ICON: Record<HotspotObjectType, typeof Monitor> = {
  pc: Monitor,
  person: User,
  book: BookOpen,
  device: Smartphone,
}

// 色だけに頼らず種別をラベルでも示す(DESIGN.md「探索シーン」節・WCAG 1.4.1)。
const OBJECT_TYPE_LABEL: Record<HotspotObjectType, string> = {
  pc: 'PC',
  person: '人物',
  book: '書籍',
  device: '機器',
}

/** 証言表示の話者(UI都合の固定割り当て。ファイル冒頭コメント参照)。 */
const TESTIMONY_SPEAKER: Character = '橘'

type CollectAction = Extract<HotspotAction, { kind: 'collect' }>

function collectActionsOf(hotspot: SceneHotspot): CollectAction[] {
  return hotspot.actions.filter((action): action is CollectAction => action.kind === 'collect')
}

/** ホットスポットが持つ全collect対象がすでに調査済みなら「調査済み」とみなす。 */
function isHotspotInvestigated(
  hotspot: SceneHotspot,
  investigatedPointIds: readonly string[],
): boolean {
  const ids = collectActionsOf(hotspot).map((action) => action.investigation_point_id)
  return ids.length > 0 && ids.every((id) => investigatedPointIds.includes(id))
}

/** 証言表示に使うカードを選ぶ(非ダミー優先。無ければ先頭)。 */
function pickTestimonyCard(scenario: Scenario, investigationPointId: string): Card | undefined {
  const cards = scenario.cards.filter((c) => c.investigation_point_id === investigationPointId)
  return cards.find((c) => !c.is_dummy) ?? cards[0]
}

export interface SceneExplorerProps {
  scenario: Scenario
  /** scenario.scenes(呼び出し側で存在確認済みの非空配列)。 */
  scenes: readonly Scene[]
  investigatedPointIds: readonly string[]
  /** investigation_point_id を1件獲得する(既存のINVESTIGATEイベント配線先)。 */
  onCollect: (pointId: string) => void
}

/** 探索④「背景シーン＋ホットスポット」表示(#52/#56)。一覧フォールバックは呼び出し側が併設する。 */
export function SceneExplorer({
  scenario,
  scenes,
  investigatedPointIds,
  onCollect,
}: SceneExplorerProps) {
  const tabsId = useId()
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id)
  const activeSceneIndex = Math.max(
    0,
    scenes.findIndex((s) => s.id === activeSceneId),
  )
  const activeScene = scenes[activeSceneIndex] ?? scenes[0]

  // 開いているアクションシート(複数actionを持つホットスポット用)。`${hotspotIndex}` で識別する
  // (シーン切替時にクリアするため、シーンIDを跨いだ一意化は不要)。
  const [openHotspotIndex, setOpenHotspotIndex] = useState<number | null>(null)
  const [dangerFeedback, setDangerFeedback] = useState<string | null>(null)
  const [testimony, setTestimony] = useState<{ hotspotLabel: string; line: string } | null>(null)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)
  // アクションシート・証言パネルを開いたら、フォーカスを内部の最初の操作対象へ自動的に移す
  // (ダイアログ/ディスクロージャの一般的なフォーカス管理。id経由でDOM要素を掴む方式にし、
  // Button コンポーネントの ref 転送有無に依存しないようにする)。
  const sheetFirstActionId = `${tabsId}-sheet-first-action`
  const testimonyCloseId = `${tabsId}-testimony-close`

  useEffect(() => {
    if (openHotspotIndex !== null) {
      document.getElementById(sheetFirstActionId)?.focus()
    }
  }, [openHotspotIndex, sheetFirstActionId])

  useEffect(() => {
    if (testimony) {
      document.getElementById(testimonyCloseId)?.focus()
    }
  }, [testimony, testimonyCloseId])

  function closeOverlays() {
    setOpenHotspotIndex(null)
    setDangerFeedback(null)
    setTestimony(null)
  }

  function returnFocus() {
    returnFocusRef.current?.focus()
  }

  function selectScene(index: number) {
    const scene = scenes[index]
    if (!scene) return
    setActiveSceneId(scene.id)
    closeOverlays()
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const dir = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + dir + scenes.length) % scenes.length
    selectScene(nextIndex)
    tabRefs.current[nextIndex]?.focus()
  }

  function runAction(hotspot: SceneHotspot, action: HotspotAction) {
    if (action.kind === 'collect') {
      onCollect(action.investigation_point_id)
      if (hotspot.object_type === 'person') {
        const card = pickTestimonyCard(scenario, action.investigation_point_id)
        setOpenHotspotIndex(null)
        setDangerFeedback(null)
        setTestimony({ hotspotLabel: hotspot.label, line: card?.body ?? action.label })
        return
      }
      setOpenHotspotIndex(null)
      setDangerFeedback(null)
      returnFocus()
      return
    }
    if (action.kind === 'danger') {
      // 教育的フィードバックのみ。dispatchしない=ペナルティ無し・操作継続可(詰み防止)。
      setDangerFeedback(action.feedback)
      return
    }
    // noop: 何もせず閉じる。
    setOpenHotspotIndex(null)
    setDangerFeedback(null)
    returnFocus()
  }

  function handleHotspotActivate(
    hotspot: SceneHotspot,
    hotspotIndex: number,
    trigger: HTMLButtonElement,
  ) {
    returnFocusRef.current = trigger
    setTestimony(null)
    // 単一actionのショートカット即実行は「collectのみ」の場合に限る(例: personの「話を聞く」)。
    // danger/noop単独の場合はアクションシートを経由させ、教育的フィードバックの表示先
    // (アクションシート内)を確保する(danger単独ホットスポットでもfeedbackが必ず表示される)。
    const onlyAction = hotspot.actions.length === 1 ? hotspot.actions[0] : null
    if (onlyAction && onlyAction.kind === 'collect') {
      runAction(hotspot, onlyAction)
      return
    }
    setDangerFeedback(null)
    setOpenHotspotIndex(hotspotIndex)
  }

  const openHotspot =
    openHotspotIndex !== null ? (activeScene.hotspots[openHotspotIndex] ?? null) : null

  return (
    <div className="flex flex-col gap-3">
      {scenes.length > 1 && (
        <div role="tablist" aria-label="探索シーンの切替" className="flex flex-wrap gap-2">
          {scenes.map((scene, index) => {
            const selected = scene.id === activeScene.id
            return (
              <button
                key={scene.id}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${scene.id}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel-${scene.id}`}
                tabIndex={selected ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                onClick={() => selectScene(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'h-12 min-w-12 rounded-lg border px-4 text-sm font-medium focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none',
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                {scene.title}
              </button>
            )
          })}
        </div>
      )}

      <div
        id={scenes.length > 1 ? `${tabsId}-panel-${activeScene.id}` : undefined}
        role={scenes.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={scenes.length > 1 ? `${tabsId}-tab-${activeScene.id}` : undefined}
        className="flex flex-col gap-3"
      >
        {/* 背景シーン: 16:9既定・モバイル縦は幅にフィット(レターボックス)。横回転は強制しない。
            BACKGROUND_SRC に実データがあれば<img>で読み込み、無ければ(背景未生成のシーン)
            トークン色のプレースホルダ+シーン名で成立させる。
            role="img"はプレースホルダ層(内側のdiv)にだけ付ける: WAI-ARIAのimgロールは
            Children Presentational(子孫を装飾扱いにする)ため、外側のdivに付けると
            支援技術から実<button>のホットスポットが子孫として隠れてしまう
            (<img>の場合は要素自体がimgロールを持つため同様に子孫を隠す点は変わらない)。 */}
        <div className="border-border bg-muted relative aspect-video w-full overflow-hidden rounded-lg border">
          {BACKGROUND_SRC[activeScene.background] ? (
            <img
              src={BACKGROUND_SRC[activeScene.background]}
              alt={`${activeScene.title}の背景`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label={`${activeScene.title}の背景（画像は準備中のためプレースホルダ表示）`}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="font-heading text-muted-foreground text-base sm:text-lg">
                {activeScene.title}（背景 準備中）
              </span>
            </div>
          )}
          {activeScene.hotspots.map((hotspot, hotspotIndex) => {
            const [x, y] = hotspot.position
            const Icon = OBJECT_TYPE_ICON[hotspot.object_type]
            const investigated = isHotspotInvestigated(hotspot, investigatedPointIds)
            const needsSheet = hotspot.actions.length > 1
            return (
              <Button
                key={hotspotIndex}
                type="button"
                variant="outline"
                aria-label={`${hotspot.label}（${OBJECT_TYPE_LABEL[hotspot.object_type]}）${investigated ? '・調査済み' : ''}`}
                aria-expanded={needsSheet ? openHotspotIndex === hotspotIndex : undefined}
                aria-haspopup={needsSheet ? 'true' : undefined}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                className="bg-card absolute min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 flex-col gap-1 px-2 py-1"
                onClick={(event) =>
                  handleHotspotActivate(hotspot, hotspotIndex, event.currentTarget)
                }
              >
                {investigated ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Icon aria-hidden="true" className="size-4" />
                )}
                {/* 種別を色＋アイコン＋ラベルで示す(色だけに頼らない, DESIGN.md「探索シーン」節)。 */}
                <span className="text-xs">{hotspot.label}</span>
              </Button>
            )
          })}
        </div>

        {/* アクションシート: 複数actionを持つホットスポット用(固定順・並べ替えない)。 */}
        {openHotspot && (
          <div
            role="group"
            aria-label={`${openHotspot.label}の操作`}
            className="border-primary bg-card flex flex-col gap-3 rounded-lg border-t-4 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-base">{openHotspot.label}</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="操作メニューを閉じる"
                onClick={() => {
                  setOpenHotspotIndex(null)
                  setDangerFeedback(null)
                  returnFocus()
                }}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <ul className="flex flex-col gap-2">
              {openHotspot.actions.map((action, actionIndex) => {
                const done =
                  action.kind === 'collect' &&
                  investigatedPointIds.includes(action.investigation_point_id)
                return (
                  <li key={actionIndex}>
                    <Button
                      type="button"
                      variant="outline"
                      id={actionIndex === 0 ? sheetFirstActionId : undefined}
                      className="h-12 min-w-12 w-full justify-start px-4 text-left"
                      onClick={() => runAction(openHotspot, action)}
                    >
                      {action.label}
                      {done && <span className="text-muted-foreground ml-auto text-xs">済</span>}
                    </Button>
                  </li>
                )
              })}
            </ul>
            {/* 電源を落とす等の教育的フィードバック。ペナルティ無し・操作継続可(詰み防止、spec §8.4)。
                aria-live(role=alertにしない。緊急の警告ではないため resolve-screen.tsx と同方針)。 */}
            {dangerFeedback && (
              <div
                aria-live="polite"
                className="border-border bg-background rounded-lg border p-3 text-sm"
              >
                {dangerFeedback}
              </div>
            )}
          </div>
        )}

        {/* 人物の証言は会話フレームで表示する(#50の探索④部分の統合、DESIGN.md「探索シーン」節)。 */}
        {testimony && (
          <ConversationFrame speaker={TESTIMONY_SPEAKER} line={testimony.line}>
            <p className="text-muted-foreground text-xs">{testimony.hotspotLabel}からの証言</p>
            <Button
              type="button"
              variant="outline"
              id={testimonyCloseId}
              className="h-12 min-w-12 self-start px-6"
              onClick={() => {
                setTestimony(null)
                returnFocus()
              }}
            >
              閉じる
            </Button>
          </ConversationFrame>
        )}
      </div>
    </div>
  )
}
