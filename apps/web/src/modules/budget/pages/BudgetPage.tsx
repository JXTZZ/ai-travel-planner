import { Alert, Button, Card, Col, Empty, List, Row, Space, Statistic, Typography } from 'antd'
import { useMemo } from 'react'
import { useBudgetSummaries } from '../../../hooks/useBudgetSummaries'
import { useTripsQuery } from '../../../hooks/useTripsQuery'
import { useTripStore } from '../../../state/useTripStore'

const { Title, Paragraph, Text } = Typography

const BudgetPage = () => {
  const { isLoading: loadingTrips } = useTripsQuery()
  const trips = useTripStore((state) => state.trips)
  const { data: summaries, isLoading, isError, error, refetch } = useBudgetSummaries()

  const totalSpent = useMemo(
    () => (summaries ?? []).reduce((acc, summary) => acc + summary.spent, 0),
    [summaries],
  )

  const mainCurrency = useMemo(() => {
    if (!summaries || summaries.length === 0) return 'CNY'
    const uniqueCurrencies = Array.from(new Set(summaries.map((item) => item.currency)))
    return uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : uniqueCurrencies.join(' / ')
  }, [summaries])

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
              <Statistic title="预算总额 (规划中)" value={0} suffix={mainCurrency} precision={2} />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false}>
              <Statistic
                title="已记录支出"
                value={totalSpent}
                suffix={mainCurrency}
                precision={2}
                loading={isLoading || loadingTrips}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false}>
              <Statistic
                title="剩余预算 (规划中)"
                value={0 - totalSpent}
                suffix={mainCurrency}
                precision={2}
                loading={isLoading || loadingTrips}
              />
            </Card>
          </Col>
        </Row>
        <Card title="按行程统计" bordered={false}>
          {isError ? (
            <Alert
              type="error"
              message="无法获取费用"
              description={String((error as Error)?.message ?? error)}
              showIcon
              action={
                <Button size="small" onClick={() => refetch()}>
                  重试
                </Button>
              }
            />
          ) : (
            <List
              dataSource={summaries ?? []}
              loading={isLoading || loadingTrips}
              locale={{ emptyText: <Empty description="尚未记录费用" /> }}
              renderItem={(item) => {
                const trip = trips.find((entry) => entry.id === item.tripId)
                return (
                  <List.Item>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text strong>{trip?.title ?? '未命名行程'}</Text>
                      <Text type="secondary">
                        累计支出：{item.spent.toFixed(2)} {item.currency}
                      </Text>
                    </Space>
                  </List.Item>
                )
              }}
            />
          )}
        </Card>
      </Space>
    </div>
  )
}

export default BudgetPage
