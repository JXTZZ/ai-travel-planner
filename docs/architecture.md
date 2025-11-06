# LoTus'AI assistant 架构概览

## 1. 总体架构
- **前端 (`apps/web`)**：React + TypeScript + Vite，负责 UI、地图展示、行程可视化、前端状态管理、与 Supabase 及自建 API 交互。
- **后端服务**：依托 Supabase 提供认证、数据库、存储以及 Edge Functions。所有需要使用敏感密钥（DeepSeek、科大讯飞、高德高权限、Service Role）的逻辑均通过 Edge Functions 间接调用，前端仅使用 `anon` key。
- **外部能力集成**：
  - 语音识别：科大讯飞实时语音转文字，由 Edge Function 负责鉴权并与前端建立 WebSocket/签名。
  - 地图与规划：高德地图 JS SDK 在前端使用，受限 key 前端暴露。需要高权限时，由 Edge Function 代理。
  - 大语言模型：硅基流动 DeepSeek-R1-0528-Qwen3-8B，通过 Edge Function 调用。

## 2. 模块划分
- **前端核心模块**
  - `modules/auth`：Supabase Auth 登录注册模块。
  - `modules/itinerary`：行程规划、展示组件、行程 CRUD。
  - `modules/voice`：录音、播放、与 Edge Function 的语音识别接口。
  - `modules/map`：封装高德地图 JS SDK 的加载与交互。
  - `modules/budget`：费用预算及记录界面。
  - `modules/settings`：用户偏好配置。
  - `lib/supabaseClient.ts`：Supabase 客户端实例化。
  - `lib/api.ts`：与 Edge Functions/REST API 的 fetch 封装。
  - `store/`：应用状态管理（计划使用 Zustand 或 Redux Toolkit）。

- **后端 (Supabase)**
  - **数据库**：Postgres + Supabase Schema（见下表结构）。
  - **Edge Functions**：
    - `plan-itinerary`：调用 DeepSeek 生成行程，写入数据库。
    - `speech-signature`：生成科大讯飞 WebAPI 所需的鉴权签名。
    - `budget-sync`：预算、成本数据聚合与推送。
    - `map-proxy`（可选）：必要时代理高德 Web 服务。
  - **Storage**：行程相关的图片/附件。

## 3. 数据库初步设计
| 表名 | 说明 | 关键字段 |
| --- | --- | --- |
| `profiles` | 扩展 `auth.users` 的用户信息 | `id (uuid PK)`, `display_name`, `avatar_url`, `preferences` (jsonb) |
| `trips` | 行程主表 | `id`, `owner_id`, `title`, `destination`, `start_date`, `end_date`, `created_at`, `updated_at`, `party_size`, `budget_total`, `notes` |
| `trip_days` | 行程每日安排 | `id`, `trip_id`, `day_index`, `date`, `summary` |
| `trip_activities` | 行程具体活动 | `id`, `trip_id`, `day_index`, `order`, `title`, `description`, `location`, `lat`, `lng`, `start_time`, `end_time`, `cost_estimate`, `metadata` |
| `expenses` | 费用记录 | `id`, `trip_id`, `category`, `amount`, `currency`, `note`, `incurred_at`, `created_by` |
| `voice_transcripts` (可选) | 语音识别结果缓存 | `id`, `trip_id`, `content`, `transcribed_at`, `raw_metadata` |

所有表通过 RLS （Row Level Security）限制访问，仅允许拥有者或共享用户访问。

## 4. Secrets 管理策略
- **本地开发**：
  - 在根目录 `.env` 中存放通用配置（不会提交 Git）。
  - 前端 `apps/web/.env.local`：仅包含 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_AMAP_WEB_KEY` 等可暴露或低风险值。
  - `supabase/.env`：仅用于 Edge Functions 本地调试，包含 Service Role、DeepSeek、科大讯飞密钥。确保 `.gitignore` 屏蔽。
- **线上部署**：
  - GitHub Actions：通过 Repository Secrets 设置，构建时注入。
  - Supabase Edge Functions：使用 `supabase secrets set KEY=VALUE` 上传，即保存在 Supabase 项目中，不写入代码库。
  - 阿里云容器服务：通过容器实例的环境变量或 KMS 管理。

## 5. 部署流水线
1. 前端容器化：`apps/web/Dockerfile` 构建静态 bundle。
2. CI：GitHub Actions 构建镜像 → 推送至阿里云镜像仓库。
3. CD：阿里云容器服务部署；在环境变量中配置 Supabase、DeepSeek、高德等密钥。
4. Supabase Edge Functions 单独部署：`supabase/functions/*` 使用 `supabase` CLI 推送。

## 6. 后续工作计划
1. 初始化前端项目骨架（全局样式、路由、状态管理、UI 框架选择）。
2. 配置 Supabase 客户端、Auth 流程、RLS 策略 SQL 脚本。
3. 搭建 Edge Functions：行程规划、语音签名、预算服务。
4. 集成高德地图 SDK 与行程可视化组件。
5. 构建语音录制与识别流程。
6. 完成预算管理与费用记账模块。
7. 编写全面的单元/集成测试、E2E 测试。
8. 完成 Docker 化与 GitHub Actions 流水线。
