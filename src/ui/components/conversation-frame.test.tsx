/** @vitest-environment jsdom */
// src/ui/components/conversation-frame.test.tsx — 会話フレーム(ConversationFrame)単体テスト。
//
// Issue #64/T042(#52 Phase4.7)の完了条件:
// 「会話フレーム単体テスト(タイプライター進行・スキップで即全文・prefers-reduced-motionで
// 即全文・支援技術へ全文提供〔visually-hidden全文＋演出はaria-hidden〕・操作要素は全文/
// スキップ後に出る)が通る」を検証する。
//
// DESIGN.md「会話フレーム」節「タイプライター表示」小節が正本。
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConversationFrame, TYPEWRITER_CHAR_INTERVAL_MS } from './conversation-frame'

const LINE = 'こんにちは'

/** jsdomにはmatchMediaが実装されていないため、reduced-motionのテストでのみモックする。 */
function mockPrefersReducedMotion(matches: boolean): void {
  const mediaQueryList = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    // 型定義上は必須だがこのテストでは使わない旧API。
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  } as unknown as MediaQueryList
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue(mediaQueryList) as unknown as typeof window.matchMedia,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ConversationFrame(#64/T042 タイプライター表示)', () => {
  describe('タイプライター進行とスキップ', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('会話文を1文字ずつ時間差で表示し、演出中は操作要素(children)を出さない', () => {
      render(
        <ConversationFrame speaker="霧島" line={LINE}>
          <button type="button">選択肢A</button>
        </ConversationFrame>,
      )

      // 開始直後: まだ1文字も見えていない(aria-hiddenの演出テキストは空)。
      const skipButton = screen.getByRole('button', { name: LINE })
      expect(skipButton.querySelector('[aria-hidden="true"]')).toHaveTextContent('')
      expect(screen.queryByRole('button', { name: '選択肢A' })).not.toBeInTheDocument()

      // 3文字ぶん進める。
      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * 3)
      })
      expect(skipButton.querySelector('[aria-hidden="true"]')).toHaveTextContent(LINE.slice(0, 3))
      // 全文表示が終わるまで操作要素は出ない(送り途中の誤タップ防止、DESIGN.md「タイプライター表示」)。
      expect(screen.queryByRole('button', { name: '選択肢A' })).not.toBeInTheDocument()

      // 残り全て進めて完走させる。
      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * (LINE.length - 3))
      })
      // 完走後は演出用のボタンではなく通常の段落として全文表示され、children が出る。
      expect(screen.getByText(LINE).tagName).toBe('P')
      expect(screen.getByRole('button', { name: '選択肢A' })).toBeInTheDocument()
    })

    it('タップ(クリック)で即全文表示になる(スキップ)', () => {
      render(
        <ConversationFrame speaker="橘" line={LINE}>
          <button type="button">選択肢A</button>
        </ConversationFrame>,
      )

      const skipButton = screen.getByRole('button', { name: LINE })
      act(() => {
        skipButton.click()
      })

      expect(screen.getByText(LINE).tagName).toBe('P')
      expect(screen.getByRole('button', { name: '選択肢A' })).toBeInTheDocument()
    })

    it('lineが変わるとタイプライターは先頭から再生され、操作要素は再び隠れる', () => {
      const { rerender } = render(
        <ConversationFrame speaker="霧島" line={LINE}>
          <button type="button">選択肢A</button>
        </ConversationFrame>,
      )
      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * LINE.length)
      })
      expect(screen.getByRole('button', { name: '選択肢A' })).toBeInTheDocument()

      const nextLine = '次の質問です'
      rerender(
        <ConversationFrame speaker="橘" line={nextLine}>
          <button type="button">選択肢A</button>
        </ConversationFrame>,
      )

      // 新しいlineの演出が始まり、children は再び全文表示(またはスキップ)までは出ない。
      expect(screen.queryByRole('button', { name: '選択肢A' })).not.toBeInTheDocument()
      const skipButton = screen.getByRole('button', { name: nextLine })
      expect(skipButton.querySelector('[aria-hidden="true"]')).toHaveTextContent('')

      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * nextLine.length)
      })
      expect(screen.getByText(nextLine).tagName).toBe('P')
      expect(screen.getByRole('button', { name: '選択肢A' })).toBeInTheDocument()
    })

    it('全文表示が完了した瞬間(スキップ含む)に1度だけonLineRevealedを呼ぶ', () => {
      const onLineRevealed = vi.fn()
      render(<ConversationFrame speaker="霧島" line={LINE} onLineRevealed={onLineRevealed} />)

      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * (LINE.length - 1))
      })
      expect(onLineRevealed).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS)
      })
      expect(onLineRevealed).toHaveBeenCalledTimes(1)

      // 完了後にさらに時間が経っても再度は呼ばれない。
      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * 5)
      })
      expect(onLineRevealed).toHaveBeenCalledTimes(1)
    })
  })

  // fake timers + userEvent の組み合わせは待機が噛み合わずデッドロックしうるため
  // (userEventが内部で使うPromiseの待機がfake timersでは進まない)、キーボード操作の
  // テストは実タイマーのまま行う(#64/T042実装メモ)。スキップ自体はタイマー待ちを
  // 必要としない即時操作のため、実タイマーでも動作の検証に支障はない。
  describe('キーボード操作(Enterでスキップ)', () => {
    it('Enterで即全文表示になる(スキップ)。フォーカスはスキップ後、children内の最初の要素へ移る', async () => {
      // 実タイマーで自然完走してしまいスキップボタンが先に消える競合を避けるため、
      // 短いLINEではなく十分に長い文を使う(1文字32ms×30文字=960ms >> focus+Enterの実行時間)。
      const longLine =
        'これはとても長い会話文です。読み終える前にEnterでスキップできることを確認します。'
      const user = userEvent.setup()
      render(
        <ConversationFrame speaker="橘" line={longLine}>
          <button type="button">選択肢A</button>
          <button type="button">選択肢B</button>
        </ConversationFrame>,
      )

      const skipButton = screen.getByRole('button', { name: longLine })
      skipButton.focus()
      await user.keyboard('{Enter}')

      expect(screen.getByText(longLine).tagName).toBe('P')
      const choiceA = screen.getByRole('button', { name: '選択肢A' })
      expect(choiceA).toBeInTheDocument()
      // スキップ操作でchildrenが出た直後、最初のフォーカス可能要素へ自動的にフォーカスが移る
      // (スキップボタンがDOMから消えてフォーカスがdocumentへ落ちるのを防ぐ)。
      expect(document.activeElement).toBe(choiceA)
    })
  })

  describe('prefers-reduced-motion', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('prefers-reduced-motionが有効な場合はアニメーションせず即全文表示になる', () => {
      mockPrefersReducedMotion(true)

      render(
        <ConversationFrame speaker="霧島" line={LINE}>
          <button type="button">選択肢A</button>
        </ConversationFrame>,
      )

      // スキップ用ボタンは出ず、最初から通常の段落として全文表示される。
      expect(screen.queryByRole('button', { name: LINE })).not.toBeInTheDocument()
      expect(screen.getByText(LINE).tagName).toBe('P')
      // 操作要素も最初から出ている(スキップの必要が無いため)。
      expect(screen.getByRole('button', { name: '選択肢A' })).toBeInTheDocument()
    })
  })

  describe('支援技術への全文提供', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('演出中は部分文字列がaria-hiddenで、全文はsr-onlyで別途一度に提供される', () => {
      render(<ConversationFrame speaker="霧島" line={LINE} />)

      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * 2)
      })

      const skipButton = screen.getByRole('button', { name: LINE })
      // 全文がスキップボタンのaccessible name(sr-onlyのテキスト)として一度に渡っている
      // (1文字ずつ読み上げさせない、DESIGN.md「タイプライター表示」節)。
      const hiddenFull = skipButton.querySelector('.sr-only')
      expect(hiddenFull).toHaveTextContent(LINE)
      expect(hiddenFull).not.toHaveAttribute('aria-hidden')

      // 演出用の部分文字列はaria-hiddenで支援技術から隠れている。
      const visiblePartial = skipButton.querySelector('[aria-hidden="true"]')
      expect(visiblePartial).toHaveAttribute('aria-hidden', 'true')
      expect(visiblePartial).toHaveTextContent(LINE.slice(0, 2))
    })
  })

  describe('layout="overlay"(探索の会話オーバーレイ・#52・T047)', () => {
    it('絶対配置のオーバーレイとして両立ち絵と会話ウィンドウを描画し、タイプライター等の挙動はstackedと同じ', () => {
      render(
        <ConversationFrame speaker="橘" line={LINE} layout="overlay">
          <button type="button">閉じる</button>
        </ConversationFrame>,
      )

      // 絶対配置の外枠を持つ(scene-explorer.tsxの`position: relative`な背景の箱に重ねる前提)。
      const skipButton = screen.getByRole('button', { name: LINE })
      const overlayRoot = skipButton.closest('.absolute.inset-0')
      expect(overlayRoot).not.toBeNull()

      // 霧島=左・橘=右は変わらず、話者(橘)のみフルカラー・もう一方はグレーアウトのまま。
      expect(screen.getByAltText('霧島（待機中）')).toBeInTheDocument()
      expect(screen.getByAltText('橘（発話中）')).toBeInTheDocument()

      // 全文表示(またはスキップ)まではchildrenを出さない挙動もstackedと共有する。
      expect(screen.queryByRole('button', { name: '閉じる' })).not.toBeInTheDocument()
      act(() => {
        skipButton.click()
      })
      expect(screen.getByText(LINE).tagName).toBe('P')
      expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
    })
  })

  describe('onDismiss(会話ウィンドウのクリック/タップ閉じ・#52 Phase4.7 追補・T048)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('全文表示前のクリックはスキップのみでonDismissを呼ばず、全文表示後の同じ要素へのクリックでonDismissを呼ぶ(2段階)', () => {
      const onDismiss = vi.fn()
      render(<ConversationFrame speaker="橘" line={LINE} layout="overlay" onDismiss={onDismiss} />)

      // accessible nameは会話文(line)のまま、スキップ前後で変わらない(T048)。
      const conversationWindow = screen.getByRole('button', { name: LINE })

      // 1回目: 全文表示前なのでスキップのみ(全文表示になるが、まだonDismissは呼ばれない)。
      act(() => {
        conversationWindow.click()
      })
      expect(onDismiss).not.toHaveBeenCalled()
      expect(screen.getByText(LINE).tagName).toBe('P')

      // 2回目: 全文表示後の同じ要素へのクリックでonDismissが呼ばれる(専用の「閉じる」ボタンは無い)。
      act(() => {
        conversationWindow.click()
      })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('Enter/Spaceキーでも同様にスキップ→もう一度で閉じる2段階になる', () => {
      const onDismiss = vi.fn()
      render(<ConversationFrame speaker="橘" line={LINE} layout="overlay" onDismiss={onDismiss} />)
      const conversationWindow = screen.getByRole('button', { name: LINE })

      fireEvent.keyDown(conversationWindow, { key: 'Enter' })
      expect(onDismiss).not.toHaveBeenCalled()
      expect(screen.getByText(LINE).tagName).toBe('P')

      fireEvent.keyDown(conversationWindow, { key: ' ' })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('Escapeキーは全文表示の途中でも完了後でも常にonDismissを呼ぶ', () => {
      const onDismissDuringTyping = vi.fn()
      const { unmount } = render(
        <ConversationFrame
          speaker="橘"
          line={LINE}
          layout="overlay"
          onDismiss={onDismissDuringTyping}
        />,
      )
      const windowDuringTyping = screen.getByRole('button', { name: LINE })
      // まだ全文表示前(スキップしていない)状態でもEscapeは即座に閉じる。
      fireEvent.keyDown(windowDuringTyping, { key: 'Escape' })
      expect(onDismissDuringTyping).toHaveBeenCalledTimes(1)
      unmount()

      const onDismissAfterComplete = vi.fn()
      render(
        <ConversationFrame
          speaker="橘"
          line={LINE}
          layout="overlay"
          onDismiss={onDismissAfterComplete}
        />,
      )
      const windowAfterComplete = screen.getByRole('button', { name: LINE })
      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_CHAR_INTERVAL_MS * LINE.length)
      })
      expect(screen.getByText(LINE).tagName).toBe('P')
      fireEvent.keyDown(windowAfterComplete, { key: 'Escape' })
      expect(onDismissAfterComplete).toHaveBeenCalledTimes(1)
    })

    it('onDismiss指定時はマウント直後に会話ウィンドウ自体へ自動的にフォーカスが当たる', () => {
      render(<ConversationFrame speaker="橘" line={LINE} layout="overlay" onDismiss={() => {}} />)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: LINE }))
    })

    it('onDismissを指定しない場合は従来どおり(role="button"を持たず、windowはフォーカス対象にならない)', () => {
      render(<ConversationFrame speaker="橘" line={LINE} layout="overlay" />)
      // lineそのものが名前になるのは従来のスキップ用<button>のみ(入れ子ではなく単体)。
      const skipButton = screen.getByRole('button', { name: LINE })
      expect(skipButton.tagName).toBe('BUTTON')
      expect(skipButton.closest('[role="button"]')).toBeNull()
    })
  })
})
