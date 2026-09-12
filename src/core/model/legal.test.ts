import { describe, expect, it } from 'vitest'

import { legalFileSchema, lawEntrySchema, type LawEntry } from './legal.ts'

function validLawEntry(): LawEntry {
  return {
    id: 'LAW-APPI-BREACH-REPORT',
    law_name: '個人情報の保護に関する法律',
    article: '第26条',
    title: '漏えい等の報告等',
    report_deadline: '速報: 概ね3〜5日以内。確報: 30日以内。',
    summary: '個人データ漏えい時の報告義務。',
    last_verified: '2026-08-07',
    source_url: 'https://www.ppc.go.jp/',
  }
}

describe('lawEntrySchema', () => {
  it('正常系: 妥当な法制度データを受理する', () => {
    expect(lawEntrySchema.safeParse(validLawEntry()).success).toBe(true)
  })

  it('境界: source_url を省略しても受理する', () => {
    const entry = validLawEntry()
    delete (entry as Partial<LawEntry>).source_url
    expect(lawEntrySchema.safeParse(entry).success).toBe(true)
  })

  it('reject: id が LAW- prefix でない場合を拒否する', () => {
    const entry = validLawEntry()
    entry.id = 'APPI-BREACH-REPORT'
    expect(lawEntrySchema.safeParse(entry).success).toBe(false)
  })

  it('reject: last_verified が日付形式でない場合を拒否する', () => {
    const entry = validLawEntry()
    entry.last_verified = '2026/08/07'
    expect(lawEntrySchema.safeParse(entry).success).toBe(false)
  })

  it('reject: source_url が URL でない場合を拒否する', () => {
    const entry = validLawEntry()
    entry.source_url = 'not-a-url'
    expect(lawEntrySchema.safeParse(entry).success).toBe(false)
  })
})

describe('legalFileSchema', () => {
  it('正常系: schema_version + laws 配列を受理する', () => {
    const file = { schema_version: '0.1.0', laws: [validLawEntry()] }
    expect(legalFileSchema.safeParse(file).success).toBe(true)
  })

  it('reject: laws が空配列の場合を拒否する', () => {
    expect(legalFileSchema.safeParse({ schema_version: '0.1.0', laws: [] }).success).toBe(false)
  })
})
