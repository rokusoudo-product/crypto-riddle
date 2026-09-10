import { describe, expect, it } from 'vitest'

import type { CipherStage, Question } from '../model/index.ts'

import { judgeCipherStage, judgeQuestionChoice, judgeTextAnswer } from './index.ts'

describe('judgeTextAnswer', () => {
  it.each([
    // [説明, 回答, 正解, 期待値]
    ['完全一致', 'PASSWORD LIST ATTACK', 'PASSWORD LIST ATTACK', true],
    ['大文字小文字の違いを無視する', 'password list attack', 'PASSWORD LIST ATTACK', true],
    ['全角/半角の違いを無視する', 'ＰＡＳＳＷＯＲＤ', 'PASSWORD', true],
    ['カタカナ/ひらがなの違いを無視する', 'ぱすわーど', 'パスワード', true],
    ['前後の空白の違いを無視する', '  こたえ  ', 'こたえ', true],
    ['連続空白の違いを無視する', 'a    b', 'a b', true],
    ['不正解(別の単語)', 'フィッシング', 'パスワードリスト攻撃', false],
    ['部分一致は不正解(厳密一致)', 'PASSWORD', 'PASSWORD LIST ATTACK', false],
  ])('%s: judgeTextAnswer(%j, %j) === %s', (_label, submitted, expected, want) => {
    expect(judgeTextAnswer(submitted, expected)).toBe(want)
  })
})

describe('judgeQuestionChoice', () => {
  function question(overrides: Partial<Question> = {}): Question {
    return {
      id: 'q-entry-point',
      subject_tag: '攻撃手法',
      speaker: '霧島',
      prompt: 'この攻撃、どこから入られたと見る？',
      choices: [
        { text: '取引先を装ったメールの添付ファイル', is_correct: true },
        {
          text: '公開サーバーの脆弱性を突かれた',
          is_correct: false,
          reply: 'その場合だと、境界の通信記録に外→内の不審なアクセスが残るはずだ。',
        },
        {
          text: 'USBメモリの持ち込み',
          is_correct: false,
          reply: 'その線なら入退室ログか資産管理に痕跡が出る。',
        },
      ],
      consult_hint: '手元の手掛かりを分野で整理して提示',
      ...overrides,
    }
  }

  it('正解の選択肢を選ぶと correct: true とその choice を返す', () => {
    const q = question()
    const result = judgeQuestionChoice(q, 0)
    expect(result.correct).toBe(true)
    expect(result.choice).toEqual(q.choices[0])
  })

  it('誤答の選択肢を選ぶと correct: false と reply 付きの choice を返す', () => {
    const q = question()
    const result = judgeQuestionChoice(q, 1)
    expect(result.correct).toBe(false)
    expect(result.choice).toEqual(q.choices[1])
  })

  it('範囲外の choiceIndex は例外を投げる', () => {
    const q = question()
    expect(() => judgeQuestionChoice(q, 99)).toThrow()
  })
})

describe('judgeCipherStage', () => {
  function caesarStage(overrides: Partial<Extract<CipherStage, { method: 'caesar' }>> = {}) {
    return {
      id: 'cs-1',
      method: 'caesar' as const,
      ciphertext: 'SDVVZRUG OLVW DWWDFN',
      key: '3',
      key_hint: 'A→D',
      plaintext: 'PASSWORD LIST ATTACK',
      ...overrides,
    }
  }

  it('平文回答が正規化後に一致すれば正解', () => {
    expect(judgeCipherStage(caesarStage(), 'password list attack')).toBe(true)
  })

  it('平文回答が不一致なら不正解', () => {
    expect(judgeCipherStage(caesarStage(), 'phishing attack')).toBe(false)
  })
})
