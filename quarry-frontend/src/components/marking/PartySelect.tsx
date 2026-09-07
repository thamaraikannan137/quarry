import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, Select, type SelectProps } from 'antd'

type PartySelectProps = Omit<SelectProps, 'options' | 'dropdownRender'> & {
  parties: { id: string; name: string }[]
  onAddParty: () => void
}

export function PartySelect({ parties, onAddParty, ...props }: PartySelectProps) {
  return (
    <Select
      showSearch
      optionFilterProp="label"
      placeholder="Select party"
      {...props}
      options={parties.map((party) => ({ value: party.id, label: party.name }))}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ padding: '0 8px 8px' }}>
            <Button
              type="text"
              icon={<PlusOutlined />}
              block
              style={{ textAlign: 'left' }}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onClick={onAddParty}
            >
              Add party
            </Button>
          </div>
        </>
      )}
    />
  )
}
