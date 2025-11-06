# Supabase CLI 验证步骤（最新版 v2.54.11）

## 前提条件
- 已安装 Supabase CLI v2.54.11+
- 已在 `.env`、`apps/web/.env.local`、`supabase/.env` 中填写真实密钥

## 验证流程

### 1. 登录 Supabase CLI
```bash
cd d:\nju-work\ai-travel-planner
supabase login
```
- 执行后会打开浏览器进行 OAuth 认证
- 在终端输入验证码（如 `b1cef015`）
- 成功后提示：`You are now logged in. Happy coding!`

**✅ 已完成**

### 2. 关联远程项目
```bash
supabase link --project-ref zhugdvqgkqpmxhixtqaj
```
- `project-ref` 从 Supabase 项目 URL 提取：`https://zhugdvqgkqpmxhixtqaj.supabase.co`
- 成功后提示：`Finished supabase link.`

**✅ 已完成**

### 3. 验证项目列表
```bash
supabase projects list
```
- 应显示已关联项目 `ai_travel_planner`（标记为 `●` LINKED）
- 确认 REFERENCE ID 为 `zhugdvqgkqpmxhixtqaj`

**✅ 已完成，输出：**
```
LINKED | ORG ID               | REFERENCE ID         | NAME              | REGION                    
●      | sxumyrtkwmarlqyknzdm | zhugdvqgkqpmxhixtqaj | ai_travel_planner | Southeast Asia (Singapore)
```

### 4. 查看远程数据库状态（可选，需 Docker Desktop）
```bash
supabase status
```
⚠️ **注意**：此命令用于本地 Supabase 开发容器，需要 Docker Desktop 运行。如不使用本地 Supabase 实例，可跳过。

**当前状态**：Docker 未运行，命令失败（正常，因为我们使用远程 Supabase 托管服务）。

### 5. 验证数据库连接（推荐）
尝试拉取远程 schema：
```bash
supabase db pull
```
⚠️ 此命令也需要 Docker（用于运行 `pg_dump` 容器）。

**替代方案 - 直接验证 API 连接**：
在前端项目中测试 Supabase 客户端：

```typescript
// 创建 apps/web/src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

然后在任意组件测试连接：
```typescript
import { supabase } from '../lib/supabaseClient'

// 测试 Auth 服务
const { data, error } = await supabase.auth.getSession()
console.log('Supabase connection:', data ? 'OK' : error)
```

### 6. 上传 Edge Functions Secrets（生产环境）
将敏感密钥上传到 Supabase 项目：
```bash
supabase secrets set DEEPSEEK_API_KEY="your-key" --project-ref zhugdvqgkqpmxhixtqaj
supabase secrets set IFLYTEK_API_KEY="your-key" --project-ref zhugdvqgkqpmxhixtqaj
supabase secrets set IFLYTEK_API_SECRET="your-secret" --project-ref zhugdvqgkqpmxhixtqaj
```

查看已设置的 secrets：
```bash
supabase secrets list --project-ref zhugdvqgkqpmxhixtqaj
```

## 总结

✅ **已验证项目**：
- CLI 已登录且正常工作
- 项目 `zhugdvqgkqpmxhixtqaj` 已成功关联
- 可通过 Supabase Dashboard 或前端 SDK 访问

⚠️ **可选本地开发环境**：
- 如需本地 Supabase 实例（数据库、Auth、Storage 等），需安装并启动 Docker Desktop，然后运行 `supabase start`
- 如仅使用远程托管服务，无需 Docker

**下一步建议**：
1. 创建 `apps/web/src/lib/supabaseClient.ts` 初始化客户端
2. 在前端组件测试连接（auth.getSession() 或简单查询）
3. 设计数据库 schema 并通过 Supabase Dashboard SQL Editor 或 `supabase/migrations/*.sql` 创建表
4. 配置 RLS（Row Level Security）策略
