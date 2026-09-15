// src/ui/components/ui/dialog.tsx — shadcn風のDialogラッパー(代表決定2026-09-15のヒント
// ダイアログのために新規追加)。button.tsx と同じ`radix-ui`統一パッケージ(package.json 既存
// 依存・追加インストール不要)の`Dialog`名前空間をそのまま使う。理由: 本プロジェクトには
// これまでtrueなモーダル(role="dialog"+aria-modal・フォーカストラップ・Escape・フォーカス
// 復帰)が無く(card-drawer.tsx/scene-explorer.tsxの開閉パネルはいずれも手組みのdisclosure
// パターンで、背景を操作不能にはしない)、ヒントダイアログの要件(閉じるまで背景を完全に
// 操作不能にする)はRadixのfocus trap・aria-hidden(hideOthers)・pointer-events制御に
// そのまま乗るのが最も確実なため、既存の手組みパターンを拡張せずRadix Dialogを採用した
// (components.jsonの`style: radix-nova`とも整合)。
//
// 見た目だけプロジェクトのデザイントークンに合わせる薄いラッパーにする(shadcn/uiの定番構成)。
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/ui/lib/utils'

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      data-testid="hint-dialog-scrim"
      className={cn(
        // 背景の暗転スクリム(index.cssの`scrim`ユーティリティ、代表決定2026-09-15)。
        // z-[60]: 会話ウィンドウ・立ち絵の行(z-10/z-20)・右上ボタン群(z-50)より確実に手前へ
        // (DESIGN.md該当節「z-index」参照)。
        'scrim data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[60] motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-testid="resolve-hint-dialog"
        role="dialog"
        aria-modal="true"
        className={cn(
          // glass-panel(index.css、alpha>=0.81・代表決定2026-09-15「ダイアログの見た目」)。
          // 背景の箱の中央付近に置く(fixed+centering、DialogはPortalでdocument.bodyへ描画
          // されるため背景の箱=BackgroundBoxのコンテナクエリ座標系の外にある。画面全体の
          // 中央に置くことで実質的に箱の中央付近になる)。
          'glass-panel border-primary/60 fixed top-1/2 left-1/2 z-[60] flex max-h-[85vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-lg border p-4 shadow-lg sm:gap-4 sm:p-6',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:animate-none',
          className,
        )}
        {...props}
      >
        {children}
        {/* 閉じるボタン(代表決定2026-09-15「閉じるボタン(48px以上)・Escapeの両方で閉じる」):
            card-drawer.tsx等の既存アイコンボタン(size="icon"=32px)はこの要件を満たさない
            サイズのため使わず、可視テキスト+アイコンの専用ボタンをh-12(48px)・min-w-12で
            組む(resolve-choice-panel.tsxの相談ボタンと同じ48px基準)。 */}
        <DialogPrimitive.Close
          data-slot="dialog-close"
          className="focus-visible:ring-ring hover:bg-secondary absolute top-2 right-2 inline-flex h-12 min-w-12 items-center justify-center gap-1 rounded-lg px-3 text-sm font-medium focus-visible:ring-3 focus-visible:outline-none"
        >
          <X aria-hidden="true" className="size-4" />
          閉じる
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading pr-16 text-lg leading-snug font-semibold sm:text-xl', className)}
      {...props}
    />
  )
}

export { Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle }
