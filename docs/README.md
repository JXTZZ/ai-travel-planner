# LoTus'AI 旅行助手 - 技术文档

> AI 驱动的智能旅行规划系统

## 📚 文档索引

### 核心文档

| 文档 | 说明 |
|------|------|
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | 项目实现总结与功能清单 |
| [architecture.md](./architecture.md) | 系统架构设计文档 |
| [API-QUICK-REFERENCE.md](./API-QUICK-REFERENCE.md) | API 快速参考手册 |

### 配置与部署

| 文档 | 说明 |
|------|------|
| [supabase-setup.md](./supabase-setup.md) | Supabase 配置指南 |
| [database-migration-guide.md](./database-migration-guide.md) | 数据库迁移指南 |
| [edge-functions.md](./edge-functions.md) | Edge Functions 开发文档 |

### 优化方案

| 文档 | 说明 |
|------|------|
| [ui-optimization.md](./ui-optimization.md) | UI 性能优化方案 |
| [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) | 项目优化总结 (2025-11-08) |

## 🚀 快速开始

### 1. 环境配置

参考 [supabase-setup.md](./supabase-setup.md) 配置 Supabase 项目。

### 2. 数据库迁移

参考 [database-migration-guide.md](./database-migration-guide.md) 执行数据库迁移。

### 3. Edge Functions 部署

参考 [edge-functions.md](./edge-functions.md) 部署 Edge Functions。

### 4. 本地开发

```bash
cd apps/web
npm install
npm run dev
```

### 5. 生产构建

```bash
cd apps/web
npm run build
```

## 🎯 项目概览

**技术栈**:
- React 19 + TypeScript + Vite
- Ant Design 5
- Supabase (Auth, Database, Edge Functions)
- DeepSeek V3 AI
- 科大讯飞语音识别
- 高德地图 JS API 2.0

**核心功能**:
- ✅ AI 智能行程规划
- ✅ 语音交互助手
- ✅ 地图可视化与路线规划
- ✅ 预算管理与费用追踪
- ✅ 多用户协作（行程共享）

**当前完成度**: 95%

详见 [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## 📖 项目结构

```
ai-travel-planner/
├── apps/web/                 # 前端应用
│   ├── src/
│   │   ├── components/       # 共享组件
│   │   ├── contexts/         # React Context
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── lib/              # API 层
│   │   ├── modules/          # 功能模块
│   │   ├── routes/           # 路由配置
│   │   ├── state/            # Zustand Store
│   │   └── types/            # TypeScript 类型
│   └── public/
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── plan-itinerary/
│   │   ├── speech-signature/
│   │   └── budget-sync/
│   └── migrations/           # 数据库迁移
└── docs/                     # 技术文档（本目录）
```

## 🔗 相关链接

- [Supabase Dashboard](https://supabase.com/dashboard)
- [DeepSeek API](https://platform.deepseek.com/)
- [科大讯飞开放平台](https://www.xfyun.cn/)
- [高德地图开放平台](https://lbs.amap.com/)

---

**最后更新**: 2025年11月8日
