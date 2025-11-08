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

type GeocoderLocationVariant =
  | {
      getLng?: () => number
      getLat?: () => number
      lng?: number
      lat?: number
    }
  | [number, number]
  | null
  | undefined

interface GeocoderSearchResult {
  geocodes?: Array<{
    location?: GeocoderLocationVariant
    [key: string]: unknown
  }>
  [key: string]: unknown
}

const isMethodLocation = (location: GeocoderLocationVariant): location is { getLng: () => number; getLat: () => number } =>
  typeof location === 'object' &&
  location !== null &&
  typeof (location as { getLng?: unknown }).getLng === 'function' &&
  typeof (location as { getLat?: unknown }).getLat === 'function'

const isPropertyLocation = (location: GeocoderLocationVariant): location is { lng: number; lat: number } =>
  typeof location === 'object' &&
  location !== null &&
  typeof (location as { lng?: unknown }).lng === 'number' &&
  typeof (location as { lat?: unknown }).lat === 'number'

const isTupleLocation = (location: GeocoderLocationVariant): location is [number, number] =>
  Array.isArray(location) && location.length >= 2

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }
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
  const securityJsCode = useMemo(() => import.meta.env.VITE_AMAP_SECURITY_JS_CODE, [])
  const restApiKey = useMemo(() => import.meta.env.VITE_AMAP_REST_KEY, [])

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
        if (securityJsCode) {
          window._AMapSecurityConfig = { securityJsCode }
        }

        const AMap = await AMapLoader.load({
          key: apiKey,
          version: '2.0',
          plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder', 'AMap.Geolocation'],
        })

        if (destroyed) return

        const map = new AMap.Map(containerRef.current as HTMLElement, {
          viewMode: '3D',
          zoom: 5,
          center: DEFAULT_CENTER,
          resizeEnable: true,
        })

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar())

        // 创建地理编码服务实例
        const geocoder = new AMap.Geocoder({
          city: '全国', // 设置城市范围为全国
        })

        mapRef.current = map
        geocoderRef.current = geocoder
        amapRef.current = AMap
        
        console.log('[map] initialization complete', { map, geocoder })
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
  }, [apiKey, securityJsCode])

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

  const geocodeWithPlugin = useCallback(
    (keyword: string) => {
      const geocoder = geocoderRef.current
      const map = mapRef.current
      if (!map || !geocoder) {
        return Promise.reject(new Error('地图尚未初始化完成'))
      }

      console.log('[geocode] starting geocode via plugin for:', keyword)

      return new Promise<MarkerInstance | null>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          console.error('[geocode] plugin timeout after 8 seconds')
          reject(new Error('地理编码插件超时'))
        }, 8000)

        try {
          geocoder.getLocation(keyword, (status: string, result: GeocoderSearchResult) => {
            clearTimeout(timeoutId)
            console.log('[geocode] plugin callback - status:', status, 'result:', result)

            try {
              if (status === 'complete' && result && Array.isArray(result.geocodes) && result.geocodes.length > 0) {
                const location = result.geocodes[0].location

                let lng: number
                let lat: number

                if (isMethodLocation(location)) {
                  lng = location.getLng()
                  lat = location.getLat()
                } else if (isPropertyLocation(location)) {
                  lng = location.lng
                  lat = location.lat
                } else if (isTupleLocation(location)) {
                  lng = Number(location[0])
                  lat = Number(location[1])
                } else {
                  console.error('[geocode] unknown plugin location format:', location)
                  reject(new Error('地理编码插件返回的坐标格式无法识别'))
                  return
                }

                if (Number.isNaN(lng) || Number.isNaN(lat)) {
                  reject(new Error('地理编码插件返回的坐标无效'))
                  return
                }

                const marker = createOrUpdateMarker(keyword, [lng, lat])
                resolve(marker)
              } else if (status === 'no_data') {
                resolve(null)
              } else {
                reject(new Error(`地理编码失败：${status}`))
              }
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)))
            }
          })
        } catch (error) {
          clearTimeout(timeoutId)
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })
    },
    [createOrUpdateMarker],
  )

  const geocodeWithRest = useCallback(
    async (keyword: string) => {
      if (!restApiKey) {
        throw new Error('缺少 REST API Key，无法进行兜底地理编码')
      }

      const url = `https://restapi.amap.com/v3/geocode/geo?key=${restApiKey}&address=${encodeURIComponent(keyword)}`
      console.log('[geocode] fallback REST request:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`REST 接口请求失败：${response.status}`)
      }

      const data = await response.json()
      console.log('[geocode] REST response:', data)

      if (data.status !== '1' || !Array.isArray(data.geocodes) || data.geocodes.length === 0) {
        return null
      }

      const locationStr: string | undefined = data.geocodes[0]?.location
      if (!locationStr) {
        return null
      }

      const [lngStr, latStr] = locationStr.split(',')
      const lng = Number(lngStr)
      const lat = Number(latStr)

      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        throw new Error('REST 接口返回的坐标无效')
      }

      return createOrUpdateMarker(keyword, [lng, lat])
    },
    [restApiKey, createOrUpdateMarker],
  )

  const geocode = useCallback(
    async (keyword: string) => {
      let lastError: Error | null = null

      try {
        const marker = await geocodeWithPlugin(keyword)
        if (marker) {
          return marker
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn('[geocode] plugin geocode failed, attempting REST fallback', lastError)
      }

      try {
        const marker = await geocodeWithRest(keyword)
        if (marker) {
          return marker
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error('[geocode] REST geocode failed', lastError)
      }

      if (lastError) {
        throw lastError
      }

      return null
    },
    [geocodeWithPlugin, geocodeWithRest],
  )

  const handleSearch = useCallback(
    async (value: string) => {
      const keyword = value.trim()
      if (!keyword) {
        setMessage('请输入搜索关键词')
        return
      }

      if (!geocoderRef.current || !mapRef.current) {
        setMessage('地图尚未初始化完成，请稍后再试')
        return
      }

      setSearching(true)
      setMessage('正在搜索定位...')

      try {
        const marker = await geocode(keyword)
        if (marker) {
          setMessage(`✅ 已定位：${keyword}`)
        } else {
          setMessage('❌ 未查到对应地点，请尝试更精确的地址描述（如：北京市天安门广场）')
        }
      } catch (searchError) {
        console.error('[map] search error', searchError)
        setMessage(searchError instanceof Error ? `❌ ${searchError.message}` : '❌ 定位失败，请稍后重试')
      } finally {
        setSearching(false)
      }
    },
    [geocode],
  )

  const handleFocusTrip = useCallback(
    async (destination?: string, title?: string) => {
      if (!destination) {
        setMessage('❌ 该行程尚未设置目的地')
        return
      }

      if (!geocoderRef.current || !mapRef.current) {
        setMessage('❌ 地图尚未初始化完成，请稍后再试')
        return
      }

      setMessage(`正在定位：${destination}...`)

      try {
        const marker = await geocode(destination)
        if (marker) {
          setMessage(`✅ 行程「${title ?? destination}」已在地图中高亮`)
        } else {
          setMessage(`❌ 未能定位「${destination}」，请尝试手动搜索更精确的地址`)
        }
      } catch (error) {
        console.error('[map] focus trip error', error)
        setMessage(error instanceof Error ? `❌ ${error.message}` : '❌ 定位失败，请稍后重试')
      }
    },
    [geocode],
  )

  const clearMarkers = useCallback(() => {
    markerMapRef.current.forEach((marker) => marker.setMap(null))
    markerMapRef.current.clear()
    mapRef.current?.setZoomAndCenter(5, DEFAULT_CENTER)
    setMessage('✅ 已清除所有标记')
  }, [])

  const testGeocoder = useCallback(() => {
    console.log('[test] geocoder:', geocoderRef.current)
    console.log('[test] map:', mapRef.current)
    console.log('[test] amap:', amapRef.current)
    
    if (!geocoderRef.current || !mapRef.current) {
      setMessage('❌ 地图或地理编码服务未初始化')
      return
    }
    
    setMessage('✅ 地图和地理编码服务已就绪，可以尝试搜索')
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
                  <Button onClick={testGeocoder} disabled={mapLoading}>
                    测试地理编码
                  </Button>
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
