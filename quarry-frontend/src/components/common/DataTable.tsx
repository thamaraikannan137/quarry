import { Button, Table, Typography } from 'antd'
import type { TableProps } from 'antd'
import type { ReactNode } from 'react'

import { useInfiniteList } from '@/hooks/useInfiniteList'

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SCROLL_Y = 480

export type DataTableProps<T extends object> = Omit<
  TableProps<T>,
  'dataSource' | 'pagination' | 'onScroll'
> & {
  /** Full filtered list; the table windows it with scroll / load-more. */
  dataSource: T[]
  /** Change this when filters/quarry change so paging resets. */
  resetKey?: string
  pageSize?: number
  scrollY?: number | string
  scrollX?: number | true
  emptyText?: ReactNode
  /** Extra note when filters yield zero rows (e.g. “try Clear filters”). */
  emptyFilterHint?: string
  showLoadMore?: boolean
  footerExtra?: ReactNode
}

export function DataTable<T extends object>({
  dataSource,
  resetKey = '',
  pageSize = DEFAULT_PAGE_SIZE,
  scrollY = DEFAULT_SCROLL_Y,
  scrollX = 960,
  emptyText = 'No data',
  emptyFilterHint,
  showLoadMore = true,
  footerExtra,
  sticky = true,
  size = 'small',
  scroll,
  locale,
  ...tableProps
}: DataTableProps<T>) {
  const { visibleItems, hasMore, shown, total, loadMore } = useInfiniteList(dataSource, resetKey, pageSize)

  return (
    <div>
      <Table<T>
        {...tableProps}
        dataSource={visibleItems}
        pagination={false}
        size={size}
        sticky={sticky}
        scroll={{ x: scrollX, y: scrollY, ...scroll }}
        locale={{ emptyText, ...locale }}
        onScroll={(event) => {
          const target = event.currentTarget
          if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) {
            loadMore()
          }
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginTop: 12,
          flexWrap: 'wrap',
        }}
      >
        <Typography.Text type="secondary">
          Showing {shown} of {total}
          {hasMore ? ' · scroll for more' : ''}
          {total === 0 && emptyFilterHint ? ` · ${emptyFilterHint}` : ''}
        </Typography.Text>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {footerExtra}
          {showLoadMore && hasMore && (
            <Button size="small" onClick={loadMore}>
              Load more
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
