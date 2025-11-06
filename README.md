# LoTus'AI assistant

一个基于 React + Supabase 的 AI 旅行规划 Web 应用。项目核心目标：整合 DeepSeek 大模型、科大讯飞语音识别、高德地图，实现端到端的个性化行程规划与实时辅助。

## 开发快照
- 前端框架：React + TypeScript + Vite (`apps/web`)
- 后端服务：Supabase（Auth、Database、Storage、Edge Functions）
- 外部 API：
  - 语音识别：科大讯飞 WebAPI
  - 地图：高德地图 JS SDK / Web 服务
  - 大模型：硅基流动 DeepSeek-R1-0528-Qwen3-8B
- 部署：Docker 容器 + GitHub Actions + 阿里云镜像仓库

## 本地开发
```bash
# 安装依赖
cd apps/web
npm install

# 本地开发预览
npm run dev

# 构建生产包
npm run build
```
### 环境变量
请将密钥配置到本地 `.env` 文件中，严禁提交真实密钥到版本库。

```bash
# 根目录 .env（示例）
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DEEPSEEK_API_KEY=...
IFLYTEK_API_KEY=...
IFLYTEK_API_SECRET=...
AMAP_REST_API_KEY=...
```

```bash
# apps/web/.env.local
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_AMAP_WEB_KEY=...
```

> `.env`、`.env.local` 已被 `.gitignore` 忽略。

### Supabase Edge Functions 密钥
本地调试 Edge Functions 时可以在 `supabase/.env` 中配置，线上部署请使用：

```bash
supabase secrets set DEEPSEEK_API_KEY=... IFLYTEK_API_SECRET=... --project-ref <project-ref>
```

## 代码结构
```
ai-travel-planner/
├── apps/
│   └── web/             # React 前端
├── docs/
│   └── architecture.md  # 架构说明
└── README.md
```

## 下一步
- [x] 初始化前端路由、全局样式、UI 框架
- [x] 集成 Supabase 初始 schema（迁移脚本与 RLS）
- [x] 搭建 Edge Functions 基础骨架（行程规划、语音签名、预算聚合）
- [ ] 构建地图、语音、预算模块
- [ ] 配置 Docker & GitHub Actions 部署流程
