import { Button, Card, Checkbox, Form, Input, Typography, theme } from 'antd'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Logo } from '@/components/layout/Logo'
import { useAuth } from '@/contexts/AuthContext'

type FormData = {
  username: string
  password: string
  remember: boolean
}

export function Login() {
  const { signIn } = useAuth()
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm<FormData>()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const from = (location.state as { from?: string } | null)?.from

  const onFinish = async (values: FormData) => {
    setLoading(true)
    setError(null)
    try {
      const result = await signIn(values.username, values.password, values.remember)
      if (!result.ok) {
        setError(result.message)
        return
      }
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } finally {
      setLoading(false)
    }
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
          Use the username and password from Users & roles.
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
            <Input autoComplete="username" autoFocus size="large" placeholder="Username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
            validateStatus={error ? 'error' : undefined}
            help={error || undefined}
          >
            <Input.Password autoComplete="current-password" size="large" placeholder="Password" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Remember me</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  )
}
