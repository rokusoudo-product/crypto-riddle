// src/ui/lib/background-box.ts — 「背景の箱」の向き・座標・背景アセット解決(#119/#124)の純粋関数。
//
// DESIGN.md「探索シーン」節「背景の箱」が正本:
// - 縦の背景があるシーンでは、画面の向き(orientation)で横長16:9/縦長9:16の箱を切り替える。
// - 縦の背景がないシーンは、縦長の画面でも箱を16:9のまま(画面幅にフィット)にし、
//   立ち絵の比率も横用の値を使う。
// - 縦の背景アセットの解決はスキーマの範囲外: `background` のIDに `-portrait` を付けた
//   アセットIDを、UI側の背景の対応表(BACKGROUND_SRCマップ)で引く(docs/scenario_schema.md §2.7)。
//
// core/ とは独立(UI層のロジックのみ)。HotspotPosition/HotspotCoordinate型のみ core/model から
// type-only import する(ui→coreの依存はplan.md §2で許容されている方向)。
import type { HotspotCoordinate, HotspotPosition } from '@/core/model'

export type BoxOrientation = 'landscape' | 'portrait'

/** 背景アセットの対応表(値がundefinedの場合は未登録=プレースホルダ表示、実装済みマップと同じ形)。 */
export type BackgroundSrcMap = Record<string, string | undefined>

/** `${baseId}-portrait` が対応表に登録されているか(縦の背景アセットの有無)。 */
export function hasPortraitAsset(baseId: string, srcMap: BackgroundSrcMap): boolean {
  return Boolean(srcMap[`${baseId}-portrait`])
}

/**
 * 背景の箱の向きを決める(#119)。判定は画面幅ではなく画面の向き(screenIsPortrait)で行うが、
 * 縦の背景アセットが無いシーンでは縦長の画面でも箱を16:9のまま(landscape)にする
 * (DESIGN.md「探索シーン」節「背景の箱」)。
 */
export function resolveBoxOrientation(params: {
  screenIsPortrait: boolean
  hasPortraitAsset: boolean
}): BoxOrientation {
  return params.screenIsPortrait && params.hasPortraitAsset ? 'portrait' : 'landscape'
}

/**
 * 背景アセットのsrcを解決する。`orientation==='portrait'`のときは`${baseId}-portrait`を探し、
 * 無ければ`baseId`(横)にフォールバックする(resolveBoxOrientationが既にhasPortraitAssetを
 * 考慮して'portrait'を返しているため通常はフォールバックしないが、防御的に残す)。
 */
export function resolveBackgroundSrc(
  baseId: string,
  orientation: BoxOrientation,
  srcMap: BackgroundSrcMap,
): string | undefined {
  if (orientation === 'portrait') return srcMap[`${baseId}-portrait`] ?? srcMap[baseId]
  return srcMap[baseId]
}

/**
 * ホットスポットの相対座標を解決する(schema 0.8.0・docs/scenario_schema.md §2.7)。
 * `orientation==='portrait'`かつ`position.portrait`があればそれを使い、無ければ`landscape`を
 * 使う(縦長の画面でも横の座標をそのまま使う、上記docs参照)。
 */
export function resolveHotspotPosition(
  position: HotspotPosition,
  orientation: BoxOrientation,
): HotspotCoordinate {
  return orientation === 'portrait' && position.portrait ? position.portrait : position.landscape
}

/** 食い違い検出(#124)対象の最小限のシーン形(Scene/SceneHotspotの必要フィールドのみ)。 */
export interface OrientationCheckScene {
  readonly id: string
  readonly background: string
  readonly hotspots: readonly { readonly position: HotspotPosition; readonly label: string }[]
}

export interface OrientationMismatch {
  readonly sceneId: string
  readonly hotspotIndex: number
  readonly hotspotLabel: string
}

/**
 * 縦の背景の解決方法・食い違い検出(docs/scenario_schema.md §2.7)。
 * 縦の背景アセットが対応表にあるシーン(hasPortraitAsset)で、`position.portrait`を持たない
 * ホットスポットを列挙する。現状(#124時点)はどのシーンも縦の背景を持たないため必ず空配列を返す
 * (S1の縦座標投入は#123、縦背景アセットの追加は#121/#122以降)。
 */
export function findOrientationMismatches(
  scenes: readonly OrientationCheckScene[],
  srcMap: BackgroundSrcMap,
): OrientationMismatch[] {
  const mismatches: OrientationMismatch[] = []
  for (const scene of scenes) {
    if (!hasPortraitAsset(scene.background, srcMap)) continue
    scene.hotspots.forEach((hotspot, hotspotIndex) => {
      if (!hotspot.position.portrait) {
        mismatches.push({ sceneId: scene.id, hotspotIndex, hotspotLabel: hotspot.label })
      }
    })
  }
  return mismatches
}
