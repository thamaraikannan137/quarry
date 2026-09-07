export function volCbm(l: number, w: number, h: number) {
  return (Number(l) * Number(w) * Number(h)) / 1_000_000_000
}

/** Excel / UI net CBM: (L−5)×(W−5)×(H−5) ÷ 1e6 with L,W,H in cm. */
export const NET_ALLOWANCE_CM = 5

export function dimsToCm(l: number, w: number, h: number) {
  const ln = Number(l) || 0
  const wn = Number(w) || 0
  const hn = Number(h) || 0
  if (ln > 0 && wn > 0 && hn > 0 && ln < 20 && wn < 20 && hn < 20) {
    return { l: ln * 100, w: wn * 100, h: hn * 100 }
  }
  return { l: ln, w: wn, h: hn }
}

export function netVolCbm(l: number, w: number, h: number) {
  const dims = dimsToCm(l, w, h)
  const nl = Math.max(0, dims.l - NET_ALLOWANCE_CM)
  const nw = Math.max(0, dims.w - NET_ALLOWANCE_CM)
  const nh = Math.max(0, dims.h - NET_ALLOWANCE_CM)
  return (nl * nw * nh) / 1e6
}

export function markGross(l: number, w: number, h: number, rate: number) {
  return Math.round(volCbm(l, w, h) * Number(rate) * 100) / 100
}

export function markGstAmt(l: number, w: number, h: number, rate: number, gstPct: number) {
  return Math.round(markGross(l, w, h, rate) * (Number(gstPct) / 100) * 100) / 100
}

export function markTotal(l: number, w: number, h: number, rate: number, gstPct: number) {
  return Math.round((markGross(l, w, h, rate) + markGstAmt(l, w, h, rate, gstPct)) * 100) / 100
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
