# Edge Functions 规划

## 1. `plan-itinerary`
- **目标**：调用 DeepSeek 模型生成行程草稿，后续结构化写入 `trips` 系列表。
- **输入**：`{ prompt, tripId?, userId?, constraints? }`
- **输出**：DeepSeek 原始响应与（可选）保存的转写记录 ID。
- **注意**：仅当传入 `userId` 时才写入 `voice_transcripts`，避免匿名请求触发 RLS 错误。

## 2. `speech-signature`
- **目标**：生成科大讯飞 WebAPI 所需签名，前端仅需拿到签名与 `appId`。
- **输入**：可选覆盖 `host`、`path`；默认 `iat-api.xfyun.cn/v2/iat`。
- **输出**：`{ appId, host, path, date, authorization }`。
- **后续**：前端使用返回值组装鉴权头，建立 WebSocket/HTTP 连接。

## 3. `budget-sync`
- **目标**：汇总 `expenses` 表数据，与前端预算页同步。
- **输入**：`{ tripId }`
- **输出**：`{ tripId, total, currency }`
- **扩展**：后续可增加分类统计、自动写回 `trips.budget_total`。

## Secrets
| 环境变量 | 用途 |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目地址（Edge Functions 也需要） |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role key，用于服务端写入 |
| `DEEPSEEK_API_KEY` | 硅基流动 DeepSeek 模型 Key |
| `IFLYTEK_APP_ID` / `IFLYTEK_API_KEY` / `IFLYTEK_API_SECRET` | 科大讯飞鉴权 |

> 部署时使用 `supabase secrets set` 写入，禁止在代码库中明文出现。
