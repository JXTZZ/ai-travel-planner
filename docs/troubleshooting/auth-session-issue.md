# 认证会话丢失问题排查与解决

## 问题描述

用户在使用行程规划功能时，点击"创建新行程"按钮无法创建行程。通过诊断工具发现根本原因是：**认证会话丢失**（auth session missing）。

## 问题排查

### 诊断结果

使用 `/trip-debug` 页面进行了系统诊断：

1. ✅ **数据库表检查**：trips 表存在且可访问
2. ❌ **用户认证检查**：auth session missing
3. ❌ **创建行程测试**：因认证失败而无法执行

### 根本原因

用户的 Supabase 认证会话过期或丢失，导致所有需要认证的 API 操作都失败。可能的原因包括：

1. **会话过期**：Supabase 的默认会话有效期为 1 小时，如果未配置自动刷新可能导致会话过期
2. **浏览器存储清空**：如果用户清除了浏览器的 localStorage，会话信息会丢失
3. **跨域问题**：如果前端和 Supabase 域名配置不当，可能导致 Cookie 无法正常存储
4. **配置问题**：Supabase 客户端的会话持久化配置不完善

## 解决方案

### 1. 改进 Supabase 客户端配置

**文件**：`apps/web/src/lib/supabaseClient.ts`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // 持久化会话
    autoRefreshToken: true,      // 自动刷新令牌
    detectSessionInUrl: true,    // 从 URL 检测会话（用于邮箱验证跳转）
    storage: window.localStorage, // 明确使用 localStorage
    storageKey: 'lotus-ai-auth-token', // 自定义存储键名
  },
})
```

**改进点**：
- 添加 `detectSessionInUrl: true` 以支持邮箱验证后的自动登录
- 明确指定 `storage: window.localStorage` 确保会话存储位置
- 使用自定义 `storageKey` 避免与其他应用冲突

### 2. 增强用户界面错误提示

**文件**：`apps/web/src/modules/planner/pages/PlannerDashboard.tsx`

**改进点**：
1. 在创建行程前检查用户认证状态
2. 如果会话丢失，显示友好的 Modal 提示用户重新登录
3. 捕获认证相关错误并引导用户重新登录

```typescript
const handleCreateDraft = async () => {
  // 检查用户是否已登录
  if (!user) {
    Modal.confirm({
      title: '需要重新登录',
      content: '您的登录会话已过期，请重新登录后再创建行程。',
      okText: '去登录',
      cancelText: '取消',
      onOk: async () => {
        await signOut()
        navigate('/auth', { replace: true })
      },
    })
    return
  }

  // ... 创建行程逻辑
}
```

### 3. 创建诊断工具

**文件**：`apps/web/src/pages/TripDebugPage.tsx`

创建了专门的诊断页面 `/trip-debug`，可以快速检测：
- 用户认证状态
- 数据库连接状态
- 行程创建功能

当用户报告问题时，可以直接访问此页面进行诊断。

## 用户操作指南

### 如果遇到"无法创建行程"问题

1. **方法一：重新登录**
   - 点击右上角用户头像
   - 选择"退出登录"
   - 重新登录账号

2. **方法二：使用诊断工具**
   - 访问 `http://localhost:5173/trip-debug`
   - 按顺序点击三个测试按钮
   - 查看具体的错误信息
   - 如果提示会话丢失，点击"重新登录"按钮

3. **方法三：清除浏览器缓存**
   - 按 `F12` 打开开发者工具
   - 进入 Application → Storage
   - 点击 "Clear site data"
   - 重新登录

## 预防措施

### 1. 定期刷新令牌

Supabase 客户端已配置 `autoRefreshToken: true`，会在令牌过期前自动刷新。但如果用户长时间不活动（超过刷新令牌的有效期），仍然需要重新登录。

### 2. 监听认证状态变化

`AuthContext` 已经通过 `onAuthStateChange` 监听认证状态变化，当会话过期时会自动更新状态。

### 3. 在关键操作前检查认证

在执行关键操作（如创建行程）前，先检查 `user` 对象是否存在，如果不存在则提示用户重新登录。

## 技术细节

### Supabase 会话机制

- **Access Token**：有效期 1 小时，用于 API 调用认证
- **Refresh Token**：有效期 7 天（默认），用于刷新 Access Token
- 当 Access Token 过期但 Refresh Token 有效时，Supabase 客户端会自动刷新
- 当 Refresh Token 也过期时，用户需要重新登录

### 会话存储位置

- 存储在 `localStorage` 中
- 存储键名：`lotus-ai-auth-token`
- 包含：access_token, refresh_token, user 等信息

### 检查会话状态的方法

```typescript
// 方法 1：使用 AuthContext
const { user, session } = useAuth()
if (!user) {
  // 用户未登录
}

// 方法 2：直接调用 Supabase API
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  // 用户未登录或会话无效
}
```

## 相关文件

- `apps/web/src/lib/supabaseClient.ts` - Supabase 客户端配置
- `apps/web/src/contexts/AuthContext.tsx` - 认证上下文
- `apps/web/src/modules/planner/pages/PlannerDashboard.tsx` - 行程规划面板
- `apps/web/src/pages/TripDebugPage.tsx` - 诊断工具页面

## 后续优化建议

1. **添加会话过期提醒**：在会话即将过期时显示通知，提醒用户保存工作
2. **记住登录状态**：考虑添加"记住我"功能，延长会话有效期
3. **离线支持**：缓存用户数据，即使会话过期也能查看历史行程
4. **更友好的重新登录流程**：在认证失败时，保存用户当前的操作状态，登录后自动恢复

## 更新日志

- **2025-11-07**：识别并修复认证会话丢失导致的行程创建失败问题
  - 改进 Supabase 客户端配置
  - 增强错误提示和用户引导
  - 创建诊断工具页面
