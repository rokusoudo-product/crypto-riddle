import type { ScenarioReference } from '@/core/model'
import { PrimaryAction, SecondaryAction } from '@/ui/components/screen-actions'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { computeClearXpReward } from '@/ui/store/save-integration'
import { useGameStore } from '@/ui/store/game-store'
import { useScreenState } from '@/ui/state/use-screen-state'

// docs/citation-policy.md §5 の exam コードを画面表示用の正式名称へ展開する(§3 表記例)。
const EXAM_FULL_NAME: Record<NonNullable<ScenarioReference['exam']>, string> = {
  SC: '情報処理安全確保支援士試験',
  NW: 'ネットワークスペシャリスト試験',
}

/** citation-policy §3 の表記(例: 「情報処理安全確保支援士試験 令和6年度 春期 午後 問2（攻撃手口）」)を組み立てる。 */
function formatReference(ref: ScenarioReference): string {
  const head = [
    ref.exam ? EXAM_FULL_NAME[ref.exam] : null,
    ref.year_jp,
    ref.season,
    ref.division,
    ref.question,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ')
  const label = head.length > 0 ? `${head}（${ref.material_kind}）` : `（${ref.material_kind}）`
  return ref.note ? `${label} ${ref.note}` : label
}

// ⑦結果（ダーク文脈）。目的=判定・用語・出典／主要アクション=次へ・図鑑。
// T013: クリア時の core ステートマシンの内容(clear_explanation)を表示する。
// T015/T016: 出典表記(references, docs/citation-policy.md §4 の主表示位置)と、クリアで加算された
// XP・累計XPを表示する(FR-6・FR-7)。
// SaveStorage への保存(クリア時)は store 側(dispatch)で行われるため、ここでは保存状態
// (saveStatus)を確認して保存完了/失敗のフィードバックのみを表示する。
export function ResultScreen() {
  const state = useScreenState()
  const scenario = useGameStore((s) => s.scenario)
  const progress = useGameStore((s) => s.progress)
  const saveStatus = useGameStore((s) => s.saveStatus)
  const saveData = useGameStore((s) => s.saveData)

  const cleared = progress.part === 'clear'
  const wrongAnswerCount = Object.values(progress.wrongAttemptsByQuestionId).reduce(
    (sum, n) => sum + n,
    0,
  )
  const xpEarned = computeClearXpReward(progress)

  return (
    <ScreenContainer title="結果">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">保存しています…</p>}
        error={<p className="text-destructive">保存に失敗しました。</p>}
      >
        {cleared ? (
          <>
            {/* T033/#45: 最後の問いの正解 reply は、正解と同時に /result へ遷移するため解決画面
                (⑤)では表示する間がない。progress.lastAnswerFeedback は dispatch 後も game-store に
                残り続けるため、ここで参照して表示する(advisor 指摘)。 */}
            {progress.lastAnswerFeedback?.correct === true && progress.lastAnswerFeedback.reply && (
              <p className="border-border bg-card rounded-lg border p-3 text-sm">
                {progress.lastAnswerFeedback.reply}
              </p>
            )}
            <ul className="flex flex-col gap-3">
              {scenario.resolution.clear_explanation.map((line, index) => (
                <li key={index} className="border-border bg-card rounded-lg border p-3">
                  <span className="font-semibold">{line.character}</span>「{line.line}」
                </li>
              ))}
            </ul>
            <ul className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4 text-sm">
              {/* 2026-09-10(#42/#44): 会話モードへの刷新で単一の attack_name/countermeasure.summary
                  が questions[] へ分解されたため、各問いの正解選択肢を列挙する形に変更した。
                  会話モードUIとしての本格的な見せ方は #45(T033)で検討する。 */}
              {scenario.resolution.questions.map((question) => {
                const correctChoice = question.choices.find((c) => c.is_correct)
                return (
                  <li key={question.id}>
                    {question.prompt}: {correctChoice?.text}
                  </li>
                )
              })}
              {/* T034(FR-11, spec §8.4): 誤答・相談回数と、それを反映した獲得XPを表示する。 */}
              <li>
                誤答: {wrongAnswerCount}回 / 相談: {progress.consultsUsed}回
              </li>
              <li>獲得XP: +{xpEarned}</li>
              <li>累計XP: {saveData?.xp ?? 0}</li>
            </ul>
            {scenario.references && scenario.references.length > 0 && (
              <ul className="border-border bg-card flex flex-col gap-1 rounded-lg border p-4 text-sm">
                <li className="font-semibold">
                  本シナリオは以下を参考に作成したオリジナルの創作です。
                </li>
                {scenario.references.map((ref, index) => (
                  <li key={index} className="text-muted-foreground">
                    ・{formatReference(ref)}
                  </li>
                ))}
              </ul>
            )}
            {saveStatus === 'error' && (
              <p role="alert" className="text-destructive">
                セーブデータの保存に失敗しました(端末のストレージ容量等をご確認ください)。
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">まだこのマップをクリアしていません。</p>
        )}
        <div className="flex flex-wrap gap-4">
          <PrimaryAction to="/maps">次へ</PrimaryAction>
          <SecondaryAction to="/cards">図鑑</SecondaryAction>
        </div>
      </StateFrame>
    </ScreenContainer>
  )
}
