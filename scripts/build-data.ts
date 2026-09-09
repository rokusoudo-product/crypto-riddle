#!/usr/bin/env node
// scripts/build-data.ts — YAML→JSON ビルドパイプライン（T010）。
//
// `scenarios/*.yaml` / `terms/*.yaml`（誤用検出クイズを含む） / `legal/*.yaml` を読み込み、
// `src/core/model/`（T005 の zod スキーマ）で検証したうえで `src/data/*.json` に書き出す
// （plan.md §4: YAML はオーサリング用の入力形式、zod スキーマが正）。
//
// アプリ本体（src/）には YAML パーサを載せない方針のため、js-yaml は本スクリプト専用の
// devDependency として扱う。実行は `npm run build:data`（内部で Node 24 のネイティブ
// TypeScript 実行（type stripping）を使い `node scripts/build-data.ts` を呼ぶ）。
//
// 単一エンティティ内の参照整合性チェックは各 zod スキーマの superRefine 側に、複数ファイルに
// またがる参照整合性チェック（ファイル名/id 一致・legal_refs の実在・用語カード id 重複・
// related_terms の実在・クイズの term_id 実在等）は src/core/model/validate-collection.ts の
// 純関数側に実装している（旧 scripts/validate_scenarios.py / scripts/validate_terms.py の
// 相当ロジックを移植・一本化。両スクリプトは本 PR で削除する）。
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as yaml from 'js-yaml'

import {
  checkQuizItems,
  checkScenarioFilenames,
  checkScenarioLegalRefs,
  checkTermReferences,
  collectLawIds,
  collectTerms,
  legalFileSchema,
  quizMisuseFileSchema,
  scenarioSchema,
  termsFileSchema,
  warnScenariosMissingCountermeasureDummy,
  type LawEntry,
  type MisuseQuizItem,
  type NamedFile,
  type Scenario,
  type TermCard,
} from '../src/core/model/index.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

export interface BuildResult {
  ok: boolean
  errors: string[]
  warnings: string[]
  scenarios: Scenario[]
  terms: TermCard[]
  quizItems: MisuseQuizItem[]
  laws: LawEntry[]
}

async function listYamlFiles(dir: string): Promise<string[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  return entries
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort()
    .map((f) => path.join(dir, f))
}

async function loadYaml(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, 'utf-8')
  return yaml.load(content)
}

function relPath(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).split(path.sep).join('/')
}

function formatIssues(filename: string, error: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return error.issues.map(
    (issue) => `${filename}: [${issue.path.map(String).join('/') || '(root)'}] ${issue.message}`,
  )
}

/**
 * scenarios/*.yaml・terms/*.yaml・legal/*.yaml を読み込み検証する(純粋な入出力+検証のオーケストレーション)。
 * fs には依存するが JSON の書き出しは行わない（テストしやすいよう分離。書き出しは writeDataFiles）。
 */
