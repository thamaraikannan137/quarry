import { Card } from 'antd'
import type { CardProps } from 'antd'
import type { ReactNode } from 'react'

type TableCardProps = {
  title?: ReactNode
  extra?: ReactNode
  children: ReactNode
  cardProps?: Omit<CardProps, 'title' | 'extra' | 'children'>
}

/** Standard feature-page panel: titled card with toolbar `extra` and a table body. */
export function TableCard({ title, extra, children, cardProps }: TableCardProps) {
  const { className, styles, ...rest } = cardProps ?? {}
  return (
    <Card
      title={title}
      extra={extra}
      className={['register-table-card', className].filter(Boolean).join(' ')}
      styles={{
        body: { paddingTop: 12, overflowX: 'auto' },
        header: { flexWrap: 'wrap', gap: 8, rowGap: 12 },
        ...styles,
      }}
      {...rest}
    >
      {children}
    </Card>
  )
}
