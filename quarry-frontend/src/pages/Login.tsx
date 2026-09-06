import { Button, Card, Checkbox, Form, Input, Space, Typography, theme } from 'antd'
import { useState } from 'react'

import { Logo } from '@/components/layout/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { DEMO_LOGINS } from '@/data/demoUsers'

type FormData = {
  username: string
  password: string
  remember: boolean
}

export function Login() {
  const { signIn } = useAuth()
  const { token } = theme.useToken()
  const [form] = Form.useForm<FormData>()
  const [error, setError] = useState<string | null>(null)

  const onFinish = (values: FormData) => {
    const result = signIn(values.username, values.password, values.remember)
    if (!result.ok) setError(result.message)
  }

  const fillDemo = (username: string, password: string) => {
    form.setFieldsValue({ username, password, remember: true })
    setError(null)
    const result = signIn(username, password, true)
    if (!result.ok) setError(result.message)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: token.colorBgLayout,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo />
        </div>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
          Sign in
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          Melur office · quarry manager
        </Typography.Paragraph>

        <Form
          form={form}
          layout="vertical"
          initialValues={{ username: '', password: '', remember: true }}
          onFinish={onFinish}
          onValuesChange={() => {
            if (error) setError(null)
          }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Username is required' }]}
          >
            <Input autoComplete="username" autoFocus size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
            validateStatus={error ? 'error' : undefined}
            help={error || undefined}
          >
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Remember me</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            Sign in
          </Button>
        </Form>

        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 20, marginBottom: 8 }}>
          Demo
        </Typography.Text>
        <Space wrap size={4}>
          {DEMO_LOGINS.map((demo) => (
            <Button key={demo.username} type="link" size="small" onClick={() => fillDemo(demo.username, demo.password)}>
              {demo.username}
            </Button>
          ))}
        </Space>
      </Card>
    </div>
  )
}
