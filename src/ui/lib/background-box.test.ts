// src/ui/lib/background-box.test.ts — 「背景の箱」の向き・座標・背景アセット解決(#119/#124)の
// 単体テスト。docs/scenario_schema.md §2.7「縦の背景があるシーンでのportrait座標の必須化
// (食い違い検出)」の完了条件を検証する(#124 issue本文「食い違い検出の単体テスト」)。
import { describe, expect, it } from 'vitest'

import {
  findOrientationMismatches,
  hasPortraitAsset,
  resolveBackgroundImageRect,
  resolveBackgroundSrc,
  resolveBoxOrientation,
  resolveHotspotBoxPosition,
  resolveHotspotPosition,
  type BackgroundSrcMap,
  type OrientationCheckScene,
} from './background-box'

describe('resolveBoxOrientation(#119、#124で「縦長の画面は常に9:16」に改訂・代表決定2026-09-14)', () => {
  it('画面が縦長なら、縦の背景アセットの有無に関わらず常にportrait(9:16)を返す', () => {
    expect(resolveBoxOrientation(true)).toBe('portrait')
  })

  it('画面が横長なら常にlandscape(16:9)を返す', () => {
    expect(resolveBoxOrientation(false)).toBe('landscape')
  })
})

describe('hasPortraitAsset/resolveBackgroundSrc(#119/#124)', () => {
  const srcMap: BackgroundSrcMap = {
    'bg-s1-office': '/bg-s1-office.png',
    'bg-s1-office-portrait': '/bg-s1-office-portrait.png',
    'bg-s1-server': '/bg-s1-server.png',
  }

  it('`${id}-portrait`が対応表にあればtrue', () => {
    expect(hasPortraitAsset('bg-s1-office', srcMap)).toBe(true)
    expect(hasPortraitAsset('bg-s1-server', srcMap)).toBe(false)
    expect(hasPortraitAsset('bg-unknown', srcMap)).toBe(false)
  })

  it('orientation="portrait"のとき縦アセットを返す', () => {
    expect(resolveBackgroundSrc('bg-s1-office', 'portrait', srcMap)).toBe(
      '/bg-s1-office-portrait.png',
    )
  })

  it('orientation="portrait"でも縦アセットが無ければ横にフォールバックする(防御的)', () => {
    expect(resolveBackgroundSrc('bg-s1-server', 'portrait', srcMap)).toBe('/bg-s1-server.png')
  })

  it('orientation="landscape"のときは常に横を返す', () => {
    expect(resolveBackgroundSrc('bg-s1-office', 'landscape', srcMap)).toBe('/bg-s1-office.png')
  })

  it('未登録のIDはundefinedを返す(プレースホルダ表示にフォールバック)', () => {
    expect(resolveBackgroundSrc('bg-unknown', 'landscape', srcMap)).toBeUndefined()
  })
})

describe('resolveHotspotPosition(schema 0.8.0・#119/#124)', () => {
  const withPortrait = {
    landscape: [0.3, 0.4] as [number, number],
    portrait: [0.5, 0.6] as [number, number],
  }
  const withoutPortrait = { landscape: [0.3, 0.4] as [number, number] }

  it('orientation="portrait"かつportrait座標があればそれを使う', () => {
    expect(resolveHotspotPosition(withPortrait, 'portrait')).toEqual([0.5, 0.6])
  })

  it('orientation="portrait"でもportrait座標が無ければlandscapeにフォールバックする', () => {
    expect(resolveHotspotPosition(withoutPortrait, 'portrait')).toEqual([0.3, 0.4])
  })

  it('orientation="landscape"のときは常にlandscapeを使う', () => {
    expect(resolveHotspotPosition(withPortrait, 'landscape')).toEqual([0.3, 0.4])
  })
})

describe('resolveBackgroundImageRect(#124・代表決定2026-09-14「縦長の画面は常に9:16」)', () => {
  it('横長の箱は常に箱全体(cover)', () => {
    expect(resolveBackgroundImageRect('landscape', true)).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    })
    expect(resolveBackgroundImageRect('landscape', false)).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    })
  })

  it('縦長の箱で縦の背景アセットがあれば箱全体(cover)', () => {
    expect(resolveBackgroundImageRect('portrait', true)).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    })
  })

  it('縦長の箱で縦の背景アセットが無ければ、箱の上部に幅いっぱい・高さ=幅×9/16(=箱の高さの81/256)', () => {
    const rect = resolveBackgroundImageRect('portrait', false)
    expect(rect.left).toBe(0)
    expect(rect.top).toBe(0)
    expect(rect.width).toBe(1)
    expect(rect.height).toBeCloseTo(81 / 256, 10)
  })
})

