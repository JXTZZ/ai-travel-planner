import {
  CalendarOutlined,
  CompassOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  SoundOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Dropdown, Layout, Menu, message, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
  { key: '/map', icon: <EnvironmentOutlined />, label: '地图探索' },
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
  const { user, signOut } = useAuth()

  const selectedKey = useMemo(() => {
    const match = navItems.find((item) =>
      item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
    )
    return match ? [match.key] : ['/']
  }, [location.pathname])

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      message.error('退出失败')
    } else {
      message.success('已退出登录')
      navigate('/auth')
    }
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.email ?? '用户',
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleSignOut,
    },
  ]

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
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Badge dot color="green">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }}>
                {user?.email?.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          </Dropdown>
        </Header>
        <Content style={{ margin: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
