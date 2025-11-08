import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Typography,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useBudgetSummaries } from '../../../hooks/useBudgetSummaries'
import { useTripsQuery } from '../../../hooks/useTripsQuery'
import { addExpense, deleteExpense, getExpensesByTrip } from '../../../lib/expenseApi'
import { useTripStore } from '../../../state/useTripStore'
import type { Expense, ExpenseCategory, ExpenseInput } from '../../../types/expense'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const { Title, Paragraph, Text } = Typography

const BudgetPage = () => {
  const { user } = useAuth()
  const { isLoading: loadingTrips } = useTripsQuery()
  const trips = useTripStore((state) => state.trips)
  const { data: summaries, isLoading, isError, error, refetch } = useBudgetSummaries()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState<string>()
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', selectedTripId],
    queryFn: () => (selectedTripId ? getExpensesByTrip(selectedTripId) : Promise.resolve([])),
    enabled: !!selectedTripId,
  })

  const addMutation = useMutation({
    mutationFn: (input: ExpenseInput) => addExpense(input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', selectedTripId] })
      message.success('费用已添加')
      setIsModalOpen(false)
      form.resetFields()
      refetch()
    },
    onError: (err: Error) => {
      message.error(`添加失败：${err.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', selectedTripId] })
      message.success('已删除')
      refetch()
    },
    onError: (err: Error) => {
      message.error(`删除失败：${err.message}`)
    },
  })

  const totalSpent = useMemo(
    () => (summaries ?? []).reduce((acc, summary) => acc + summary.spent, 0),
    [summaries],
  )

  const mainCurrency = useMemo(() => {
    if (!summaries || summaries.length === 0) return 'CNY'
    const uniqueCurrencies = Array.from(new Set(summaries.map((item) => item.currency)))
    return uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : uniqueCurrencies.join(' / ')
  }, [summaries])

  const handleOpenModal = (tripId?: string) => {
    setSelectedTripId(tripId)
    setIsModalOpen(true)
  }

  const handleAddExpense = async () => {
    try {
      const values = await form.validateFields()
      const input: ExpenseInput = {
        tripId: selectedTripId!,
        category: values.category,
        amount: values.amount,
        currency: values.currency,
        note: values.note,
        incurredAt: values.incurredAt ? dayjs(values.incurredAt).toISOString() : undefined,
      }
      addMutation.mutate(input)
    } catch {
      message.error('请检查表单')
    }
  }

  const categoryOptions: ExpenseCategory[] = ['交通', '住宿', '餐饮', '门票', '购物', '其他']

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>预算管理</Title>
        <Paragraph type="secondary">
          汇总旅行费用、预测预算超支，并同步至 Supabase 费用记录表。
        </Paragraph>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic title="预算总额 (规划中)" value={0} suffix={mainCurrency} precision={2} />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless">
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
            <Card variant="borderless">
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
  <Card title="按行程统计" variant="borderless">
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
                  <List.Item
                    actions={[
                      <Button type="link" key="add" onClick={() => handleOpenModal(item.tripId)}>
                        添加费用
                      </Button>,
                      <Button type="link" key="detail" onClick={() => setSelectedTripId(item.tripId)}>
                        查看明细
                      </Button>,
                    ]}
                  >
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

        {selectedTripId && (
          <Card
            title={`费用明细 - ${trips.find((t) => t.id === selectedTripId)?.title ?? '未命名'}`}
            variant="borderless"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(selectedTripId)}>
                添加费用
              </Button>
            }
          >
            <List
              dataSource={expenses}
              loading={loadingExpenses}
              locale={{ emptyText: <Empty description="暂无费用记录" /> }}
              renderItem={(expense: Expense) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="delete"
                      title="确定删除？"
                      onConfirm={() => deleteMutation.mutate(expense.id)}
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Text strong>
                      {expense.category} - {expense.amount.toFixed(2)} {expense.currency}
                    </Text>
                    <Text type="secondary">{expense.note ?? '无备注'}</Text>
                    <Text type="secondary">{dayjs(expense.incurred_at).format('YYYY-MM-DD HH:mm')}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Space>

      <Modal
        title="添加费用"
        open={isModalOpen}
        onOk={handleAddExpense}
        onCancel={() => {
          setIsModalOpen(false)
          form.resetFields()
        }}
        confirmLoading={addMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="选择费用分类">
              {categoryOptions.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="currency" label="币种" initialValue="CNY" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="CNY">CNY 人民币</Select.Option>
              <Select.Option value="USD">USD 美元</Select.Option>
              <Select.Option value="EUR">EUR 欧元</Select.Option>
              <Select.Option value="JPY">JPY 日元</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="incurredAt" label="发生时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} placeholder="补充说明..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default BudgetPage
