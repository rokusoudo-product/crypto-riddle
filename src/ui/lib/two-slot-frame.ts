// src/ui/lib/two-slot-frame.ts — 会話フレームの左右2枠の入れ替わり方式(#108/#110)を決める純粋関数。
//
// DESIGN.md「会話フレーム」節「左右2枠の入れ替わり方式」が正本:
// - 最初に話した人は左に入る(右は空のまま)。
// - 画面にいる人(=既にどちらかの枠に入っている人)が話す: その人の枠をカラーにし、もう一方を
//   グレーにする(位置は動かさない)。
// - 画面にいない人が話す: 直前に話した人ではない方の枠(空いていればそこ)にその人を入れ、
//   直前に話した人の枠をグレーにする。
// - NPCが話すとき: 枠は動かさず両方グレーにする。NPCの次に支援役が話すときは、NPCの前に
//   話していた支援役を「直前に話した人」として扱う(NPC発話では lastSupportSpeaker を更新しない)。
// - 並びのリセット: 呼び出し側が「今の会話1つ分の発話者履歴」を空配列から渡し直すことで表現する
//   (このモジュール自体はReactの状態を持たない。conversation-frame.tsxのJSDoc参照)。
//
// core/ とは独立(UI層のロジックのみ)。Character型のみ core/model から type-only import する
// (ui→core の依存はplan.md §2で許容されている方向。禁止されているのは逆向き core→ui)。
import type { Character } from '@/core/model'

/** 会話フレームの発話者。サポート役キャラ(Character)、またはNPC(自由記述の名前・立ち絵を持たない)。 */
export type TwoSlotSpeaker = Character | { readonly npc: string }

/** 左右2枠の内部状態(誰が左/右にいるか・直前に話した支援役)。 */
export interface TwoSlotState {
  readonly left: Character | null
  readonly right: Character | null
  /**
   * 直前に話した「支援役」(NPCは含まない)。次に画面にいない支援役が話したとき、
   * どちらの枠を空ける(入れ替える)かの判定に使う。NPC発話ではこの値を更新しない
   * (NPCの前に話していた支援役を「直前に話した人」として扱う、DESIGN.md参照)。
   */
  readonly lastSupportSpeaker: Character | null
}

/** 会話1つ・導入・解決の開始時点の初期状態(左右とも空・直前の話者なし)。 */
export const INITIAL_TWO_SLOT_STATE: TwoSlotState = {
  left: null,
  right: null,
  lastSupportSpeaker: null,
}

/** 1枠分の表示情報。 */
export interface TwoSlotDisplay {
  readonly character: Character
  /** true=カラー(いま話している)、false=グレーアウト(直前に話した人)。 */
  readonly speaking: boolean
}

/** ある時点での2枠の表示。 */
export interface TwoSlotFrame {
  readonly state: TwoSlotState
  readonly left: TwoSlotDisplay | null
  readonly right: TwoSlotDisplay | null
  /** NPCが話している間はtrue(枠は動かさず両方グレー、名札にNPC名を出す=呼び出し側の責務)。 */
  readonly npcSpeaking: boolean
}

/**
 * 発話者1人ぶん、2枠の状態を1手進める(純粋関数)。DESIGN.md「左右2枠の入れ替わり方式」節が正本。
 * `layoutTwoSlotFrame` がこの関数を履歴に対して畳み込む(reduce)ことで現在の表示を導出する。
 */
export function stepTwoSlotFrame(state: TwoSlotState, speaker: TwoSlotSpeaker): TwoSlotState {
  // NPC発話: 枠は動かさず、lastSupportSpeaker も据え置く(NPCの前の支援役を「直前の話者」として扱う)。
  if (typeof speaker !== 'string') return state

  // 最初の話者(リセット直後): 左に入る。
  if (state.left === null && state.right === null) {
    return { left: speaker, right: null, lastSupportSpeaker: speaker }
  }

  // 画面にいる人(=既にどちらかの枠にいる)が話す: 位置はそのまま、直前の話者を更新するだけ。
  if (speaker === state.left || speaker === state.right) {
    return { ...state, lastSupportSpeaker: speaker }
  }

  // 画面にいない人が話す: 直前に話した人ではない方の枠(空いていればそこ)に入れる。
  const lastSpeakerIsLeft = state.lastSupportSpeaker === state.left
  return lastSpeakerIsLeft
    ? { left: state.left, right: speaker, lastSupportSpeaker: speaker }
    : { left: speaker, right: state.right, lastSupportSpeaker: speaker }
}

/**
 * 発話者の履歴(古い→新しい順、最後の要素が「いま話している人」)から、現在の2枠表示を導出する。
 * 呼び出し側(conversation-frame.tsx)はこの履歴を「今の会話1つ分の発話者列」として渡すだけでよく、
 * 並びのリセット(導入の開始・探索の会話1つの開始・解決の開始)は履歴配列を新しく空から始めることで
 * 自然に表現できる(React state・useEffect によるリセット処理は不要)。
 */
export function layoutTwoSlotFrame(speakers: readonly TwoSlotSpeaker[]): TwoSlotFrame {
  const state = speakers.reduce(stepTwoSlotFrame, INITIAL_TWO_SLOT_STATE)
  const currentSpeaker = speakers.length > 0 ? speakers[speakers.length - 1] : null
  const npcSpeaking = currentSpeaker !== null && typeof currentSpeaker !== 'string'
  const speakingCharacter = npcSpeaking || currentSpeaker === null ? null : currentSpeaker

  return {
    state,
    left: state.left ? { character: state.left, speaking: state.left === speakingCharacter } : null,
    right: state.right
      ? { character: state.right, speaking: state.right === speakingCharacter }
      : null,
    npcSpeaking,
  }
}
