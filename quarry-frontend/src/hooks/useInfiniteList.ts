import { useState } from 'react'

export type InfiniteListState = {
  key: string
  limit: number
}

/**
 * Slice a list for scroll / load-more UIs. Resets to `pageSize` when `resetKey` changes
 * (filters, quarry, search, etc.).
 */
export function useInfiniteList<T>(items: T[], resetKey: string, pageSize = 10) {
  const [paging, setPaging] = useState<InfiniteListState>({ key: '', limit: pageSize })
  const limit = paging.key === resetKey ? paging.limit : pageSize

  if (paging.key !== resetKey) {
    setPaging({ key: resetKey, limit: pageSize })
  }

  const visibleItems = items.slice(0, limit)
  const hasMore = limit < items.length

  const loadMore = () => {
    if (!hasMore) return
    setPaging((current) => ({
      key: resetKey,
      limit: Math.min((current.key === resetKey ? current.limit : pageSize) + pageSize, items.length),
    }))
  }

  return {
    visibleItems,
    hasMore,
    shown: visibleItems.length,
    total: items.length,
    loadMore,
  }
}
