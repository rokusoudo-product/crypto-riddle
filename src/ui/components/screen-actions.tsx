import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/ui/components/ui/button'
import { cn } from '@/ui/lib/utils'

type ScreenLinkProps = Omit<ComponentProps<typeof Button>, 'asChild'> & {
  to: string
}

// T011: 主要アクション用リンクボタン。
// DESIGN.md「タップ/クリック対象 最低48×48px（モバイル）」を満たすため、
// shadcn Button の既定サイズ（h-8=32px）を上書きする。色は既存トークン（Button variant）のみを使う。
export function PrimaryAction({ to, className, children, ...props }: ScreenLinkProps) {
  return (
    <Button asChild className={cn('h-12 min-w-12 px-6 text-base', className)} {...props}>
      <Link to={to}>{children}</Link>
    </Button>
  )
}

// 副次アクション（SKIP・図鑑への導線など）。タップ対象サイズは主要アクションと同じ基準を満たす。
export function SecondaryAction({
  to,
  className,
  variant = 'outline',
  children,
  ...props
}: ScreenLinkProps) {
  return (
    <Button asChild variant={variant} className={cn('h-12 min-w-12 px-6', className)} {...props}>
      <Link to={to}>{children}</Link>
    </Button>
  )
}
