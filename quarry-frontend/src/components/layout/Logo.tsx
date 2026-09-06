import { themeConfig } from '@/configs/themeConfig'

type LogoProps = {
  collapsed?: boolean
  light?: boolean
}

export function Logo({ collapsed = false, light = false }: LogoProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
        padding: collapsed ? '0 8px' : '0 4px',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#1677ff',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        AG
      </div>
      {!collapsed && (
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: light ? '#fff' : 'inherit',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {themeConfig.templateName}
        </span>
      )}
    </div>
  )
}
