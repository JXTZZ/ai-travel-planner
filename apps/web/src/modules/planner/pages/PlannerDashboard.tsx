import { Alert, Button, Card, Col, Empty, List, Row, Space, Typography } from 'antd'
import { useTripsQuery } from '../../../hooks/useTripsQuery'
import { useTripStore } from '../../../state/useTripStore'

const { Title, Paragraph, Text } = Typography

const PlannerDashboard = () => {
  const { data: trips, isLoading, isError, error, refetch } = useTripsQuery()
  const upsertTrip = useTripStore((state) => state.upsertTrip)

  const handleCreateDraft = () => {
    const draftId = crypto.randomUUID()
    upsertTrip({
      id: draftId,
      title: '新的行程草稿',
    })
  }

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
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text>即将接入 DeepSeek 生成行程逻辑，支持多轮偏好细化。</Text>
                <Button type="primary" onClick={handleCreateDraft}>
                  新建空白草稿
                </Button>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="最近的行程草稿" bordered={false}>
              {isError ? (
                <Alert
                  type="error"
                  showIcon
                  message="无法加载行程"
                  description={String((error as Error)?.message ?? error)}
                  action={
                    <Button size="small" onClick={() => refetch()}>
                      重试
                    </Button>
                  }
                />
              ) : (
                <List
                  dataSource={trips ?? []}
                  loading={isLoading}
                  locale={{ emptyText: <Empty description="暂无行程" /> }}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong>{item.title}</Text>
                        <Text type="secondary">
                          {item.destination ?? '目的地待定'} ·{' '}
                          {item.startDate ? `${item.startDate} ~ ${item.endDate ?? '未设置'}` : '日期待定'}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}

export default PlannerDashboard
