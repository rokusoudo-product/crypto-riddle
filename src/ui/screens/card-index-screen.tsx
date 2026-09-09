import { useState } from 'react'

import { SUBJECT_TAGS, type SubjectTag } from '@/core/model'
import { ScreenContainer } from '@/ui/components/screen-container'
import { StateFrame } from '@/ui/components/state-frame'
import { useScreenState } from '@/ui/state/use-screen-state'

const ALL_TAGS = 'すべて'

// ⑧カード図鑑（ライト文脈）。目的=収集用語の閲覧／主要アクション=分野で絞る。
// 分野タグの値集合は src/core/model/tags.ts（SUBJECT_TAGS）を正本として参照する（T012/T013 で実データに接続）。
export function CardIndexScreen() {
  const state = useScreenState()
  const [selectedTag, setSelectedTag] = useState<SubjectTag | typeof ALL_TAGS>(ALL_TAGS)

  return (
    <ScreenContainer title="カード図鑑">
      <StateFrame
        state={state}
        loading={<p className="text-muted-foreground">読み込んでいます…</p>}
        empty={<p>まだカードを収集していません。マップを探索してカードを集めよう。</p>}
        error={<p className="text-destructive">読み込みに失敗しました。</p>}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="subject-tag-filter" className="text-sm">
            分野で絞る
          </label>
          <select
            id="subject-tag-filter"
            className="border-border bg-background focus-visible:ring-ring h-12 min-w-12 rounded-lg border px-4 focus-visible:ring-3 focus-visible:outline-none"
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value as SubjectTag | typeof ALL_TAGS)}
          >
            <option value={ALL_TAGS}>{ALL_TAGS}</option>
            {SUBJECT_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <p className="text-muted-foreground text-sm">
          （プレースホルダ）収集済みカードの一覧は T023/T024 でマスタデータと接続する。
        </p>
      </StateFrame>
    </ScreenContainer>
  )
}
