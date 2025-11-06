import {
  CalendarOutlined,
  CompassOutlined,
  DatabaseOutlined,
  SettingOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Layout, Menu, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo, useState } from 'react'
import { AppRoutes } from './routes'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const menuItems: MenuProps['items'] = [
  {
    key: 'planner',
    icon: <CompassOutlined />,
    label: '智能规划',
  },
  {
    key: 'budget',
    icon: <DatabaseOutlined />,
    label: '预算管理',
  },
  {
    key: 'voice',
    icon: <SoundOutlined />,
    label: '语音助手',
  },
  {
    key: 'calendar',
    icon: <CalendarOutlined />,
    label: '日历视图',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '偏好设置',
  },
]

const App = () => {
  const [collapsed, setCollapsed] = useState(false)

  const activeKey = useMemo(() => 'planner', [])

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
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={(info) => console.info('Nav pending', info.key)}
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
          <AppRoutes />
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
