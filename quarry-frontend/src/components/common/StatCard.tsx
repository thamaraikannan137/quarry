import { Card, Statistic } from 'antd'
import type { CardProps } from 'antd'
import type { CSSProperties, ReactNode } from 'react'

const VALUE_FONT_SIZE = 20
const TITLE_FONT_SIZE = 13

type StatCardProps = {
  title: ReactNode
  value: number | string
  precision?: number
  formatter?: (value: number | string) => ReactNode
  valueColor?: string
  cardProps?: Omit<CardProps, 'children' | 'size'>
}

/** Shared metric card — same title/value typography on every feature page. */
export function StatCard({ title, value, precision, formatter, valueColor, cardProps }: StatCardProps) {
  const contentStyle: CSSProperties = {
    fontSize: VALUE_FONT_SIZE,
    lineHeight: 1.25,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    ...(valueColor ? { color: valueColor } : null),
  }

  return (
    <Card
      size="small"
      {...cardProps}
      styles={{
        body: { overflow: 'hidden', minHeight: 88, display: 'flex', alignItems: 'center' },
        ...cardProps?.styles,
      }}
    >
      <Statistic
        title={title}
        value={value}
        precision={precision}
        formatter={formatter ? (val) => formatter(val as number | string) : undefined}
        styles={{
          title: { fontSize: TITLE_FONT_SIZE, marginBottom: 4 },
          content: contentStyle,
        }}
      />
    </Card>
  )
}
