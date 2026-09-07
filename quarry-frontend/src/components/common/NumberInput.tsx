import { InputNumber, type InputNumberProps } from 'antd'
import type { KeyboardEvent } from 'react'

type NumberInputProps = Omit<InputNumberProps, 'parser'> & {
  /** Allow one decimal point (GST, etc.). Default is whole numbers only. */
  decimal?: boolean
}

function parseDigits(value: string | undefined, decimal: boolean) {
  const raw = value ?? ''
  if (!decimal) return raw.replace(/\D/g, '')
  const cleaned = raw.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, '')}`
}

function isAllowedKey(event: KeyboardEvent<HTMLInputElement>, decimal: boolean) {
  if (event.metaKey || event.ctrlKey || event.altKey) return true
  if (event.key.length !== 1) return true
  if (/[0-9]/.test(event.key)) return true
  if (decimal && event.key === '.') return true
  return false
}

/** Numeric field that rejects letters — use for amount, litres, dimensions, rates. */
export function NumberInput({ decimal = false, onKeyDown, ...props }: NumberInputProps) {
  return (
    <InputNumber
      controls={false}
      inputMode={decimal ? 'decimal' : 'numeric'}
      {...props}
      parser={(value) => parseDigits(value, decimal)}
      onKeyDown={(event) => {
        if (!isAllowedKey(event, decimal)) event.preventDefault()
        onKeyDown?.(event)
      }}
    />
  )
}
