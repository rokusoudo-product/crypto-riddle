// src/core/model/validate-collection.ts — 複数ファイルにまたがる参照整合性チェック(純関数)。
//
// 単一シナリオ・単一用語カード内で完結するチェックは各スキーマの superRefine に持たせているが、
// 「ファイル名と id の一致」「legal_refs が別ファイルの legal データに実在するか」「用語カードマスタ
// 全体で id が重複していないか」等は、複数ファイルを読み込んだ後でなければ判定できない。
// 旧 scripts/validate_scenarios.py / scripts/validate_terms.py が担っていたこの種のチェックを
// 移植し、fs に依存しない純粋関数として提供する(T010 のビルドスクリプトから呼び出す。
// fs・js-yaml による実際のファイル読み込みは scripts/build-data.ts 側の責務)。
//
// core/ は React および src/ui/ を import してはならない（plan.md §2、advisor 承認条件）。
import type { LawEntry } from './legal.ts'
import type { MisuseQuizItem } from './quiz-misuse.ts'
import type { Scenario } from './scenario.ts'
import type { TermCard } from './term-card.ts'

export interface NamedFile<T> {
  /** リポジトリルートからの相対パス(エラーメッセージ表示用)。 */
  filename: string
  data: T
}

/** シナリオファイル名(拡張子除く)と scenario.id の一致を確認する。 */
export function checkScenarioFilenames(scenarios: NamedFile<Scenario>[]): string[] {
  const errors: string[] = []
  for (const { filename, data } of scenarios) {
    const stem =
      filename
        .replace(/\.(ya?ml)$/i, '')
        .split(/[/\\]/)
        .pop() ?? filename
    if (stem !== data.id) {
      errors.push(`${filename}: ファイル名 '${stem}' とシナリオ id '${data.id}' が一致しません。`)
    }
  }
  return errors
}

/** legal/*.yaml から集めた LawEntry 群から id 一覧を作り、重複を検出する。 */
export function collectLawIds(laws: NamedFile<LawEntry>[]): { ids: Set<string>; errors: string[] } {
  const ids = new Set<string>()
  const errors: string[] = []
  for (const { filename, data } of laws) {
    if (ids.has(data.id)) {
      errors.push(`${filename}: 法制度データ id 重複: ${data.id}`)
    }
    ids.add(data.id)
  }
  return { ids, errors }
}

/** シナリオの resolution.legal_refs が既知の法制度データ id として解決できるか確認する。 */
export function checkScenarioLegalRefs(
  scenarios: NamedFile<Scenario>[],
  knownLawIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = []
  for (const { filename, data } of scenarios) {
    for (const legalId of data.resolution.legal_refs ?? []) {
      if (!knownLawIds.has(legalId)) {
        errors.push(`${filename}: legal_refs の '${legalId}' が legal/*.yaml 内に見つかりません。`)
      }
    }
  }
  return errors
}

/**
 * spec §8.3「本質的でない対策を誤答肢に」を満たしているかの目安(警告のみ)。
 * type='対策' のダミーカードが1件も無いシナリオのファイル名一覧を返す。
 */
export function warnScenariosMissingCountermeasureDummy(
  scenarios: NamedFile<Scenario>[],
): string[] {
  return scenarios
    .filter(({ data }) => !data.cards.some((card) => card.type === '対策' && card.is_dummy))
    .map(({ filename }) => filename)
}

/** terms/*.yaml 全体から用語カード id の重複を検出し、id -> TermCard の索引を作る。 */
export function collectTerms(termFiles: NamedFile<TermCard[]>[]): {
  byId: Map<string, TermCard>
  errors: string[]
} {
  const byId = new Map<string, TermCard>()
  const errors: string[] = []
  for (const { filename, data } of termFiles) {
    for (const term of data) {
      if (byId.has(term.id)) {
        errors.push(`${filename}: 用語カード id 重複: ${term.id}`)
      } else {
        byId.set(term.id, term)
      }
    }
  }
  return { byId, errors }
}

/** 用語カードマスタ内での related_terms の実在確認(自己参照は禁止)。 */
export function checkTermReferences(byId: ReadonlyMap<string, TermCard>): string[] {
  const errors: string[] = []
  for (const [id, term] of byId) {
    for (const ref of term.related_terms ?? []) {
      if (ref === id) {
        errors.push(`terms: 用語カード '${id}' の related_terms が自分自身を参照しています。`)
      } else if (!byId.has(ref)) {
        errors.push(
          `terms: 用語カード '${id}' の related_terms '${ref}' がマスタ内に見つかりません。`,
        )
      }
    }
  }
  return errors
}

/** 誤用検出クイズの id 重複と term_id/confused_with_term_id の実在確認。 */
export function checkQuizItems(
  quizFiles: NamedFile<MisuseQuizItem[]>[],
  knownTermIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = []
  const seenIds = new Set<string>()
  for (const { filename, data } of quizFiles) {
    for (const item of data) {
      if (seenIds.has(item.id)) {
        errors.push(`${filename}: クイズ id 重複: ${item.id}`)
      }
      seenIds.add(item.id)

      if (!knownTermIds.has(item.term_id)) {
        errors.push(
          `${filename}: quiz '${item.id}' の term_id '${item.term_id}' が用語カードマスタに見つかりません。`,
        )
      }
      if (item.confused_with_term_id && !knownTermIds.has(item.confused_with_term_id)) {
        errors.push(
          `${filename}: quiz '${item.id}' の confused_with_term_id '${item.confused_with_term_id}' が用語カードマスタに見つかりません。`,
        )
      }
    }
  }
  return errors
}
