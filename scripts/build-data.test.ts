import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { s1TargetedEmailIntrusionFixture } from '../src/core/scenario/fixtures/s1-targeted-email-intrusion.fixture.ts'
import { s2VpnRansomwareFixture } from '../src/core/scenario/fixtures/s2-vpn-ransomware.fixture.ts'
import { s3EcCardLeakFixture } from '../src/core/scenario/fixtures/s3-ec-card-leak.fixture.ts'

import { runBuild } from './build-data.ts'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')

const VALID_LEGAL_YAML = `
schema_version: "0.1.0"
laws:
  - id: LAW-TEST-LAW
    law_name: テスト法
    article: 第1条
    title: テスト
    report_deadline: 速やかに
    summary: テスト用の法制度データ。
    last_verified: "2026-09-09"
`

function validScenarioYaml(id: string): string {
  return `
schema_version: "0.6.0"
id: ${id}
title: テストシナリオ
subject_tags: [ネットワーク基盤]
difficulty: 1
estimated_minutes: 10
intro:
  background: x
  victim_company:
    name: x
    description: x
  character_intros:
    - character: 霧島
      line: x
investigation_points:
  - id: ip-1
    category: ログを見る
    label: x
    description: x
cards:
  - id: card-1
    type: ログ
    source: x
    investigation_point_id: ip-1
    body: x
    is_dummy: false
  - id: card-2
    type: 対策
    source: x
    investigation_point_id: ip-1
    body: x
    is_dummy: false
resolution:
  cipher_stages:
    - id: cs-1
      method: caesar
      ciphertext: x
      key: "1"
      key_hint: x
      plaintext: X
  questions:
    - id: q-1
      subject_tag: ネットワーク基盤
      speaker: 霧島
      prompt: x
      choices:
        - text: A
          is_correct: true
        - text: B
          is_correct: false
          reply: x
      consult_hint: x
  clear_explanation:
    - character: 霧島
      line: x
  legal_refs: [LAW-TEST-LAW]
`
}

async function makeFixtureDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'crypto-riddle-build-data-'))
  await mkdir(path.join(dir, 'scenarios'), { recursive: true })
  await mkdir(path.join(dir, 'terms'), { recursive: true })
  await mkdir(path.join(dir, 'legal'), { recursive: true })
  return dir
}

const createdDirs: string[] = []

