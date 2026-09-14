// src/ui/components/background-box.tsx — 「背景の箱」共通コンポーネント(#119/#124)。
//
// DESIGN.md「余白・レイアウト」「探索シーン」節「背景の箱」が正本:
// - 背景を持つ画面(導入③・探索④・解決⑤)は、画面いっぱい(100dvw×100dvh)に収まる最大の
//   16:9(横長の画面)/9:16(縦長の画面)の矩形を画面中央に置く(代表決定2026-09-14・#124:
//   画面幅720〜960pxのコンテナ制約は適用しない)。判定は画面幅ではなく画面の向き
//   (orientation、src/ui/lib/orientation.tsのuseIsPortraitScreen)。
// - 重ねる要素(見出し・タブ・ヒント確認・調査ポイント一覧・SKIP・「解決へ進む」・立ち絵・
//   会話ウィンドウ等)は、すべてこの箱に対する相対位置(position: relative な本コンポーネントの
//   ルート要素の子として絶対配置)で置く(呼び出し側=intro-screen.tsx/scene-explorer.tsx/
//   resolve-screen.tsxの責務)。
// - 縦スクロールを出さない: 箱の幅は画面の高さ(100dvh)からアスペクト比で逆算する
//   (`width: min(100%, calc(100dvh * ratio))`)。呼び出し側のScreenContainerが
//   `variant="immersive"`でページ自体の縦スクロールを止める(screen-container.tsx参照)。
// - 箱には`[container-type:size]`を設定し、子要素(立ち絵等)がコンテナクエリ単位(cqh/cqw)で
//   箱の実高さ・実幅に対する比率サイズを指定できるようにする(conversation-frame.tsxの
//   立ち絵サイズがこれを利用する)。
import type { ReactNode } from 'react'

import { cn } from '@/ui/lib/utils'

import type { BackgroundImageRect, BoxOrientation } from '../lib/background-box'

const FULL_IMAGE_RECT: BackgroundImageRect = { left: 0, top: 0, width: 1, height: 1 }

export interface BackgroundBoxProps {
  orientation: BoxOrientation
  /** 背景画像のsrc。undefinedの場合(背景未生成)はplaceholderLabelでプレースホルダ表示する。 */
  src: string | undefined
  alt: string
  /** 背景未生成時のプレースホルダ文言(例: 「執務室（背景 準備中）」)。 */
  placeholderLabel?: string
  /**
   * 背景画像の描画矩形(箱に対する相対値、#124・src/ui/lib/background-box.tsの
   * resolveBackgroundImageRect参照)。省略時は箱全体(cover)。縦長の箱で縦の背景アセットが
   * 無いシーンでは、呼び出し側が箱の上部だけを覆う矩形を渡す(横画像をcontain・上寄せ表示)。
   */
  imageRect?: BackgroundImageRect
  /** 箱に対する相対位置で重ねる要素(ホットスポット・立ち絵・会話ウィンドウ・右上ボタン群等)。 */
  children?: ReactNode
  className?: string
}

/** 背景を持つ画面(導入③・探索④・解決⑤)で共通して使う「背景の箱」(#119/#124)。 */
export function BackgroundBox({
  orientation,
  src,
  alt,
  placeholderLabel,
  imageRect = FULL_IMAGE_RECT,
  children,
  className,
}: BackgroundBoxProps) {
  const isLandscape = orientation === 'landscape'
  // width: 画面に収まる最大の16:9(または9:16)の矩形。aspect-ratioで縦横比を固定し、
  // widthだけを画面の高さ(100dvh)×比率で計算する(advisor提案。ブラウザは`aspect-ratio`+
  // `max-height`だけでは幅を縮めてくれないため、widthの式に直接収める)。100%(親要素の幅
  // いっぱい)を超えないようmin()で上限を掛ける。
  const ratioMultiplier = isLandscape ? 16 / 9 : 9 / 16
  const isFullImage = imageRect.width === 1 && imageRect.height === 1
  return (
    <div
      data-testid="background-box"
      className={cn(
        'bg-background relative mx-auto overflow-hidden',
        '[container-type:size]',
        className,
      )}
      style={{
        aspectRatio: isLandscape ? '16 / 9' : '9 / 16',
        width: `min(100%, calc(100dvh * ${ratioMultiplier}))`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          // 縦長の箱で縦の背景アセットが無い場合、imageRectが箱の上部だけを指す(#124)。
          // 実画像の縦横比がちょうど矩形と一致する想定だが、生成物のブレに備えcontain・
          // 上寄せにする(はみ出しでクロップされないため)。矩形が箱全体のときは従来どおり
          // cover(=inset-0 h-full w-full)にする。
          className={cn(
            'absolute',
            isFullImage ? 'inset-0 h-full w-full object-cover' : 'object-contain object-top',
          )}
          style={
            isFullImage
              ? undefined
              : {
                  left: `${imageRect.left * 100}%`,
                  top: `${imageRect.top * 100}%`,
                  width: `${imageRect.width * 100}%`,
                  height: `${imageRect.height * 100}%`,
                }
          }
        />
      ) : (
        // role="img"はプレースホルダ層にだけ付ける(scene-explorer.tsxの従来実装と同じ理由:
        // WAI-ARIAのimgロールはChildren Presentationalのため、外側divに付けると子孫の実
        // <button>(ホットスポット等)が支援技術から隠れてしまう)。
        <div
          role="img"
          aria-label={`${alt}（画像は準備中のためプレースホルダ表示）`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="font-heading text-muted-foreground text-base sm:text-lg">
            {placeholderLabel ?? alt}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}
