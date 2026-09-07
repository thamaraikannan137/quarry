import { Radio, Segmented } from 'antd'
import { useEffect, useState } from 'react'

import { NumberInput } from '@/components/common'
import type { GstType } from '@/types/marking'

type TaxType = Exclude<GstType, 'none'>

type GstModeBarProps = {
  gstType: GstType
  gstPct: number
  onTypeChange: (gstType: GstType) => void
  onPctChange: (gstPct: number) => void
}

export function GstModeBar({ gstType, gstPct, onTypeChange, onPctChange }: GstModeBarProps) {
  const withGst = gstType !== 'none'
  const [lastTax, setLastTax] = useState<TaxType>(gstType === 'none' ? 'intra' : gstType)
  const taxType: TaxType = gstType === 'none' ? lastTax : gstType

  useEffect(() => {
    if (gstType !== 'none') setLastTax(gstType)
  }, [gstType])

  return (
    <div className={`mk-gst-bar ${withGst ? 'is-gst' : 'is-none'}`}>
      <Segmented
        className="mk-gst-toggle"
        value={withGst ? 'gst' : 'none'}
        onChange={(value) => onTypeChange(value === 'gst' ? taxType : 'none')}
        options={[
          { label: 'Without GST', value: 'none' },
          { label: 'With GST', value: 'gst' },
        ]}
      />
      {withGst && (
        <>
          <Radio.Group
            className="mk-gst-kind"
            optionType="button"
            value={taxType}
            onChange={(event) => onTypeChange(event.target.value as TaxType)}
            options={[
              { label: 'CGST + SGST', value: 'intra' },
              { label: 'IGST', value: 'igst' },
              { label: 'GST', value: 'gst' },
            ]}
          />
          <NumberInput
            className="mk-gst-pct-input"
            decimal
            min={0}
            max={100}
            value={gstPct}
            addonAfter="%"
            onChange={(n) => onPctChange(n == null ? 0 : Number(n))}
          />
        </>
      )}
    </div>
  )
}
