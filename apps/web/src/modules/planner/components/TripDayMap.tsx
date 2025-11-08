import { Alert, Space, Spin, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import '@amap/amap-jsapi-types'
import type { TripActivity, TripDayWithActivities } from '../../../types/trip'

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }
}

const { Text } = Typography

const DEFAULT_CENTER: [number, number] = [104.195397, 35.86166]

type AMapModule = Awaited<ReturnType<typeof AMapLoader.load>>
type MapInstance = InstanceType<AMapModule['Map']>
type GeocoderInstance = InstanceType<AMapModule['Geocoder']>
type MarkerInstance = InstanceType<AMapModule['Marker']>
type PolylineInstance = InstanceType<AMapModule['Polyline']>

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

const sanitizeText = (value: string | null | undefined) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

interface TripDayMapProps {
  day: TripDayWithActivities | null
  height?: number
}

export const TripDayMap = ({ day, height = 320 }: TripDayMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const loaderPromiseRef = useRef<Promise<AMapModule> | null>(null)
  const amapRef = useRef<AMapModule | null>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const geocoderRef = useRef<GeocoderInstance | null>(null)
  const markersRef = useRef<MarkerInstance[]>([])
  const routeRef = useRef<PolylineInstance | null>(null)

  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const apiKey = useMemo(() => import.meta.env.VITE_AMAP_WEB_KEY as string | undefined, [])
  const securityJsCode = useMemo(() => import.meta.env.VITE_AMAP_SECURITY_JS_CODE as string | undefined, [])
  const restApiKey = useMemo(() => import.meta.env.VITE_AMAP_REST_KEY as string | undefined, [])

  const ensureAmapModule = useCallback(async () => {
    if (!apiKey) {
      throw new Error('缺少高德地图 Key，请在 .env.local 中设置 VITE_AMAP_WEB_KEY。')
    }

    if (securityJsCode && typeof window !== 'undefined') {
      if (!window._AMapSecurityConfig || window._AMapSecurityConfig.securityJsCode !== securityJsCode) {
        window._AMapSecurityConfig = { securityJsCode }
      }
    }

    if (!loaderPromiseRef.current) {
      loaderPromiseRef.current = AMapLoader.load({
        key: apiKey,
        version: '2.0',
        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder', 'AMap.Polyline', 'AMap.Geolocation'],
      })
    }

    const module = await loaderPromiseRef.current
    amapRef.current = module
    return module
  }, [apiKey, securityJsCode])

  const clearOverlays = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    if (routeRef.current) {
      routeRef.current.setMap(null)
      routeRef.current = null
    }
  }, [])

  useEffect(() => {
    let disposed = false

    const initMap = async () => {
      try {
        console.log('[TripDayMap] init start', { window: typeof window, container: !!containerRef.current })
        
        if (typeof window === 'undefined') {
          setMapError('当前环境不支持地图渲染，请在浏览器中访问。')
          setMapLoading(false)
          return
        }

        if (!containerRef.current) {
          console.log('[TripDayMap] container not ready, skipping init')
          return
        }

        console.log('[TripDayMap] loading AMap module...')
        const AMap = await ensureAmapModule()
        console.log('[TripDayMap] AMap module loaded', { disposed, container: !!containerRef.current })
        
        if (disposed || !containerRef.current) {
          console.log('[TripDayMap] disposed or container gone, aborting')
          return
        }

        if (mapRef.current) {
          console.log('[TripDayMap] map already exists, reusing')
          setMapLoading(false)
          setMapReady(true)
          return
        }

        console.log('[TripDayMap] creating map instance...')
        const mapInstance = new AMap.Map(containerRef.current, {
          viewMode: '3D',
          zoom: 5,
          center: DEFAULT_CENTER,
          resizeEnable: true,
        })

        mapInstance.addControl(new AMap.Scale())
        mapInstance.addControl(new AMap.ToolBar())

        const geocoder = new AMap.Geocoder({ city: '全国' })

        mapRef.current = mapInstance
        geocoderRef.current = geocoder
        setMapError(null)
        setMapReady(true)
        console.log('[TripDayMap] map initialization complete')
      } catch (error) {
        console.error('[TripDayMap] init failed', error)
        if (!disposed) {
          setMapError(error instanceof Error ? error.message : '地图加载失败，请检查网络或 API Key 配置。')
        }
      } finally {
        if (!disposed) {
          setMapLoading(false)
        }
      }
    }

    initMap()

    return () => {
      disposed = true
      setMapReady(false)
      setStatusMessage(null)
      clearOverlays()
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
      geocoderRef.current = null
    }
  }, [ensureAmapModule, clearOverlays])

  const geocodeViaPlugin = useCallback(
    (keyword: string) => {
      if (!geocoderRef.current || !amapRef.current) {
        return Promise.reject(new Error('地图尚未初始化'))
      }

      return new Promise<[number, number] | null>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error('地理编码超时'))
        }, 8000)

        try {
          geocoderRef.current.getLocation(keyword, (status: string, result: { geocodes?: Array<{ location?: GeocoderLocationVariant }> }) => {
            clearTimeout(timeout)

            if (status !== 'complete' || !result || !Array.isArray(result.geocodes) || result.geocodes.length === 0) {
              resolve(null)
              return
            }

            const location = result.geocodes[0]?.location as GeocoderLocationVariant
            if (!location) {
              resolve(null)
              return
            }

            if (isMethodLocation(location)) {
              resolve([location.getLng(), location.getLat()])
              return
            }

            if (isPropertyLocation(location)) {
              resolve([location.lng, location.lat])
              return
            }

            if (isTupleLocation(location)) {
              resolve([Number(location[0]), Number(location[1])])
              return
            }

            reject(new Error('地理编码结果格式无法解析'))
          })
        } catch (error) {
          clearTimeout(timeout)
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })
    },
    [],
  )

  const geocodeViaRest = useCallback(
    async (keyword: string) => {
      if (!restApiKey) {
        return null
      }

      const response = await fetch(
        `https://restapi.amap.com/v3/geocode/geo?key=${restApiKey}&address=${encodeURIComponent(keyword)}`,
      )

      if (!response.ok) {
        throw new Error(`REST 接口请求失败：${response.status}`)
      }

      const data = (await response.json()) as { status?: string; geocodes?: Array<{ location?: string }> }
      if (data.status !== '1' || !Array.isArray(data.geocodes) || data.geocodes.length === 0) {
        return null
      }

      const location = data.geocodes[0]?.location
      if (!location) {
        return null
      }

      const [lngStr, latStr] = location.split(',')
      const lng = Number(lngStr)
      const lat = Number(latStr)
      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        throw new Error('REST 接口返回的坐标无效')
      }

      return [lng, lat] as [number, number]
    },
    [restApiKey],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) {
      if (!day && map) {
        clearOverlays()
        map.setZoomAndCenter(5, DEFAULT_CENTER)
      }
      return
    }

    if (!day) {
      clearOverlays()
      map.setZoomAndCenter(5, DEFAULT_CENTER)
      setStatusMessage('请选择某一天以查看地图定位')
      return
    }

    const activitiesWithLocation = (day.trip_activities || [])
      .map((activity) => ({ activity, location: sanitizeText(activity.location) }))
      .filter((entry): entry is { activity: TripActivity; location: string } => Boolean(entry.location))

    clearOverlays()

    if (activitiesWithLocation.length === 0) {
      map.setZoomAndCenter(5, DEFAULT_CENTER)
      setStatusMessage('此日期的活动缺少地点信息，无法在地图中展示。')
      return
    }

    let cancelled = false

    const resolveMarkers = async () => {
      setStatusMessage('正在定位活动地点...')
      const coordinates: Array<{ position: [number, number]; title: string }> = []

      for (const entry of activitiesWithLocation) {
        const keyword = entry.location
        try {
          let coordinate = await geocodeViaPlugin(keyword)
          if (!coordinate) {
            coordinate = await geocodeViaRest(keyword)
          }

          if (coordinate) {
            coordinates.push({ position: coordinate, title: entry.activity.title })
          }
        } catch (error) {
          console.warn('[TripDayMap] geocode failed', keyword, error)
        }
      }

      if (cancelled) {
        return
      }

      if (coordinates.length === 0) {
        map.setZoomAndCenter(5, DEFAULT_CENTER)
        setStatusMessage('未能定位到有效的活动地点，请尝试在活动里补全地址信息。')
        return
      }

      if (!amapRef.current) {
        return
      }

      coordinates.forEach((item, index) => {
        const marker = new amapRef.current!.Marker({
          position: item.position,
          title: item.title,
          label: {
            content: `${index + 1}`,
            direction: 'top',
            offset: new amapRef.current!.Pixel(0, -12),
          },
        })

        marker.setExtData({ index: index + 1, title: item.title })
        marker.setMap(map)
        markersRef.current.push(marker)
      })

      routeRef.current = new amapRef.current.Polyline({
        path: coordinates.map((item) => item.position),
        strokeColor: '#1677ff',
        strokeOpacity: 0.8,
        strokeWeight: 4,
      })

      routeRef.current.setMap(map)

      if (markersRef.current.length > 0) {
        map.setFitView(markersRef.current, false, [60, 80, 60, 120])
      }
      setStatusMessage(`已定位 ${coordinates.length} 个活动地点，按照行程顺序展示。`)
    }

    resolveMarkers()

    return () => {
      cancelled = true
    }
  }, [day, mapReady, geocodeViaPlugin, geocodeViaRest, clearOverlays])

  if (mapError) {
    return <Alert type="error" showIcon message="地图不可用" description={mapError} />
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div
        ref={containerRef}
        style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f5f5f5', position: 'relative' }}
      >
        {mapLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              zIndex: 1000,
            }}
          >
            <Space direction="vertical" align="center">
              <Spin />
              <Text type="secondary">地图加载中…</Text>
            </Space>
          </div>
        )}
      </div>
      {statusMessage && (
        <Alert type="info" showIcon message={statusMessage} closable onClose={() => setStatusMessage(null)} />
      )}
    </Space>
  )
}

export default TripDayMap
