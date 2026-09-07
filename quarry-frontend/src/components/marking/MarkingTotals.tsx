import { formatCbm, formatGstRate, splitIntraGst } from '@/utils/marking'
import { money } from '@/utils/money'
import type { GstType } from '@/types/marking'

type MarkingTotalsProps = {
  gstType: GstType
  gstPct: number
  cbm: number
  gross: number
  gstAmt: number
  total: number
  count: number
  sized: boolean
}

export function MarkingTotals({
  gstType,
  gstPct,
  cbm,
  gross,
  gstAmt,
  total,
  count,
  sized,
}: MarkingTotalsProps) {
  const split = splitIntraGst(gstAmt)
  const amount = (value: number) => (sized ? money(value) : '—')

  return (
    <div className="mk-totals">
      <div className="mk-totals-card">
        <div className="mk-totals-row">
          <span>Total net CBM</span>
          <strong>{sized ? formatCbm(cbm) : '0.000'}</strong>
        </div>
        <div className="mk-totals-row">
          <span>
            Gross total
            {count ? ` · ${count} block${count === 1 ? '' : 's'}` : ''}
          </span>
          <strong>{amount(gross)}</strong>
        </div>
        {gstType === 'intra' && (
          <>
            <div className="mk-totals-row">
              <span>CGST {formatGstRate(gstPct / 2)}%</span>
              <span>{amount(split.cgst)}</span>
            </div>
            <div className="mk-totals-row">
              <span>SGST {formatGstRate(gstPct / 2)}%</span>
              <span>{amount(split.sgst)}</span>
            </div>
          </>
        )}
        {gstType === 'igst' && (
          <div className="mk-totals-row">
            <span>IGST {formatGstRate(gstPct)}%</span>
            <span>{amount(gstAmt)}</span>
          </div>
        )}
        {gstType === 'gst' && (
          <div className="mk-totals-row">
            <span>GST {formatGstRate(gstPct)}%</span>
            <span>{amount(gstAmt)}</span>
          </div>
        )}
        <div className="mk-totals-row mk-totals-final">
          <span>Final total</span>
          <strong>{amount(total)}</strong>
        </div>
      </div>
    </div>
  )
}
