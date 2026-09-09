/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/ui/routes'

// T011 スモークテスト: 全ルートがレンダリングされ、画面名（見出し）が表示されることを確認する。
// core のステートマシン結線テストは T013 の範囲。
// vitest.config は globals:false のため RTL の自動 cleanup が効かない。明示的に afterEach で解放する。
afterEach(() => cleanup())

describe.each([
  ['/', 'crypto-riddle'],
  ['/maps', 'マップ選択'],
  ['/intro', '導入'],
  ['/explore', '探索'],
  ['/resolve', '解決'],
  ['/resolve/fail', '失敗解説'],
  ['/result', '結果'],
  ['/cards', 'カード図鑑'],
])('ルート %s', (path, heading) => {
  it(`画面名「${heading}」が表示される`, () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })
})

describe('未定義ルート', () => {
  it('タイトル画面へリダイレクトされる', () => {
    render(
      <MemoryRouter initialEntries={['/no-such-route']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'crypto-riddle' })).toBeInTheDocument()
  })
})

describe('4状態の簡易スイッチ（?state=）', () => {
  it('state=loading でローディング表示に切り替わる', () => {
    render(
      <MemoryRouter initialEntries={['/maps?state=loading']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('進捗を取得しています')
  })

  it('state=empty で空状態表示に切り替わる', () => {
    render(
      <MemoryRouter initialEntries={['/cards?state=empty']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('まだカードを収集していません。マップを探索してカードを集めよう。'),
    ).toBeInTheDocument()
  })

  it('state=error でエラー表示に切り替わる', () => {
    render(
      <MemoryRouter initialEntries={['/result?state=error']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('保存に失敗しました。')
  })

  it('不正な state 値は normal 扱いになる', () => {
    render(
      <MemoryRouter initialEntries={['/maps?state=unknown']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'マップ選択' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
