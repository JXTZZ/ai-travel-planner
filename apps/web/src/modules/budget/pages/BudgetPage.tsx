import { Card, Col, Row, Space, Statistic, Typography } from 'antd'

const { Title, Paragraph } = Typography

const BudgetPage = () => {
  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>预算管理</Title>
        <Paragraph type="secondary">
          汇总旅行费用、预测预算超支，并同步至 Supabase 费用记录表。
        </Paragraph>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card bordered={false}>
              <Statistic title="预算总额" value={0} suffix="CNY" precision={2} />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false}>
              <Statistic title="已记录支出" value={0} suffix="CNY" precision={2} />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false}>
              <Statistic title="剩余预算" value={0} suffix="CNY" precision={2} />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}

export default BudgetPage
