import { money } from '@/utils/money'
import { formatGstRate, splitIntraGst } from '@/utils/marking'
import type { GstType } from '@/types/marking'

type MarkingTaxFooterProps = {
  gstType: GstType
  gstPct: number
  gstAmt: number
  sized: boolean
}

export function MarkingTaxFooter({ gstType, gstPct, gstAmt, sized }: MarkingTaxFooterProps) {
  if (gstType === 'intra') {
    const split = splitIntraGst(gstAmt)
    return (
      <>
        <tr>
          <td className="mk-tax-label" colSpan={7}>
            CGST {formatGstRate(gstPct / 2)}%
          </td>
          <td className="num">{sized ? money(split.cgst) : '—'}</td>
          <td />
        </tr>
        <tr>
          <td className="mk-tax-label" colSpan={7}>
            SGST {formatGstRate(gstPct / 2)}%
          </td>
          <td className="num">{sized ? money(split.sgst) : '—'}</td>
          <td />
        </tr>
      </>
    )
  }

  if (gstType === 'igst') {
    return (
      <tr>
        <td className="mk-tax-label" colSpan={7}>
          IGST {formatGstRate(gstPct)}%
        </td>
        <td className="num">{sized ? money(gstAmt) : '—'}</td>
        <td />
      </tr>
    )
  }

  return null
}
