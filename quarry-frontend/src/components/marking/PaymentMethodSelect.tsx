import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, Input, Select, Space, message } from 'antd'
import { useMemo, useState } from 'react'

import { mergePaymentMethods, saveCustomPaymentMethod } from '@/utils/paymentMethods'

type PaymentMethodSelectProps = {
  value?: string
  size?: 'small' | 'middle' | 'large'
  onChange?: (method: string) => void
}

export function PaymentMethodSelect({ value, size = 'middle', onChange }: PaymentMethodSelectProps) {
  const [customTick, setCustomTick] = useState(0)
  const [draft, setDraft] = useState('')

  const options = useMemo(() => {
    void customTick
    return mergePaymentMethods().map((method) => ({ value: method, label: method }))
  }, [customTick])

  const addMethod = () => {
    const name = draft.trim()
    if (!name) {
      message.warning('Enter a payment type')
      return
    }
    const saved = saveCustomPaymentMethod(name)
    setCustomTick((n) => n + 1)
    setDraft('')
    onChange?.(saved)
    message.success(`Payment type “${saved}” added`)
  }

  return (
    <Select
      size={size}
      value={value || undefined}
      options={options}
      showSearch
      optionFilterProp="label"
      placeholder="Select payment type"
      style={{ width: '100%' }}
      filterOption={(input, option) =>
        String(option?.label ?? '')
          .toLowerCase()
          .includes(input.trim().toLowerCase())
      }
      onChange={(method) => onChange?.(String(method))}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '4px 0' }} />
          <Space.Compact style={{ padding: '0 4px 4px', width: '100%' }}>
            <Input
              size="small"
              placeholder="New type"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.stopPropagation()
                  addMethod()
                }
              }}
            />
            <Button size="small" type="text" icon={<PlusOutlined />} onClick={addMethod}>
              Add
            </Button>
          </Space.Compact>
        </>
      )}
    />
  )
}
