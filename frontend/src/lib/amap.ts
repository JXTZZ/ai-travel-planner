import AMapLoader from '@amap/amap-jsapi-loader';

const amapKey = import.meta.env.VITE_AMAP_WEB_KEY ?? '';

let loaderPromise: Promise<typeof import('@amap/amap-jsapi-types')> | null = null;

export const loadAmap = async () => {
  if (loaderPromise) {
    return loaderPromise;
  }
  if (!amapKey) {
    throw new Error('未配置高德地图 Key，无法加载地图组件。');
  }
  loaderPromise = AMapLoader.load({
    key: amapKey,
    version: '2.0'
  }) as Promise<typeof import('@amap/amap-jsapi-types')>;
  return loaderPromise;
};
