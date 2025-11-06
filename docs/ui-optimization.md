# UI 组件加载与性能优化方案

本项目使用 Ant Design + React + Vite，针对构建产物偏大的问题，规划如下优化策略：

## 1. 路由级代码分割（已完成）
- 使用 `React.lazy` + `Suspense`，仅在访问时加载模块。
- 目前已对首页、智能规划、预算、语音、日历、设置页面进行懒加载（见 `src/routes/index.tsx`）。

## 2. Ant Design 按需加载（待实施）
1. 安装 `vite-plugin-imp` 并在 `vite.config.ts` 中配置：
   ```bash
   npm install vite-plugin-imp --save-dev
   ```
   ```ts
   import vitePluginImp from 'vite-plugin-imp'

   export default defineConfig({
     plugins: [
       react(),
       vitePluginImp({
         libList: [
           {
             libName: 'antd',
             style: (name) => `antd/es/${name}/style/index.js`,
           },
         ],
       }),
     ],
   })
   ```
2. 写代码时保持 `import { Button } from 'antd'` 形式，插件将自动拆分组件及样式。
3. 构建后检查 `dist/assets/index-*.js` 体积变化，目标控制在 300 kB gzip 内。

> 若后续计划追加多数自定义主题，推荐改用 `antd-style` 或 CSS-in-JS 方案以减少全量样式。

## 3. 地图及语音第三方 SDK 延迟加载
- 高德地图 JS SDK 使用动态脚本注入，仅在进入规划/地图模块后加载。
- 科大讯飞语音 SDK 体积较大，可在语音助手页首次访问时再加载。

## 4. 资源与缓存策略
- Vite 默认提供 `esbuild` 压缩，后续可开启 `build.minify: 'terser'` 进一步压缩。
- 使用 `@vitejs/plugin-legacy` 时谨慎，避免增加 polyfill 体积。
- 部署时配置 CDN 缓存策略，对 `dist/assets` 设置长期缓存并使用 hash 命名。

## 5. 性能基线
- 将在 UI 集成完成后使用 `npm run build -- --report` (自建脚本) 分析 bundle。
- Lighthouse 目标：移动端性能评分 > 85，初次加载 < 3s（4G 网络）。
