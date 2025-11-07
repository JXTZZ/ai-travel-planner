# Supabase 邮件发送配置指南

## 当前状态

- ✅ 注册登录功能正常
- ❌ 注册后不发送验证邮件（已关闭邮箱验证）

## 为什么不发送邮件？

Supabase 默认使用内置的邮件服务，但有以下限制：
- 每小时最多发送 **4 封邮件**
- 仅用于测试，不适合生产环境
- 需要开启"Confirm email"才会发送验证邮件

## 配置方案

### 方案 A：使用 Supabase 内置邮件（简单测试）

#### 步骤 1：开启邮箱验证

1. 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/providers
2. 找到 **Email** 提供商，点击展开
3. **勾选** "Confirm email"
4. 点击 **Save**

#### 步骤 2：配置邮件模板（可选）

1. 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/templates
2. 选择 **Confirm signup** 模板
3. 自定义邮件内容（支持 HTML）

**限制：**
- ⚠️ 每小时最多 4 封邮件
- ⚠️ 邮件可能被标记为垃圾邮件
- ⚠️ 不支持自定义发件人

---

### 方案 B：配置自定义 SMTP（生产推荐）

使用第三方邮件服务，无发送限制。

#### 推荐的 SMTP 服务商

1. **QQ 邮箱** - 免费，适合国内
2. **163 邮箱** - 免费，适合国内
3. **SendGrid** - 每天 100 封免费
4. **阿里云邮件推送** - 按量付费
5. **腾讯云 SES** - 按量付费

#### 以 QQ 邮箱为例配置

##### 1. 获取 QQ 邮箱授权码

1. 登录 QQ 邮箱：https://mail.qq.com
2. 点击 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **IMAP/SMTP服务**
5. 点击 **生成授权码**（按提示发送短信）
6. **复制授权码**（这是 SMTP 密码，不是邮箱密码！）

##### 2. 在 Supabase 配置 SMTP

1. 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/settings/auth
2. 找到 **SMTP Settings** 部分
3. 填写以下信息：

```
Enable Custom SMTP: ✅ 开启
Sender email: 你的QQ邮箱@qq.com
Sender name: LoTus'AI助手
Host: smtp.qq.com
Port number: 465
Username: 你的QQ邮箱@qq.com
Password: 刚才获取的授权码（不是邮箱密码！）
```

4. 点击 **Save**

##### 3. 测试邮件发送

1. 访问：http://localhost:5173/auth
2. 使用真实邮箱注册（如你的QQ邮箱）
3. 检查邮箱收件箱（可能在垃圾箱）

---

#### 以 163 邮箱为例配置

##### 1. 获取 163 授权码

1. 登录 163 邮箱：https://mail.163.com
2. 设置 → POP3/SMTP/IMAP
3. 开启 **IMAP/SMTP服务**
4. 设置授权密码
5. **复制授权密码**

##### 2. Supabase SMTP 配置

```
Enable Custom SMTP: ✅ 开启
Sender email: 你的163邮箱@163.com
Sender name: LoTus'AI助手
Host: smtp.163.com
Port number: 465
Username: 你的163邮箱@163.com
Password: 163授权密码
```

---

#### 以 SendGrid 为例配置（国际推荐）

##### 1. 注册 SendGrid

1. 访问：https://sendgrid.com
2. 注册账号（需要验证邮箱）
3. 创建 API Key（Settings → API Keys → Create API Key）
4. **复制 API Key**

##### 2. Supabase SMTP 配置

```
Enable Custom SMTP: ✅ 开启
Sender email: noreply@你的域名.com（需要在SendGrid验证域名）
Sender name: LoTus'AI
Host: smtp.sendgrid.net
Port number: 587
Username: apikey（就是这个字符串）
Password: 你的SendGrid API Key
```

---

### 方案 C：开发环境跳过邮件验证（当前方案）

**优点：**
- ✅ 开发效率高，注册即可登录
- ✅ 无需配置复杂的 SMTP
- ✅ 适合快速迭代测试

