import {
  CalendarOutlined,
  CompassOutlined,
  DatabaseOutlined,
  HomeOutlined,
  SettingOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Layout, Menu, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Sider, Content } = Layout
const { Text } = Typography

type NavItem = {
  key: string
  icon: ReactNode
  label: string
}

const navItems: NavItem[] = [
  { key: '/', icon: <HomeOutlined />, label: '总览' },
  { key: '/planner', icon: <CompassOutlined />, label: '智能规划' },
  { key: '/budget', icon: <DatabaseOutlined />, label: '预算管理' },
  { key: '/voice', icon: <SoundOutlined />, label: '语音助手' },
  { key: '/calendar', icon: <CalendarOutlined />, label: '日历视图' },
  { key: '/settings', icon: <SettingOutlined />, label: '偏好设置' },
]

const toMenuItems = (items: NavItem[]): MenuProps['items'] =>
  items.map(({ key, icon, label }) => ({ key, icon, label }))

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = useMemo(() => {
    const match = navItems.find((item) =>
      item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
    )
    return match ? [match.key] : ['/']
  }, [location.pathname])

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            padding: '16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 600 }}>LoTus&apos;AI</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKey}
          items={toMenuItems(navItems)}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 24,
          }}
        >
          <Text strong>LoTus&apos;AI assistant</Text>
          <Badge dot color="green">
            <Avatar>LT</Avatar>
          </Badge>
        </Header>
        <Content style={{ margin: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
