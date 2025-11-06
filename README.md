# LoTus'AI assistant

一个基于 React + TypeScript + Supabase 构建的 Web 版 AI 旅行规划助手，支持语音输入、AI 行程生成、地图展示与预算管理。

## 功能概览
- 语音或文字采集旅行需求，自动生成个性化行程
- 使用深度语言模型进行预算估计与行程优化
- 高德地图展示每日路线与兴趣点
- Supabase 提供登录、行程存储、费用记录与云端同步
- Docker 化部署，并计划通过 GitHub Actions 推送至阿里云镜像仓库

更多详细规划可参见 `docs/project-plan.md`。

## 技术栈
- 前端：React 18、TypeScript、Vite、React Query、Tailwind CSS
- 后端：Supabase（PostgreSQL、Auth、Storage、Edge Functions）
- 外部服务：科大讯飞语音识别、高德地图、深度语言模型 API
- 开发工具：ESLint、Prettier、Vitest、GitHub Actions、Docker

## 项目结构（规划）
```
.
├─ docs/                 # 项目文档与规划
├─ frontend/             # React + Vite 前端工程
│  ├─ public/
│  └─ src/
├─ supabase/             # Edge Functions、数据库迁移
├─ docker/               # Docker 相关脚本
├─ .github/workflows/    # CI/CD 配置
├─ .env.example          # 环境变量模板
└─ README.md
```

## 开发准备
1. 克隆仓库后复制 `.env.example` 为 `.env` 或 `.env.local`，填入自己的 API Key（切勿提交到 Git）
2. 安装 Node.js 20+ 与包管理器（建议 pnpm）
3. 在 Supabase 控制台创建项目并配置 Database schema / Edge Functions
4. 准备科大讯飞、高德地图、LLM 服务的 API 凭据

## 开发与运行（计划）
```bash
# 安装依赖
cd frontend
pnpm install

# 本地开发
pnpm dev

# 运行 Supabase Edge Function（示例）
supabase functions serve lotus-itinerary --env-file ../.env

# 构建生产包
pnpm build

# Docker 构建
cd ..
docker build -t lotus-ai-assistant:dev .
```

详细的构建、部署与测试说明将随着实现进度持续补充。