**缺点：**
- ❌ 不发送验证邮件
- ❌ 无法测试邮件内容
- ❌ 生产环境不安全

**配置：**
- Authentication → Providers → Email → **取消勾选** "Confirm email"

---

## 推荐配置流程

### 开发阶段（当前）
```
1. 关闭邮箱验证（已完成）
2. 用户注册后直接激活
3. 快速测试业务功能
```

### 生产部署前
```
1. 配置自定义 SMTP（推荐 QQ/163 邮箱）
2. 开启邮箱验证
3. 自定义邮件模板
4. 测试邮件收发
5. 配置邮件限流规则
```

---

## 邮件模板自定义

访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/templates

### 可自定义的模板

1. **Confirm signup** - 注册验证邮件
2. **Invite user** - 邀请用户邮件
3. **Magic link** - 魔法链接登录
4. **Change email address** - 更改邮箱确认
5. **Reset password** - 重置密码邮件

### 模板变量

可在邮件内容中使用：
- `{{ .ConfirmationURL }}` - 确认链接
- `{{ .Token }}` - 验证令牌
- `{{ .TokenHash }}` - 令牌哈希
- `{{ .SiteURL }}` - 站点 URL
- `{{ .Email }}` - 用户邮箱

### 示例邮件模板

```html
<h2>欢迎加入 LoTus'AI！</h2>
<p>Hi，感谢注册我们的智能旅行规划助手。</p>
<p>请点击下方按钮验证您的邮箱：</p>
<a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
  验证邮箱
</a>
<p>如果按钮无法点击，请复制以下链接到浏览器：</p>
<p>{{ .ConfirmationURL }}</p>
<p>此链接将在 24 小时后失效。</p>
<hr>
<p style="color:#999;font-size:12px;">这是一封自动发送的邮件，请勿直接回复。</p>
```

---

## 快速操作指南

### 如果您想立即启用邮件（使用 QQ 邮箱）

**第一步：获取 QQ 授权码（5 分钟）**
1. 访问 https://mail.qq.com → 设置 → 账户
2. 开启 IMAP/SMTP，生成授权码
3. 复制授权码

**第二步：配置 Supabase SMTP（2 分钟）**
1. 访问 https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/settings/auth
2. 填写 SMTP 设置：
   - Host: smtp.qq.com
   - Port: 465
   - Username: 你的QQ邮箱
   - Password: QQ授权码
3. 保存

**第三步：开启邮箱验证（1 分钟）**
1. 访问 https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/providers
2. Email → 勾选 "Confirm email"
3. 保存

**第四步：测试（1 分钟）**
1. 访问 http://localhost:5173/auth
2. 注册测试邮箱
3. 检查邮箱收件箱

**总耗时：约 10 分钟**

---

## 常见问题

### Q: 配置 SMTP 后仍不发送邮件？
A: 检查：
1. SMTP 密码是授权码，不是邮箱密码
2. SMTP 服务已在邮箱设置中开启
3. 端口号正确（QQ/163 用 465，SendGrid 用 587）
4. "Confirm email" 已勾选

### Q: 邮件进入垃圾箱？
A: 
1. 使用自定义域名配置 SPF/DKIM 记录
2. 使用专业邮件服务（SendGrid、阿里云）
3. 设置友好的发件人名称

### Q: QQ 邮箱提示"需要授权码登录"？
A: 
1. 密码栏填写的应该是授权码，不是邮箱密码
2. 授权码在 QQ 邮箱设置中生成

### Q: 163 邮箱提示"客户端未授权"？
A: 
1. 需要在 163 邮箱设置中开启 SMTP 服务
2. 使用授权密码而非登录密码

---

## 建议

**当前阶段（开发）：**
- 保持邮箱验证关闭
- 专注于业务功能开发
- 节省时间和精力

**准备上线时：**
- 配置 QQ 或 163 邮箱 SMTP
- 开启邮箱验证
- 测试完整注册流程

这样既能保证开发效率，又能在上线时提供完整的用户体验。
