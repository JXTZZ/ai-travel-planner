# LoTus'AI assistant 项目规划

## 项目概览
- **目标**：构建一个支持语音交互的 Web 版 AI 旅行规划助手，为用户提供个性化行程、预算管理、地图导航与实时辅助。
- **用户群体**：需要快速制定旅行方案的个人或家庭用户。
- **主要特色**：语音输入、AI 行程生成、地图可视化、费用管理与 Supabase 云端数据同步。

## 核心功能拆解
1. **用户管理**
   - Supabase Authentication 登录注册（邮箱/魔法链接）
   - 用户偏好、历史行程、预算记录的多租户数据隔离
2. **语音交互**
   - 前端调用科大讯飞语音识别 API，将语音转为文本
   - 语音结果驱动行程生成或费用记录流程
3. **行程规划 AI**
   - 前端将用户输入与上下文交给后端代理（Supabase Edge Function）
   - Edge Function 调用硅基流动 LLM（deepseek-ai/DeepSeek-V3）生成行程方案
   - 输出包括交通、住宿、景点、餐饮、每日安排与预算估算
4. **地图与可视化**
   - 高德地图 JS SDK 展示目的地、行程路线与兴趣点
   - 行程卡片视图 + 地图交互联动
5. **预算管理**
   - 通过表单或语音记录开销，写入 Supabase 数据库
   - 预算概览（分类统计、剩余额度预估）
6. **实时辅助**
   - 可扩展的 Edge Function 模块（如天气提醒、路线调整）

## 技术架构
- **前端**：React 18 + TypeScript + Vite
  - 状态管理：React Query + Zustand（或 Jotai）
  - UI：Tailwind CSS + Headless UI + 自定义组件
  - 地图：高德地图 JS API
  - 语音：科大讯飞 Web SDK/HTTP API
- **后端**：Supabase
  - Database (PostgreSQL) + Row Level Security
  - Auth + Storage（行程封面、票据存档）
  - Edge Functions（Node 18 runtime）调用外部 API
- **CI/CD & 部署**
  - Docker 多阶段构建，产出 production 镜像
  - GitHub Actions 负责 lint/test/build & 推送镜像到阿里云容器镜像服务（ACR）
  - 通过环境变量注入各类 API Key（本地 `.env`、部署机密）

## 迭代计划
1. **第 0 周**：项目初始化（代码结构、Linter、CI、环境变量规范、README）
2. **第 1 周**：完成基础 UI、路由、Supabase Auth 流程、地图加载
3. **第 2 周**：接入语音识别与 LLM 行程生成，提供伪数据
4. **第 3 周**：实现预算管理、语音记账、数据持久化与测试
5. **第 4 周**：打磨 UX、补充文档、Docker 化、GitHub Actions、PDF 汇总

## 环境变量规划
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（仅 Edge Functions 使用）
- `VITE_AMAP_WEB_KEY`
- `VITE_IFLYTEK_APP_ID` / `VITE_IFLYTEK_API_KEY` / `VITE_IFLYTEK_API_SECRET`
- `LLM_API_BASE` / `LLM_API_KEY`
- `DOCKERHUB_USERNAME` / `ACR_REGISTRY` / `ACR_NAMESPACE` / `ACR_REPO`
- 其余凭据通过 `.env.local`、Supabase Secret、GitHub Actions Secret 管理

## 依赖与工具
- Node.js 20.x + pnpm（亦可 npm/yarn）
- Supabase CLI（本地调试 Edge Functions）
- 阿里云 CLI（用于手动推送镜像时的校验）
- Docker Desktop（本地构建）

## 质量保障
- ESLint + Prettier + TypeScript 严格模式
- Vitest + Testing Library（组件单测）
- Playwright（关键流程端到端测试，后期迭代）
- Git 提交流程：feat/fix/ chore 语义化，PR 模板（待补充）

## 风险与对策
- **外部 API 限速**：加缓存与降级策略，显示友好提示
- **语音转写延迟**：引导用户语音输入预览，必要时提供离线录音上传
- **LLM 生成不稳定**：在 Edge Function 层做重试、温度控制、模板化提示词
- **地图跨域/加载异常**：封装组件捕获错误并 fallback 至列表视图
- **秘钥泄露**：项目默认使用占位符，部署环境使用 Secret 注入，严禁硬编码