export async function runBuild(rootDir: string = REPO_ROOT): Promise<BuildResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // --- legal/*.yaml ---
  const legalFilePaths = await listYamlFiles(path.join(rootDir, 'legal'))
  const lawEntries: NamedFile<LawEntry>[] = []
  for (const filePath of legalFilePaths) {
    const filename = relPath(rootDir, filePath)
    let raw: unknown
    try {
      raw = await loadYaml(filePath)
    } catch (e) {
      errors.push(`${filename}: YAML のパースに失敗しました(${(e as Error).message})`)
      continue
    }
    const parsed = legalFileSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push(...formatIssues(filename, parsed.error))
      continue
    }
    for (const law of parsed.data.laws) lawEntries.push({ filename, data: law })
  }
  const { ids: knownLawIds, errors: lawIdErrors } = collectLawIds(lawEntries)
  errors.push(...lawIdErrors)

  // --- scenarios/*.yaml ---
  const scenarioFilePaths = await listYamlFiles(path.join(rootDir, 'scenarios'))
  const scenarioEntries: NamedFile<Scenario>[] = []
  for (const filePath of scenarioFilePaths) {
    const filename = relPath(rootDir, filePath)
    let raw: unknown
    try {
      raw = await loadYaml(filePath)
    } catch (e) {
      errors.push(`${filename}: YAML のパースに失敗しました(${(e as Error).message})`)
      continue
    }
    const parsed = scenarioSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push(...formatIssues(filename, parsed.error))
      continue
    }
    scenarioEntries.push({ filename, data: parsed.data })
  }
  errors.push(...checkScenarioFilenames(scenarioEntries))
  errors.push(...checkScenarioLegalRefs(scenarioEntries, knownLawIds))
  warnings.push(
    ...warnScenariosMissingCountermeasureDummy(scenarioEntries).map(
      (f) => `${f}: type='対策' のダミーカードが見つかりません(spec §8.3 の目安。エラーにはしない)。`,
    ),
  )

  // --- terms/*.yaml（quiz を含まないファイル） ---
  const termFilePaths = (await listYamlFiles(path.join(rootDir, 'terms'))).filter(
    (f) => !path.basename(f).includes('quiz'),
  )
  const termFileEntries: NamedFile<TermCard[]>[] = []
  for (const filePath of termFilePaths) {
    const filename = relPath(rootDir, filePath)
    let raw: unknown
    try {
      raw = await loadYaml(filePath)
    } catch (e) {
      errors.push(`${filename}: YAML のパースに失敗しました(${(e as Error).message})`)
      continue
    }
    const parsed = termsFileSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push(...formatIssues(filename, parsed.error))
      continue
    }
    termFileEntries.push({ filename, data: parsed.data.terms })
  }
  const { byId: termsById, errors: termIdErrors } = collectTerms(termFileEntries)
  errors.push(...termIdErrors)
  errors.push(...checkTermReferences(termsById))

  // --- terms/*quiz*.yaml ---
  const quizFilePaths = (await listYamlFiles(path.join(rootDir, 'terms'))).filter((f) =>
    path.basename(f).includes('quiz'),
  )
  const quizFileEntries: NamedFile<MisuseQuizItem[]>[] = []
  for (const filePath of quizFilePaths) {
    const filename = relPath(rootDir, filePath)
    let raw: unknown
    try {
      raw = await loadYaml(filePath)
    } catch (e) {
      errors.push(`${filename}: YAML のパースに失敗しました(${(e as Error).message})`)
      continue
    }
    const parsed = quizMisuseFileSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push(...formatIssues(filename, parsed.error))
      continue
    }
    quizFileEntries.push({ filename, data: parsed.data.quiz_items })
  }
  errors.push(...checkQuizItems(quizFileEntries, new Set(termsById.keys())))

  const scenarios = scenarioEntries
    .map((s) => s.data)
    .sort(
      (a, b) =>
        (a.map_order ?? Number.MAX_SAFE_INTEGER) - (b.map_order ?? Number.MAX_SAFE_INTEGER) ||
        a.id.localeCompare(b.id),
    )
  const terms = [...termsById.values()].sort((a, b) => a.id.localeCompare(b.id))
  const quizItems = quizFileEntries.flatMap((f) => f.data)
  const laws = lawEntries.map((f) => f.data)

  return { ok: errors.length === 0, errors, warnings, scenarios, terms, quizItems, laws }
}

/** 検証済みデータを src/data/*.json に書き出す(runBuild とは分離し、テストしやすくする)。 */
export async function writeDataFiles(rootDir: string, result: BuildResult): Promise<void> {
  const outDir = path.join(rootDir, 'src', 'data')
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'scenarios.json'), `${JSON.stringify(result.scenarios, null, 2)}\n`, 'utf-8')
  await writeFile(path.join(outDir, 'terms.json'), `${JSON.stringify(result.terms, null, 2)}\n`, 'utf-8')
  await writeFile(path.join(outDir, 'quiz-misuse.json'), `${JSON.stringify(result.quizItems, null, 2)}\n`, 'utf-8')
  await writeFile(path.join(outDir, 'legal.json'), `${JSON.stringify(result.laws, null, 2)}\n`, 'utf-8')
}

async function main(): Promise<void> {
  const result = await runBuild(REPO_ROOT)

  if (result.warnings.length > 0) {
    console.warn('警告:')
    for (const w of result.warnings) console.warn(`  - ${w}`)
  }

  if (!result.ok) {
    console.error('エラー:')
    for (const e of result.errors) console.error(`  - ${e}`)
    console.error(`\n${result.errors.length} 件のエラーがあります。`)
    process.exitCode = 1
    return
  }

  await writeDataFiles(REPO_ROOT, result)
  console.log(
    `OK: シナリオ${result.scenarios.length}件・用語カード${result.terms.length}件・` +
      `誤用検出クイズ${result.quizItems.length}件・法制度データ${result.laws.length}件を src/data/ に生成しました。`,
  )
}

const isMainModule = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMainModule) {
  main()
}
