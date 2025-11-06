import { Card, Col, Row, Space, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

const PlannerDashboard = () => {
  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>行程规划中心</Title>
        <Paragraph type="secondary">
          在这里通过文字或语音描述旅行需求，AI 将生成路线建议、交通方案与住宿推荐。
        </Paragraph>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="创建新行程" bordered={false}>
              <Text>即将接入 DeepSeek 生成行程逻辑，支持多轮偏好细化。</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="最近的行程草稿" bordered={false}>
              <Text>未来将展示最近生成的行程方案，可一键继续编辑。</Text>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}

export default PlannerDashboard
