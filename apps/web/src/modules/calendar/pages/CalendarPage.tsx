import { Card, Space, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

const CalendarPage = () => {
  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>行程日历</Title>
        <Paragraph type="secondary">
          行程生成后将在此处以日历形式展示活动安排，并支持拖拽调整顺序。
        </Paragraph>
        <Card bordered={false}>
          <Text>集成高德地图与日历视图的排期组件正在规划中。</Text>
        </Card>
      </Space>
    </div>
  )
}

export default CalendarPage
