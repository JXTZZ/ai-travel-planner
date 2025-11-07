import { Alert, Button, Card, Col, Empty, Input, List, Row, Space, Spin, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import '@amap/amap-jsapi-types'
import { useTripsQuery } from '../../../hooks/useTripsQuery'

const { Title, Paragraph, Text } = Typography
const { Search } = Input

const DEFAULT_CENTER: [number, number] = [104.195397, 35.86166]

type AMapModule = Awaited<ReturnType<typeof AMapLoader.load>>
type MapInstance = InstanceType<AMapModule['Map']>
type GeocoderInstance = InstanceType<AMapModule['Geocoder']>
type MarkerInstance = InstanceType<AMapModule['Marker']>

type GeocodeResult = {
  geocodes: Array<{
    location: {
      getLng: () => number
      getLat: () => number
    }
  }>
}

const isGeocodeResult = (value: unknown): value is GeocodeResult => {
  if (typeof value !== 'object' || !value) return false
  return Array.isArray((value as GeocodeResult).geocodes)
}

const MapExplorerPage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const geocoderRef = useRef<GeocoderInstance | null>(null)
  const amapRef = useRef<AMapModule | null>(null)
  const markerMapRef = useRef<Map<string, MarkerInstance>>(new Map())

  const { data: trips, isLoading: loadingTrips } = useTripsQuery()
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const apiKey = useMemo(() => import.meta.env.VITE_AMAP_WEB_KEY, [])

  useEffect(() => {
    let destroyed = false
    const markerStore = markerMapRef.current

    const initMap = async () => {
      if (typeof window === 'undefined') {
        setMapError('当前环境不支持地图渲染，请在浏览器中访问。')
        setMapLoading(false)
        return
      }

      if (!apiKey) {
        setMapError('缺少高德地图 Key，请在 .env.local 中设置 VITE_AMAP_WEB_KEY。')
        setMapLoading(false)
        return
      }

      try {
        const AMap = await AMapLoader.load({
          key: apiKey,
          version: '2.0',
          plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder'],
        })

        if (destroyed) return

        const map = new AMap.Map(containerRef.current as HTMLElement, {
          viewMode: '3D',
          zoom: 5,
          center: DEFAULT_CENTER,
        })

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar())

        mapRef.current = map
        geocoderRef.current = new AMap.Geocoder()
        amapRef.current = AMap
      } catch (error) {
        console.error('[map] init failed', error)
        if (!destroyed) {
          setMapError('加载高德地图失败，请检查网络或 API Key 配置。')
        }
      } finally {
        if (!destroyed) {
          setMapLoading(false)
        }
      }
    }

    initMap()

    return () => {
      destroyed = true
      markerStore.forEach((marker) => marker.setMap(null))
      markerStore.clear()
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [apiKey])

  const createOrUpdateMarker = useCallback(
    (key: string, position: [number, number]) => {
      if (!mapRef.current || !amapRef.current) return null

      const existing = markerMapRef.current.get(key)
      if (existing) {
        existing.setPosition(position)
        existing.setMap(mapRef.current)
        mapRef.current.setZoomAndCenter(11, position)
        return existing
      }

      const marker = new amapRef.current.Marker({
        position,
        title: key,
      })

      marker.setExtData({ key })
      marker.setMap(mapRef.current)
      markerMapRef.current.set(key, marker)
      mapRef.current.setZoomAndCenter(11, position)
      return marker
    },
    [],
  )

  const geocode = useCallback(
    async (keyword: string) => {
      const geocoder = geocoderRef.current
      const map = mapRef.current
      if (!map || !geocoder) {
        throw new Error('地图尚未初始化完成')
      }

      return new Promise<MarkerInstance | null>((resolve, reject) => {
        geocoder.getLocation(keyword, (status: 'complete' | 'error' | 'no_data', result: unknown) => {
          if (status === 'complete' && isGeocodeResult(result) && result.geocodes.length > 0) {
            const location = result.geocodes[0].location
            const marker = createOrUpdateMarker(keyword, [location.getLng(), location.getLat()])
            resolve(marker)
          } else if (status === 'no_data') {
            resolve(null)
          } else {
            reject(new Error('地理编码失败，请稍后重试'))
          }
        })
      })
    },
    [createOrUpdateMarker],
  )

  const handleSearch = useCallback(
    async (value: string) => {
      const keyword = value.trim()
      if (!keyword) return

      setSearching(true)
      setMessage(null)

      try {
        const marker = await geocode(keyword)
        if (marker) {
          setMessage(`已定位：${keyword}`)
        } else {
          setMessage('未查到对应地点，请尝试更精确的地址描述。')
        }
      } catch (searchError) {
        console.error('[map] search error', searchError)
        setMessage(searchError instanceof Error ? searchError.message : '定位失败，请稍后重试。')
      } finally {
        setSearching(false)
      }
    },
    [geocode],
  )

  const handleFocusTrip = useCallback(
    async (destination?: string, title?: string) => {
      if (!destination) {
        setMessage('该行程尚未设置目的地。')
        return
      }

      try {
        const marker = await geocode(destination)
        if (marker) {
          setMessage(`行程「${title ?? destination}」已在地图中高亮。`)
        } else {
          setMessage('未能定位该行程目的地，请手动搜索。')
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '定位失败，请稍后重试。')
      }
    },
    [geocode],
  )

  const clearMarkers = useCallback(() => {
    markerMapRef.current.forEach((marker) => marker.setMap(null))
    markerMapRef.current.clear()
    mapRef.current?.setZoomAndCenter(5, DEFAULT_CENTER)
    setMessage('已清除所有标记。')
  }, [])

  return (
    <div className="page-container">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3}>地图探索</Title>
        <Paragraph type="secondary">
          集成高德地图 JS SDK，支持行程目的地定位、手动搜索与多标记管理。
        </Paragraph>
        {mapError && <Alert type="error" message="地图加载失败" description={mapError} showIcon />}
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Card
              bordered={false}
              bodyStyle={{ padding: 0, minHeight: 480 }}
              extra={
                <Space>
                  <Button onClick={clearMarkers} disabled={!mapRef.current || markerMapRef.current.size === 0}>
                    清除标记
                  </Button>
                </Space>
              }
            >
              <div ref={containerRef} style={{ width: '100%', height: 480 }}>
                {mapLoading && (
                  <Space style={{ width: '100%', height: 480, justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
                    <Spin tip="地图加载中..." />
                  </Space>
                )}
              </div>
            </Card>
            {message && (
              <Alert
                style={{ marginTop: 16 }}
                type="info"
                showIcon
                message="提示"
                description={message}
                onClose={() => setMessage(null)}
                closable
              />
            )}
          </Col>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Card bordered={false} title="手动搜索">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Search
                    placeholder="输入目的地或地址"
                    enterButton="定位"
                    loading={searching}
                    allowClear
                    onSearch={handleSearch}
                  />
                  <Text type="secondary">支持中文或英文地址，例如“上海虹桥火车站”。</Text>
                </Space>
              </Card>
              <Card bordered={false} title="行程目的地">
                <List
                  loading={loadingTrips}
                  dataSource={trips ?? []}
                  locale={{ emptyText: <Empty description="暂无行程，请先创建规划。" /> }}
                  renderItem={(trip) => (
                    <List.Item>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong>{trip.title}</Text>
                        <Space align="baseline" style={{ justifyContent: 'space-between' }}>
                          <Text type="secondary">{trip.destination ?? '目的地待定'}</Text>
                          <Button type="link" onClick={() => handleFocusTrip(trip.destination, trip.title)}>
                            定位
                          </Button>
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>
    </div>
  )
}

export default MapExplorerPage