afterEach(async () => {
  await Promise.all(createdDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

describe('runBuild — 実リポジトリのサンプルデータ', () => {
  it('scenarios/*.yaml・terms/*.yaml・legal/*.yaml がすべて検証を通過し JSON 化できる', async () => {
    const result = await runBuild(REPO_ROOT)
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.scenarios.length).toBeGreaterThan(0)
    expect(result.terms.length).toBeGreaterThan(0)
    expect(result.laws.length).toBeGreaterThan(0)
    // terms_core.yaml が Issue #22 で7種目(ネットワーク基盤)を使用していることの回帰確認。
    expect(result.terms.some((t) => t.subject_tags.includes('ネットワーク基盤'))).toBe(true)
  })

  // T015(Issue #5): S1 の TypeScript フィクスチャ(src/ui/store/game-store.ts が既定データとして使う)は
  // scenarios/s1-targeted-email-intrusion.yaml の手書きの写しであり、乖離するとゲーム内表示と
  // YAML(正本)がずれてしまう。runBuild の結果と突き合わせて一致を保証する回帰テスト。
  it('S1 の YAML から生成した内容が s1-targeted-email-intrusion.fixture.ts と一致する', async () => {
    const result = await runBuild(REPO_ROOT)
    const s1 = result.scenarios.find((s) => s.id === 's1-targeted-email-intrusion')
    expect(s1).toEqual(s1TargetedEmailIntrusionFixture)
  })

  // Issue #74(#6量産1本目): S2 も S1 と同じ理由(src/ui/store/game-store.ts が既定データ等として
  // 使う TypeScript フィクスチャは scenarios/s2-vpn-ransomware.yaml の手書きの写し)で、
  // 乖離検出の回帰テストを対にして追加する。
  it('S2 の YAML から生成した内容が s2-vpn-ransomware.fixture.ts と一致する', async () => {
    const result = await runBuild(REPO_ROOT)
    const s2 = result.scenarios.find((s) => s.id === 's2-vpn-ransomware')
    expect(s2).toEqual(s2VpnRansomwareFixture)
  })

  // Issue #75(#6量産2本目): S3 も S1/S2 と同じ理由(src/ui/store/game-store.ts が既定データ等として
  // 使う TypeScript フィクスチャは scenarios/s3-ec-card-leak.yaml の手書きの写し)で、
  // 乖離検出の回帰テストを対にして追加する。
  it('S3 の YAML から生成した内容が s3-ec-card-leak.fixture.ts と一致する', async () => {
    const result = await runBuild(REPO_ROOT)
    const s3 = result.scenarios.find((s) => s.id === 's3-ec-card-leak')
    expect(s3).toEqual(s3EcCardLeakFixture)
  })
})

describe('runBuild — フィクスチャ(壊れたYAML)', () => {
  it('正常なフィクスチャは ok:true になる', async () => {
    const dir = await makeFixtureDir()
    createdDirs.push(dir)
    await writeFile(path.join(dir, 'legal', 'laws.yaml'), VALID_LEGAL_YAML, 'utf-8')
    await writeFile(path.join(dir, 'scenarios', 's1-test.yaml'), validScenarioYaml('s1-test'), 'utf-8')

    const result = await runBuild(dir)
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.scenarios).toHaveLength(1)
  })

  it('壊れたYAML(必須項目欠落)があると ok:false になり検証が失敗する', async () => {
    const dir = await makeFixtureDir()
    createdDirs.push(dir)
    await writeFile(path.join(dir, 'legal', 'laws.yaml'), VALID_LEGAL_YAML, 'utf-8')
    // difficulty を欠落させた壊れたシナリオ
    const broken = validScenarioYaml('s1-broken').replace('difficulty: 1\n', '')
    await writeFile(path.join(dir, 'scenarios', 's1-broken.yaml'), broken, 'utf-8')

    const result = await runBuild(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some((e) => e.includes('s1-broken.yaml'))).toBe(true)
  })

  it('シンタックスエラーのあるYAMLがあると ok:false になる', async () => {
    const dir = await makeFixtureDir()
    createdDirs.push(dir)
    await writeFile(path.join(dir, 'legal', 'laws.yaml'), VALID_LEGAL_YAML, 'utf-8')
    await writeFile(path.join(dir, 'scenarios', 's1-syntax.yaml'), 'id: [unclosed', 'utf-8')

    const result = await runBuild(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('パースに失敗'))).toBe(true)
  })

  it('ファイル名とシナリオ id が一致しない場合エラーになる', async () => {
    const dir = await makeFixtureDir()
    createdDirs.push(dir)
    await writeFile(path.join(dir, 'legal', 'laws.yaml'), VALID_LEGAL_YAML, 'utf-8')
    await writeFile(path.join(dir, 'scenarios', 'wrong-filename.yaml'), validScenarioYaml('s1-test'), 'utf-8')

    const result = await runBuild(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('ファイル名'))).toBe(true)
  })

  it('legal_refs が存在しない法制度IDを参照しているとエラーになる', async () => {
    const dir = await makeFixtureDir()
    createdDirs.push(dir)
    await writeFile(path.join(dir, 'legal', 'laws.yaml'), VALID_LEGAL_YAML, 'utf-8')
    const scenario = validScenarioYaml('s1-test').replace('LAW-TEST-LAW', 'LAW-NOT-EXIST')
    await writeFile(path.join(dir, 'scenarios', 's1-test.yaml'), scenario, 'utf-8')

    const result = await runBuild(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('legal_refs'))).toBe(true)
  })

  it('用語カードなし・シナリオなしの空リポジトリでも例外を投げない', async () => {
    const dir = await makeFixtureDir()
    createdDirs.push(dir)
    const result = await runBuild(dir)
    expect(result.ok).toBe(true)
    expect(result.scenarios).toEqual([])
    expect(result.terms).toEqual([])
  })
})
