# 启用邮箱验证的完整配置

## ⚠️ 重要说明

代码已修改为：**注册后必须验证邮箱才能登录**

## 必须完成的配置步骤

### 步骤 1：启用邮箱验证（必须）

1. 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/providers
2. 找到 **Email** 提供商，点击展开
3. **勾选** "Confirm email"
4. 点击 **Save**

### 步骤 2：配置 SMTP 邮件服务（必须）

#### 选项 A：使用 QQ 邮箱（推荐，5分钟配置）

**1. 获取 QQ 授权码**
```
访问：https://mail.qq.com
点击：设置 → 账户
找到：POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
操作：开启 IMAP/SMTP 服务
生成：授权码（发送短信验证）
复制：授权码（16位字符）
```

**2. 配置 Supabase SMTP**
```
访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/settings/auth

填写 SMTP Settings：
✅ Enable Custom SMTP: 开启
📧 Sender email: 你的QQ邮箱@qq.com
👤 Sender name: LoTus'AI智能助手
🌐 Host: smtp.qq.com
🔌 Port number: 465
👨‍💼 Username: 你的QQ邮箱@qq.com
🔑 Password: QQ授权码（不是邮箱密码！）

点击 Save
```

#### 选项 B：使用 163 邮箱

```
1. 访问 https://mail.163.com
2. 设置 → POP3/SMTP/IMAP → 开启 IMAP/SMTP 服务
3. 设置授权密码
4. 在 Supabase 填写：
   Host: smtp.163.com
   Port: 465
   Username: 你的163邮箱@163.com
   Password: 163授权密码
```

### 步骤 3：配置 URL 重定向（必须）

1. 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/url-configuration
2. 设置 **Site URL**: `http://localhost:5173`
3. 添加 **Redirect URLs**:
   ```
   http://localhost:5173
   http://localhost:5173/**
   http://localhost:5173/auth
   ```
4. 点击 **Save**

### 步骤 4：自定义邮件模板（可选）

1. 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/templates
2. 选择 **Confirm signup** 模板
3. 自定义邮件内容：

```html
<h2>欢迎注册 LoTus'AI 智能旅行助手！</h2>

<p>感谢您注册我们的服务。</p>

<p>请点击下方按钮验证您的邮箱地址：</p>

<a href="{{ .ConfirmationURL }}" 
   style="display:inline-block;
          background:#667eea;
          color:white;
          padding:15px 30px;
          text-decoration:none;
          border-radius:8px;
          font-weight:600;
          margin:20px 0;">
  ✅ 验证邮箱
</a>

<p>或复制以下链接到浏览器打开：</p>
<p style="background:#f5f5f5;padding:10px;border-radius:4px;word-break:break-all;">
  {{ .ConfirmationURL }}
</p>

<p style="color:#999;font-size:14px;margin-top:30px;">
  此链接将在 24 小时后失效。<br>
  如果您没有注册账号，请忽略此邮件。
</p>

<hr style="border:none;border-top:1px solid #eee;margin:30px 0;">

<p style="color:#999;font-size:12px;text-align:center;">
  这是一封自动发送的邮件，请勿直接回复。
</p>
```

## 测试流程

### 1. 测试注册流程

1. 访问：http://localhost:5173/auth
2. 填写注册信息：
   - 昵称：测试用户
   - 邮箱：你的真实邮箱（能收到邮件的）
   - 密码：至少6位
3. 点击 **注册**
4. 看到提示：**"注册成功！请查收邮箱验证邮件..."**

### 2. 验证邮箱

1. 打开邮箱（检查收件箱和垃圾箱）
2. 找到来自 LoTus'AI 的验证邮件
3. 点击 **验证邮箱** 按钮
4. 自动跳转回登录页面

### 3. 测试登录

1. 使用刚才注册的邮箱和密码登录
2. 成功进入应用主页

## 预期行为

### ✅ 正确流程

```
1. 用户填写注册表单
   ↓
2. 提交注册 → 显示"请查收邮箱验证邮件"
   ↓
3. 用户打开邮箱 → 点击验证链接
   ↓
4. 跳转回登录页 → 提示"邮箱已验证"
   ↓
5. 用户输入邮箱密码登录
   ↓
6. 成功进入应用 ✅
```

### ❌ 未验证邮箱尝试登录

```
用户注册后直接登录（未点击验证邮件）
   ↓
显示错误：Email not confirmed
   ↓
提示用户检查邮箱完成验证
```

## 常见问题排查

### 问题 1: 收不到验证邮件

**检查清单：**
- [ ] SMTP 是否正确配置？
- [ ] SMTP 密码是授权码，不是邮箱密码
- [ ] SMTP 服务是否在邮箱设置中开启？
- [ ] 邮件是否进入垃圾箱？
- [ ] 发件人邮箱是否正确？

**解决方法：**
1. 在 Supabase Dashboard → Settings → Auth → SMTP Settings
2. 点击 **Send test email** 测试
3. 检查 Supabase 日志：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/logs/edge-logs

### 问题 2: 点击验证链接后没反应

**检查：**
- [ ] Redirect URLs 是否配置了 `http://localhost:5173/**`？
- [ ] Site URL 是否设置为 `http://localhost:5173`？

**解决：**
重新配置 URL Configuration（步骤 3）

### 问题 3: 提示 "Email not confirmed"

**原因：** 用户未点击验证邮件就尝试登录

**解决：** 提醒用户检查邮箱并点击验证链接

### 问题 4: QQ 邮箱提示 "需要授权码登录"

**原因：** 密码填写的是邮箱密码，不是授权码

**解决：**
1. 重新登录 QQ 邮箱
2. 设置 → 账户 → 生成授权码
3. 使用授权码作为 SMTP 密码

## 开发建议

### 开发阶段（可选）

如果您仍在开发阶段，可以暂时关闭邮箱验证：
1. Auth Providers → Email → **取消勾选** "Confirm email"
2. 注册后可以直接登录（不需要验证邮件）
3. 开发完成后再开启

### 生产环境（必须）

上线前必须：
1. ✅ 配置 SMTP（使用稳定的邮件服务）
2. ✅ 开启邮箱验证
3. ✅ 自定义邮件模板
4. ✅ 测试完整注册流程
5. ✅ 配置邮件发送监控

## 快速链接

- [SMTP 设置](https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/settings/auth)
- [Auth 提供商](https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/providers)
- [URL 配置](https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/url-configuration)
- [邮件模板](https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/templates)
- [日志查看](https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/logs/edge-logs)

## 总结

完成以上 3 个必须步骤后：
1. ✅ 注册后不能直接登录
2. ✅ 必须验证邮箱才能登录
3. ✅ 表单不会自动填充用户名密码
4. ✅ 符合安全最佳实践

**预计配置时间：10-15 分钟**
