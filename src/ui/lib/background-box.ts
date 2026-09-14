// src/ui/lib/background-box.ts — 「背景の箱」の向き・座標・背景アセット解決(#119/#124)の純粋関数。
//
// DESIGN.md「探索シーン」節「背景の箱」が正本(縦長の画面は常に9:16・代表決定2026-09-14・#124):
// - 箱の向きは画面の向き(orientation)のみで決まる。縦長の画面は常に9:16の箱、横長の画面は
//   常に16:9の箱(縦の背景アセットの有無は箱の向きに影響しない。旧仕様=縦の背景が無ければ
//   縦長の画面でも16:9のままは#124で撤回)。
// - 縦の背景アセットが無いシーンでは、縦長(9:16)の箱の**上部**に横長画像を幅いっぱいで表示し
//   (contain・上寄せ)、残りは背景色トークンで塗る(resolveBackgroundImageRect)。ホットスポットは
//   その画像の描画矩形基準の座標に変換する(resolveHotspotBoxPosition)。
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
 * 背景の箱の向きを決める(#119、#124で「縦長の画面は常に9:16」に改訂・代表決定2026-09-14)。
 * 判定は画面幅ではなく画面の向き(screenIsPortrait)のみで行う。縦の背景アセットの有無は
 * 箱の向きには影響しない(無ければ箱の上部に横画像を表示する。resolveBackgroundImageRect参照)。
 */
export function resolveBoxOrientation(screenIsPortrait: boolean): BoxOrientation {
  return screenIsPortrait ? 'portrait' : 'landscape'
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

/** 背景画像の描画矩形(箱に対する相対値、0〜1)。 */
export interface BackgroundImageRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

const FULL_IMAGE_RECT: BackgroundImageRect = { left: 0, top: 0, width: 1, height: 1 }

// 縦長(9:16)の箱で縦の背景が無いとき、横長(16:9)画像を箱の上部に幅いっぱいで表示した場合の
// 高さ(箱の高さに対する比率)。箱の幅を1とすると箱の高さは16/9、画像は横幅1・高さ9/16(自身の
// 16:9比率を保持)なので、箱の高さに対する比率は (9/16) / (16/9) = (9/16)^2 = 81/256 ≈ 0.3164。
const PORTRAIT_NO_ASSET_IMAGE_HEIGHT = (9 / 16) * (9 / 16)

/**
 * 背景画像の描画矩形を解決する(#124・代表決定2026-09-14): 縦長の箱(orientation='portrait')で
 * 縦の背景アセットが無いシーンは、横長画像を箱の**上部**に幅いっぱいで表示する(contain・上寄せ、
 * 残りは背景色トークンで塗る)。それ以外(横長の箱、または縦の背景アセットがあるシーン)は
 * 箱全体を画像で覆う(cover)。返り値は箱に対する相対値(0〜1)。
 *
 * `topOffset`(#124秘書レビュー2回目・2026-09-14「シーンタブ・右上ボタン群が背景の絵と
 * ホットスポットを隠す」不具合の修正): 呼び出し側(scene-explorer.tsx)がシーンタブ・右上
 * ボタン群など箱の上部に重ねる固定要素を持つ場合、その高さぶん画像の開始位置(top)を
 * 下げるためのオフセット(箱に対する相対値、省略時0=従来どおり箱の最上部から表示)。
 * 画像の高さ(`PORTRAIT_NO_ASSET_IMAGE_HEIGHT`)自体は変えず、位置だけをずらす。
 * 横長の箱・縦の背景アセットがあるシーン(=画像が箱全体を覆う)では無視される(呼び出し側の
 * intro-screen.tsx/resolve-screen.tsxのように箱の上部に固定要素を重ねない画面では、この
 * 引数自体を渡す必要が無い=省略時の既定0のままでよい)。
 */
export function resolveBackgroundImageRect(
  orientation: BoxOrientation,
  hasPortraitAsset: boolean,
  topOffset = 0,
): BackgroundImageRect {
  if (orientation === 'portrait' && !hasPortraitAsset) {
    return { left: 0, top: topOffset, width: 1, height: PORTRAIT_NO_ASSET_IMAGE_HEIGHT }
  }
  return FULL_IMAGE_RECT
}

/**
 * ホットスポットの座標を「箱に対する相対位置」に解決する(#124・代表決定2026-09-14)。
 * `resolveHotspotPosition`が返す座標は「画像自身に対する相対位置」(縦の背景アセットがあれば
 * portrait座標=箱基準、無ければlandscape座標=横画像基準)のため、`resolveBackgroundImageRect`の
 * 描画矩形で箱基準の位置へ変換する。画像が箱全体を覆う場合(横長の箱、または縦の背景アセットが
 * あるシーン)は矩形が箱全体(0,0,1,1)のため実質的に無変換(従来どおり)。
 *
 * `topOffset`(#124秘書レビュー2回目・2026-09-14): `resolveBackgroundImageRect`と同じ
 * オフセットを渡すと、画像の描画矩形が箱の上部からずれた場合でもホットスポットが画像の
 * 実際の描画位置に追従する(呼び出し側=scene-explorer.tsxが画像とホットスポット双方に
 * 同じ値を渡すことで整合を保つ)。
 */
export function resolveHotspotBoxPosition(
  position: HotspotPosition,
  orientation: BoxOrientation,
  hasPortraitAsset: boolean,
  topOffset = 0,
): HotspotCoordinate {
  const [x, y] = resolveHotspotPosition(position, orientation)
  const rect = resolveBackgroundImageRect(orientation, hasPortraitAsset, topOffset)
  return [rect.left + x * rect.width, rect.top + y * rect.height]
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
