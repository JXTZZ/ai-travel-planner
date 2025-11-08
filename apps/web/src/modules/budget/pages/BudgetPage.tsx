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
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useBudgetSummaries } from '../../../hooks/useBudgetSummaries'
import { useTripsQuery } from '../../../hooks/useTripsQuery'
import { addExpense, deleteExpense, getExpensesByTrip, updateExpense } from '../../../lib/expenseApi'
import { updateTripBudget } from '../../../lib/tripApi'
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
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState<string>()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseForm] = Form.useForm()
  const [budgetForm] = Form.useForm()
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
      queryClient.invalidateQueries({ queryKey: ['budget-summaries'] })
      message.success('费用已添加')
      setIsExpenseModalOpen(false)
      expenseForm.resetFields()
      refetch()
    },
    onError: (err: Error) => {
      message.error(`添加失败：${err.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExpenseInput> }) => updateExpense(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', selectedTripId] })
      queryClient.invalidateQueries({ queryKey: ['budget-summaries'] })
      message.success('费用已更新')
      setIsExpenseModalOpen(false)
      setEditingExpense(null)
      expenseForm.resetFields()
      refetch()
    },
    onError: (err: Error) => {
      message.error(`更新失败：${err.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', selectedTripId] })
      queryClient.invalidateQueries({ queryKey: ['budget-summaries'] })
      message.success('已删除')
      refetch()
    },
    onError: (err: Error) => {
      message.error(`删除失败：${err.message}`)
    },
  })

  const budgetMutation = useMutation({
    mutationFn: ({ tripId, budget, currency }: { tripId: string; budget: number; currency: string }) =>
      updateTripBudget(tripId, budget, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-summaries'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      message.success('预算已设置')
      setIsBudgetModalOpen(false)
      budgetForm.resetFields()
      refetch()
    },
    onError: (err: Error) => {
      message.error(`设置失败：${err.message}`)
    },
  })

  const totalPlanned = useMemo(
    () => (summaries ?? []).reduce((acc, summary) => acc + summary.planned, 0),
    [summaries],
  )

  const totalSpent = useMemo(
    () => (summaries ?? []).reduce((acc, summary) => acc + summary.spent, 0),
    [summaries],
  )

  const mainCurrency = useMemo(() => {
    if (!summaries || summaries.length === 0) return 'CNY'
    const uniqueCurrencies = Array.from(new Set(summaries.map((item) => item.currency)))
    return uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : uniqueCurrencies.join(' / ')
  }, [summaries])

  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<ExpenseCategory, number>()
    for (const expense of expenses) {
      const current = categoryMap.get(expense.category) ?? 0
      categoryMap.set(expense.category, current + Number(expense.amount))
    }
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  const handleOpenExpenseModal = (tripId?: string, expense?: Expense) => {
    setSelectedTripId(tripId)
    setEditingExpense(expense ?? null)
    if (expense) {
      expenseForm.setFieldsValue({
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        note: expense.note,
        incurredAt: expense.incurred_at ? dayjs(expense.incurred_at) : null,
      })
    } else {
      expenseForm.resetFields()
    }
    setIsExpenseModalOpen(true)
  }

  const handleOpenBudgetModal = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId)
    setSelectedTripId(tripId)
    budgetForm.setFieldsValue({
      budgetTotal: trip?.budget_total ?? 0,
      budgetCurrency: trip?.budget_currency ?? 'CNY',
    })
    setIsBudgetModalOpen(true)
  }

  const handleSaveExpense = async () => {
    try {
      const values = await expenseForm.validateFields()
      const input: ExpenseInput = {
        tripId: selectedTripId!,
        category: values.category,
        amount: values.amount,
        currency: values.currency,
        note: values.note,
        incurredAt: values.incurredAt ? dayjs(values.incurredAt).toISOString() : undefined,
      }

      if (editingExpense) {
        updateMutation.mutate({ id: editingExpense.id, input })
      } else {
        addMutation.mutate(input)
      }
    } catch {
      message.error('请检查表单')
    }
  }

  const handleSaveBudget = async () => {
    try {
      const values = await budgetForm.validateFields()
      budgetMutation.mutate({
        tripId: selectedTripId!,
        budget: values.budgetTotal,
        currency: values.budgetCurrency,
      })
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
          管理旅行预算，记录实际支出，并实时查看预算使用情况和超支预警。
        </Paragraph>
        
        {/* 总体统计 */}
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic 
                title="预算总额" 
                value={totalPlanned} 
                suffix={mainCurrency} 
                precision={2} 
                loading={isLoading || loadingTrips}
              />
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
                valueStyle={{ color: totalPlanned > 0 && totalSpent > totalPlanned ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic
                title="剩余预算"
                value={totalPlanned - totalSpent}
                suffix={mainCurrency}
                precision={2}
                loading={isLoading || loadingTrips}
                valueStyle={{ color: totalPlanned - totalSpent < 0 ? '#cf1322' : '#3f8600' }}
              />
              {totalPlanned > 0 && (
                <Progress
                  percent={Math.min((totalSpent / totalPlanned) * 100, 100)}
                  status={totalSpent > totalPlanned ? 'exception' : 'active'}
                  style={{ marginTop: 8 }}
                />
              )}
            </Card>
          </Col>
        </Row>
        {/* 按行程统计 */}
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
                const budgetPercent = item.planned > 0 ? (item.spent / item.planned) * 100 : 0
                const isOverBudget = item.planned > 0 && item.spent > item.planned

                return (
                  <List.Item
                    actions={[
                      <Button 
                        key="budget" 
                        type="link" 
                        icon={<SettingOutlined />}
                        onClick={() => handleOpenBudgetModal(item.tripId)}
                      >
                        设置预算
                      </Button>,
                      <Button 
                        key="add" 
                        type="link" 
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenExpenseModal(item.tripId)}
                      >
                        添加费用
                      </Button>,
                      <Button 
                        key="detail" 
                        type="link" 
                        onClick={() => setSelectedTripId(item.tripId)}
                      >
                        查看明细
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        <Text strong>{trip?.title ?? '未命名行程'}</Text>
                        {isOverBudget && <Tag color="red" icon={<WarningOutlined />}>超支</Tag>}
                      </Space>
                      <Space split="|">
                        <Text type="secondary">
                          预算：{item.planned > 0 ? `${item.planned.toFixed(2)} ${item.currency}` : '未设置'}
                        </Text>
                        <Text type="secondary">
                          支出：{item.spent.toFixed(2)} {item.currency}
                        </Text>
                        {item.planned > 0 && (
                          <Text type={isOverBudget ? 'danger' : 'secondary'}>
                            剩余：{(item.planned - item.spent).toFixed(2)} {item.currency}
                          </Text>
                        )}
                      </Space>
                      {item.planned > 0 && (
                        <Progress
                          percent={Math.min(budgetPercent, 100)}
                          status={isOverBudget ? 'exception' : budgetPercent > 80 ? 'normal' : 'active'}
                          size="small"
                        />
                      )}
                    </Space>
                  </List.Item>
                )
              }}
            />
          )}
        </Card>

        {/* 费用明细 */}
        {selectedTripId && (
          <>
            <Card
              title={`费用明细 - ${trips.find((t) => t.id === selectedTripId)?.title ?? '未命名'}`}
              variant="borderless"
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => handleOpenExpenseModal(selectedTripId)}
                >
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
                      <Button
                        key="edit"
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenExpenseModal(selectedTripId, expense)}
                      >
                        编辑
                      </Button>,
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

            {/* 分类统计 */}
            {expensesByCategory.length > 0 && (
              <Card title="分类统计" variant="borderless">
                <List
                  dataSource={expensesByCategory}
                  renderItem={({ category, amount }) => {
                    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
                    const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0

                    return (
                      <List.Item>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Text strong>{category}</Text>
                            <Text>{amount.toFixed(2)} CNY ({percent.toFixed(1)}%)</Text>
                          </Space>
                          <Progress percent={Math.round(percent)} size="small" />
                        </Space>
                      </List.Item>
                    )
                  }}
                />
              </Card>
            )}
          </>
        )}
      </Space>

      {/* 费用添加/编辑模态框 */}
      <Modal
        title={editingExpense ? '编辑费用' : '添加费用'}
        open={isExpenseModalOpen}
        onOk={handleSaveExpense}
        onCancel={() => {
          setIsExpenseModalOpen(false)
          setEditingExpense(null)
          expenseForm.resetFields()
        }}
        confirmLoading={addMutation.isPending || updateMutation.isPending}
      >
        <Form form={expenseForm} layout="vertical">
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

      {/* 预算设置模态框 */}
      <Modal
        title="设置预算"
        open={isBudgetModalOpen}
        onOk={handleSaveBudget}
        onCancel={() => {
          setIsBudgetModalOpen(false)
          budgetForm.resetFields()
        }}
        confirmLoading={budgetMutation.isPending}
      >
        <Form form={budgetForm} layout="vertical">
          <Form.Item 
            name="budgetTotal" 
            label="预算总额" 
            rules={[{ required: true, message: '请输入预算总额' }]}
          >
            <InputNumber 
              min={0} 
              precision={2} 
              style={{ width: '100%' }} 
              placeholder="0.00"
              addonAfter={budgetForm.getFieldValue('budgetCurrency') ?? 'CNY'}
            />
          </Form.Item>
          <Form.Item name="budgetCurrency" label="币种" initialValue="CNY" rules={[{ required: true }]}>
            <Select onChange={() => budgetForm.setFieldsValue({ budgetTotal: budgetForm.getFieldValue('budgetTotal') })}>
              <Select.Option value="CNY">CNY 人民币</Select.Option>
              <Select.Option value="USD">USD 美元</Select.Option>
              <Select.Option value="EUR">EUR 欧元</Select.Option>
              <Select.Option value="JPY">JPY 日元</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default BudgetPage
