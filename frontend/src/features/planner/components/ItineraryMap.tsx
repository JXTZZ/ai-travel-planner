import { useEffect, useRef } from 'react';
import { loadAmap } from '../../../lib/amap';
import type { Itinerary } from '../../../types/itinerary';

type ItineraryMapProps = {
  itinerary: Itinerary | null;
};

export const ItineraryMap = ({ itinerary }: ItineraryMapProps): JSX.Element => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapContainer.current) {
        return;
      }
      try {
        const AMap = await loadAmap();
        if (!mapInstance.current) {
          mapInstance.current = new AMap.Map(mapContainer.current, {
            zoom: 10,
            viewMode: '3D'
          });
        }
        if (itinerary?.days?.length) {
          const markers = itinerary.days
            .flatMap((day) => day.activities)
            .filter((activity) => activity.location)
            .map((activity) => activity.location);
          if (markers.length > 0) {
            // TODO: 将地点名称转换为经纬度坐标（需要调用高德地理编码）
            console.info('待实现：根据活动地点生成地图标记', markers);
          }
        }
      } catch (error) {
        console.warn('加载高德地图失败：', error);
      }
    };
    void initMap();
  }, [itinerary]);

  return <div ref={mapContainer} className="h-72 w-full rounded-3xl bg-slate-100" />;
};
