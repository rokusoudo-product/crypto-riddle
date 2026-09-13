// src/ui/lib/two-slot-frame.test.ts — 会話フレームの左右2枠の入れ替わり方式(#108/#110)の単体テスト。
//
// Issue #110 完了条件: 「並びを決めるロジックは純粋関数として切り出し、単体テストする」
// 「代表の例(A→B→A→C)」「DESIGN.md の導入9行の見え方の表」「NPCを挟むケース」
// 「リセット後に最初の話者が左に入ること」をテストケースに含める。
import { describe, expect, it } from 'vitest'

import { layoutTwoSlotFrame, type TwoSlotSpeaker } from './two-slot-frame'

/** 履歴配列から左右の表示を簡潔に検証するためのヘルパ。 */
function slots(speakers: readonly TwoSlotSpeaker[]) {
  const frame = layoutTwoSlotFrame(speakers)
  return {
    left: frame.left ? { character: frame.left.character, speaking: frame.left.speaking } : null,
    right: frame.right
      ? { character: frame.right.character, speaking: frame.right.speaking }
      : null,
    npcSpeaking: frame.npcSpeaking,
  }
}

describe('layoutTwoSlotFrame(#108 左右2枠の入れ替わり方式)', () => {
  it('リセット後(空履歴)は両枠とも空になる', () => {
    expect(slots([])).toEqual({ left: null, right: null, npcSpeaking: false })
  })

  it('最初に話した人は左に入る(右は空のまま)', () => {
    expect(slots(['霧島'])).toEqual({
      left: { character: '霧島', speaking: true },
      right: null,
      npcSpeaking: false,
    })
  })

  describe('代表の例: A(霧島)→B(橘)→A(霧島)→C(小鳥遊)', () => {
    it('A: 左A・右なし', () => {
      expect(slots(['霧島'])).toEqual({
        left: { character: '霧島', speaking: true },
        right: null,
        npcSpeaking: false,
      })
    })

    it('B: 左Aグレー・右B(画面にいない人が話す→直前の話者でない枠へ)', () => {
      expect(slots(['霧島', '橘'])).toEqual({
        left: { character: '霧島', speaking: false },
        right: { character: '橘', speaking: true },
        npcSpeaking: false,
      })
    })

    it('A: 左A・右Bグレー(画面にいる人が話す→位置そのまま)', () => {
      expect(slots(['霧島', '橘', '霧島'])).toEqual({
        left: { character: '霧島', speaking: true },
        right: { character: '橘', speaking: false },
        npcSpeaking: false,
      })
    })

    it('C: 左Aグレー・右C(直前の話者=Aでない枠=右へ、Bと入れ替わり)', () => {
      expect(slots(['霧島', '橘', '霧島', '小鳥遊'])).toEqual({
        left: { character: '霧島', speaking: false },
        right: { character: '小鳥遊', speaking: true },
        npcSpeaking: false,
      })
    })
  })

  // DESIGN.md「会話フレーム」節: 導入9行(台本v2.2)の話者順=小鳥遊・小鳥遊・霧島・小鳥遊・霧島・
  // 橘・橘・霧島・小鳥遊。各行の見え方の表をそのままテストケースにする(1行ずつ検証)。
  describe('DESIGN.md 導入9行の見え方の表', () => {
    const speakerSequence: TwoSlotSpeaker[] = [
      '小鳥遊',
      '小鳥遊',
      '霧島',
      '小鳥遊',
      '霧島',
      '橘',
      '橘',
      '霧島',
      '小鳥遊',
    ]

    const expectedRows = [
      { left: { character: '小鳥遊', speaking: true }, right: null },
      { left: { character: '小鳥遊', speaking: true }, right: null },
      {
        left: { character: '小鳥遊', speaking: false },
        right: { character: '霧島', speaking: true },
      },
      {
        left: { character: '小鳥遊', speaking: true },
        right: { character: '霧島', speaking: false },
      },
      {
        left: { character: '小鳥遊', speaking: false },
        right: { character: '霧島', speaking: true },
      },
      { left: { character: '橘', speaking: true }, right: { character: '霧島', speaking: false } },
      { left: { character: '橘', speaking: true }, right: { character: '霧島', speaking: false } },
      {
        left: { character: '橘', speaking: false },
        right: { character: '霧島', speaking: true },
      },
      {
        left: { character: '小鳥遊', speaking: true },
        right: { character: '霧島', speaking: false },
      },
    ] as const

    it.each(expectedRows.map((expected, index) => ({ index, expected })))(
      '行$index',
      ({ index, expected }) => {
        const history = speakerSequence.slice(0, index + 1)
        expect(slots(history)).toEqual({ ...expected, npcSpeaking: false })
      },
    )
  })

  describe('NPCを挟むケース', () => {
    it('NPCが話すときは枠を動かさず両方グレー、npcSpeaking=true', () => {
      expect(slots(['霧島', '橘', { npc: '中野' }])).toEqual({
        left: { character: '霧島', speaking: false },
        right: { character: '橘', speaking: false },
        npcSpeaking: true,
      })
    })

    it('支援役→NPC→別の支援役: NPCの前の支援役(直前の話者)を基準に入れ替わる', () => {
      // 霧島(左)→橘(右、直前=橘)→NPC(両方グレー、直前は橘のまま)→小鳥遊(画面にいない
      // →直前でない方=左(霧島の枠)に入る)。
      expect(slots(['霧島', '橘', { npc: '中野' }, '小鳥遊'])).toEqual({
        left: { character: '小鳥遊', speaking: true },
        right: { character: '橘', speaking: false },
        npcSpeaking: false,
      })
    })

    it('支援役→NPC→同じ支援役: 画面にいる(枠に残っている)ため位置そのままカラーに戻る', () => {
      expect(slots(['霧島', '橘', { npc: '中野' }, '橘'])).toEqual({
        left: { character: '霧島', speaking: false },
        right: { character: '橘', speaking: true },
        npcSpeaking: false,
      })
    })

    it('NPCが最初の発話でも両枠は空のまま(次の支援役は左から始まる)', () => {
      expect(slots([{ npc: '中野' }])).toEqual({ left: null, right: null, npcSpeaking: true })
      expect(slots([{ npc: '中野' }, '霧島'])).toEqual({
        left: { character: '霧島', speaking: true },
        right: null,
        npcSpeaking: false,
      })
    })
  })

  describe('並びのリセット', () => {
    it('リセット後(新しい履歴配列)は最初の話者が再び左に入る', () => {
      // 「橘→霧島」まで進んだ状態(橘は左、霧島は右)から、新しい会話(履歴を空から開始)で
      // 霧島が最初に話しても、左に入る(前の会話の並びを引き継がない)。
      const previousConversation = slots(['橘', '霧島'])
      expect(previousConversation.left).toEqual({ character: '橘', speaking: false })

      const newConversation = slots(['霧島'])
      expect(newConversation).toEqual({
        left: { character: '霧島', speaking: true },
        right: null,
        npcSpeaking: false,
      })
    })
  })

  it('同じ発話者が連続しても冪等(位置は変わらない)', () => {
    expect(slots(['霧島', '霧島', '霧島'])).toEqual({
      left: { character: '霧島', speaking: true },
      right: null,
      npcSpeaking: false,
    })
  })
})
