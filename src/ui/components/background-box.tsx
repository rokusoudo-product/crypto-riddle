// src/ui/components/background-box.tsx — 「背景の箱」共通コンポーネント(#119/#124)。
//
// DESIGN.md「余白・レイアウト」「探索シーン」節「背景の箱」が正本:
// - 背景を持つ画面(導入③・探索④・解決⑤)では、画面に収まる最大の16:9(横長の画面)/9:16
//   (縦長の画面)の矩形を中央に置く。判定は画面幅ではなく画面の向き(orientation、
//   src/ui/lib/orientation.tsのuseIsPortraitScreen)。
// - 重ねる要素(ホットスポット・立ち絵・会話ウィンドウ・右上のボタン群)は、すべてこの箱に
//   対する相対位置(position: relative な本コンポーネントのルート要素の子として絶対配置)で置く。
// - 縦スクロールを出さない: 箱の幅は「画面の高さから、その画面の他の固定要素(見出し・
//   タブ・ボタン列等=chromePx)を引いた残りの高さ」を基準にアスペクト比から逆算する
//   (advisor提案の`width: min(100%, calc((100dvh - chrome) * ratio))`方式)。chromePxは
//   呼び出し側(intro-screen.tsx/scene-explorer.tsx/resolve-screen.tsx)が画面ごとの実際の
//   見出し・タブ・ボタン列の高さから見積もって渡す(8ptグリッドの合計値、各呼び出し側の
//   コメントに内訳を記す)。
// - 箱には`[container-type:size]`を設定し、子要素(立ち絵等)がコンテナクエリ単位(cqh/cqw)で
//   箱の実高さ・実幅に対する比率サイズを指定できるようにする(conversation-frame.tsxの
//   立ち絵サイズがこれを利用する)。
import type { ReactNode } from 'react'

import { cn } from '@/ui/lib/utils'

import type { BoxOrientation } from '../lib/background-box'

export interface BackgroundBoxProps {
  orientation: BoxOrientation
  /** 背景画像のsrc。undefinedの場合(背景未生成)はplaceholderLabelでプレースホルダ表示する。 */
  src: string | undefined
  alt: string
  /** 背景未生成時のプレースホルダ文言(例: 「執務室（背景 準備中）」)。 */
  placeholderLabel?: string
  /**
   * この画面で箱の上下にある固定要素(見出し・タブ・ボタン列など)の合計高さ(px)。
   * 呼び出し側が画面ごとに見積もって渡す(本コンポーネント冒頭コメント参照)。
   */
  chromePx: number
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
  chromePx,
  children,
  className,
}: BackgroundBoxProps) {
  const isLandscape = orientation === 'landscape'
  // width: 画面に収まる最大の16:9(または9:16)の矩形。aspect-ratioで縦横比を固定し、
  // widthだけを「画面の高さ(100dvh)からchromePxを引いた残り」×比率で計算する
  // (advisor提案。ブラウザは`aspect-ratio`+`max-height`だけでは幅を縮めてくれないため、
  // widthの式に直接収める)。100%(親要素の幅いっぱい)を超えないようmin()で上限を掛ける。
  const ratioMultiplier = isLandscape ? 16 / 9 : 9 / 16
  return (
    <div
      className={cn(
        'border-border bg-background relative mx-auto overflow-hidden rounded-lg border',
        '[container-type:size]',
        className,
      )}
      style={{
        aspectRatio: isLandscape ? '16 / 9' : '9 / 16',
        width: `min(100%, calc((100dvh - ${chromePx}px) * ${ratioMultiplier}))`,
      }}
    >
      {src ? (
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
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