describe('resolveHotspotBoxPosition(#124・代表決定2026-09-14)', () => {
  const withPortrait = {
    landscape: [0.3, 0.4] as [number, number],
    portrait: [0.5, 0.6] as [number, number],
  }
  const withoutPortrait = { landscape: [0.3, 0.4] as [number, number] }

  it('横長の箱は無変換(画像=箱全体)', () => {
    expect(resolveHotspotBoxPosition(withPortrait, 'landscape', true)).toEqual([0.3, 0.4])
  })

  it('縦長の箱で縦の背景アセットがあれば無変換(portrait座標=箱基準)', () => {
    expect(resolveHotspotBoxPosition(withPortrait, 'portrait', true)).toEqual([0.5, 0.6])
  })

  it('縦長の箱で縦の背景アセットが無ければ、landscape座標を画像の描画矩形(箱上部)基準に変換する', () => {
    const [x, y] = resolveHotspotBoxPosition(withoutPortrait, 'portrait', false)
    expect(x).toBeCloseTo(0.3, 10)
    expect(y).toBeCloseTo(0.4 * (81 / 256), 10)
  })
})

describe('findOrientationMismatches(縦の背景の食い違い検出・docs/scenario_schema.md §2.7)', () => {
  const dummySrcMapWithPortrait: BackgroundSrcMap = {
    'bg-with-portrait': '/bg-with-portrait.png',
    'bg-with-portrait-portrait': '/bg-with-portrait-portrait.png',
    'bg-no-portrait': '/bg-no-portrait.png',
  }

  it('縦の背景があるシーンでportrait座標が無いホットスポットを検出する', () => {
    const scenes: OrientationCheckScene[] = [
      {
        id: 'scene-a',
        background: 'bg-with-portrait',
        hotspots: [
          { position: { landscape: [0.1, 0.1] }, label: 'ホットスポットA' }, // portrait無し=食い違い
          {
            position: { landscape: [0.2, 0.2], portrait: [0.3, 0.3] },
            label: 'ホットスポットB',
          }, // portrait有り=OK
        ],
      },
    ]
    const mismatches = findOrientationMismatches(scenes, dummySrcMapWithPortrait)
    expect(mismatches).toEqual([
      { sceneId: 'scene-a', hotspotIndex: 0, hotspotLabel: 'ホットスポットA' },
    ])
  })

  it('縦の背景が無いシーンでは、portrait座標が無くても食い違いとして検出しない', () => {
    const scenes: OrientationCheckScene[] = [
      {
        id: 'scene-b',
        background: 'bg-no-portrait',
        hotspots: [{ position: { landscape: [0.1, 0.1] }, label: 'ホットスポットC' }],
      },
    ]
    expect(findOrientationMismatches(scenes, dummySrcMapWithPortrait)).toEqual([])
  })

  it(
    '#124時点の実データ(EXPLORE_BACKGROUND_SRC)にはどのシーンも縦の背景を持たないため、' +
      'S1〜SLの全シーンが必ず通る(実データでの回帰確認)',
    async () => {
      // 実データの対応表・シナリオfixtureを動的importして確認する(モジュールトップレベルの
      // importにすると他の単体テスト同様Viteのアセット変換が走るだけなので副作用は無いが、
      // このファイルの主眼(純粋関数のロジック検証)と分離するため、この1テストに限定して読み込む)。
      const { EXPLORE_BACKGROUND_SRC } = await import('./explore-background-assets')
      const { s1TargetedEmailIntrusionFixture } =
        await import('@/core/scenario/fixtures/s1-targeted-email-intrusion.fixture')
      const { s2VpnRansomwareFixture } =
        await import('@/core/scenario/fixtures/s2-vpn-ransomware.fixture')
      const { s3EcCardLeakFixture } =
        await import('@/core/scenario/fixtures/s3-ec-card-leak.fixture')
      const { slConsignmentBreachFixture } =
        await import('@/core/scenario/fixtures/sl-consignment-breach.fixture')

      for (const fixture of [
        s1TargetedEmailIntrusionFixture,
        s2VpnRansomwareFixture,
        s3EcCardLeakFixture,
        slConsignmentBreachFixture,
      ]) {
        const scenes = fixture.scenes ?? []
        expect(findOrientationMismatches(scenes, EXPLORE_BACKGROUND_SRC)).toEqual([])
      }
    },
  )
})
