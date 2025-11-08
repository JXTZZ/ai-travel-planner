import { Button, Card, Col, Row, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { SupabaseConnectionTest } from '../../../components/SupabaseConnectionTest'

const { Title, Paragraph, Text } = Typography

const HomePage = () => {
  const navigate = useNavigate()

  const handleStartPlanning = () => {
    navigate('/planner')
  }

  const handleImportTrip = () => {
    navigate('/planner')
  }

  return (
    <div className="page-container">
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card variant="borderless" className="hero-card">
            <Space direction="vertical" size="large">
              <Space direction="vertical" size={4}>
                <Text type="secondary">LoTus&apos;AI assistant</Text>
                <Title level={2}>AI 驱动的旅行规划新体验</Title>
              </Space>
              <Paragraph>
                通过语音或文字描述旅行需求，系统将利用 DeepSeek 大模型与高德地图，自动生成个性化行程及预算方案。
              </Paragraph>
              <Space size="middle">
                <Button type="primary" size="large" onClick={handleStartPlanning}>
                  开始规划
                </Button>
                <Button size="large" onClick={handleImportTrip}>
                  导入现有行程
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="核心能力" variant="borderless">
            <Space direction="vertical">
              <Text>· 智能行程规划与交通、住宿、餐饮建议</Text>
              <Text>· 语音录入与实时语音助手</Text>
              <Text>· 高德地图交互式路线可视化</Text>
              <Text>· 预算管理与费用追踪</Text>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="待办提示" variant="borderless">
            <Space direction="vertical">
              <Text>1. 配置 Supabase 数据库表与 RLS 策略</Text>
              <Text>2. 部署 Edge Functions 接入 DeepSeek 与科大讯飞</Text>
              <Text>3. 完成地图与语音模块前端集成</Text>
            </Space>
          </Card>
        </Col>
        <Col span={24}>
          <SupabaseConnectionTest />
        </Col>
      </Row>
    </div>
  )
}

export default HomePage
