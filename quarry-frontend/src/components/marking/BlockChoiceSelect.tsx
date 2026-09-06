import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, Input, Select, Space, message } from 'antd'
import { useMemo, useState } from 'react'

import { mergeBlockChoices, saveCustomBlockChoice } from '@/utils/blockChoices'
import { defaultCbmRate } from '@/types/marking'

type BlockChoiceSelectProps = {
  value?: string
  extraChoices?: string[]
  size?: 'small' | 'middle' | 'large'
  className?: string
  onChange: (choice: string, rate: number) => void
}

export function BlockChoiceSelect({
  value,
  extraChoices = [],
  size = 'small',
  className,
  onChange,
}: BlockChoiceSelectProps) {
  const [customTick, setCustomTick] = useState(0)
  const [draft, setDraft] = useState('')

  const options = useMemo(() => {
    void customTick
    return mergeBlockChoices(extraChoices).map((choice) => ({ value: choice, label: choice }))
  }, [extraChoices, customTick])

  const addChoice = () => {
    const name = draft.trim()
    if (!name) {
      message.warning('Enter a choice name')
      return
    }
    const saved = saveCustomBlockChoice(name)
    setCustomTick((n) => n + 1)
    setDraft('')
    onChange(saved, defaultCbmRate(saved))
    message.success(`Choice “${saved}” added`)
  }

  return (
    <Select
      size={size}
      className={className}
      value={value || undefined}
      options={options}
      showSearch
      optionFilterProp="label"
      placeholder="Choice"
      filterOption={(input, option) =>
        String(option?.label ?? '')
          .toLowerCase()
          .includes(input.trim().toLowerCase())
      }
      onChange={(choice) => onChange(String(choice), defaultCbmRate(String(choice)))}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '4px 0' }} />
          <Space.Compact style={{ padding: '0 4px 4px', width: '100%' }}>
            <Input
              size="small"
              placeholder="New choice"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.stopPropagation()
                  addChoice()
                }
              }}
            />
            <Button size="small" type="text" icon={<PlusOutlined />} onClick={addChoice}>
              Add
            </Button>
          </Space.Compact>
        </>
      )}
    />
  )
}
