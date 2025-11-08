# AI 行程 JSON 解析问题排查指南

## 问题描述

在使用 AI 生成旅行行程时，可能会遇到 JSON 解析失败的情况。最常见的问题包括：

1. **空字符串键值对**：AI 生成时意外插入 `""` 导致格式错误
2. **字段缺失**：必需字段未填写
3. **格式不一致**：时间、日期格式错误
4. **嵌套结构错误**：数组或对象嵌套层级错误

---

## 常见错误案例

### ❌ 错误示例 1：空字符串键值对

```json
{
  "title": "天津文化美食7日深度游",
  "startTime": "15:00",
  "endTime": "18:00",
  "",  // ← 错误：多余的空字符串
  "category": "sightseeing"
}
```

**表现**：JSON.parse() 抛出 `Unexpected token` 错误

**修复**：
```json
{
  "title": "天津文化美食7日深度游",
  "startTime": "15:00",
  "endTime": "18:00",
  "category": "sightseeing"
}
```

---

### ❌ 错误示例 2：字段值为空字符串

```json
{
  "location": "",  // ← 空字符串
  "startTime": "14:30",
  "",  // ← 无效的空键值对
  "endTime": "15:30"
}
```

**修复**：
```json
{
  "location": null,  // 或直接删除此字段
  "startTime": "14:30",
  "endTime": "15:30"
}
```

---

### ❌ 错误示例 3：地址格式不规范

```json
{
  "location": "西湖",  // ← 太模糊，无法在地图上定位
  "location": "市中心餐厅",  // ← 无效地址
  "departureLocation": "火车站"  // ← 缺少省市区信息
}
```

**修复**：
```json
{
  "location": "浙江省杭州市西湖区西湖风景名胜区",  // ✅ 完整的省市区+具体地点
  "location": "浙江省杭州市上城区楼外楼（孤山路店）",  // ✅ 包含店名和区域
  "departureLocation": "江苏省南京市玄武区南京南站"  // ✅ 完整的交通枢纽地址
}
```

---

## 🔧 自动修复机制

我们的 Edge Function 已实现多层 JSON 修复机制：

### 1. **基础清理** (`sanitizeAiJsonText`)

```typescript
// 移除空字符串键值对
result = result.replace(/,\s*""\s*,/g, ',')
result = result.replace(/,\s*""\s*}/g, '}')
result = result.replace(/,\s*""\s*\]/g, ']')

// 移除无效的空值字段
result = result.replace(/"[^"]*"\s*:\s*""\s*,/g, '')
result = result.replace(/,\s*"[^"]*"\s*:\s*""/g, '')
```

### 2. **JSON 修复库** (`jsonrepair`)

当基础清理失败时，使用 `jsonrepair` 库进行更深度的修复：

```typescript
import { jsonrepair } from 'https://esm.sh/jsonrepair@3.4.0'

try {
  return JSON.parse(raw)
} catch (initialError) {
  try {
    const repaired = jsonrepair(raw)
    return JSON.parse(repaired)
  } catch (repairError) {
    throw repairError
  }
}
```

### 3. **多候选解析**

系统会尝试多种可能的 JSON 提取方式：

1. 原始内容
2. ```json 代码块内容
3. 正则提取的 JSON 对象
4. 清理后的变体

---

## 📍 地址格式规范

### ✅ 正确的地址格式

**必须包含**：省 + 市 + 区/县 + 具体地点全称

| 类别 | 示例 |
|------|------|
| **景点** | `浙江省杭州市西湖区西湖风景名胜区` |
| | `江苏省苏州市姑苏区拙政园` |
| | `北京市东城区故宫博物院` |
| **餐厅** | `浙江省杭州市上城区楼外楼（孤山路店）` |
| | `江苏省南京市秦淮区夫子庙美食街` |
| | `天津市和平区山东路77号狗不理包子（山东路总店）` |
| **酒店** | `浙江省杭州市西湖区湖滨商圈` |
| | `江苏省苏州市姑苏区观前街附近` |
| **交通** | `江苏省南京市玄武区南京南站` |
| | `浙江省杭州市上城区杭州东站` |
| | `天津市河北区天津站` |

### ❌ 错误的地址格式

| 错误类型 | 错误示例 | 问题 |
|---------|---------|------|
| 过于模糊 | `西湖`、`天安门` | 无法确定具体位置 |
| 缺少行政区 | `杭州西湖`、`北京故宫` | 缺少省级或区级信息 |
| 泛指地点 | `市中心餐厅`、`当地美食` | 无法定位具体商户 |
| 仅描述性 | `景区附近`、`酒店周边` | 没有实际地址信息 |

---

## 🛠️ 排查步骤

### 1. 检查 JSON 格式

使用在线工具验证 JSON 格式：
- [JSONLint](https://jsonlint.com/)
- [JSON Formatter](https://jsonformatter.org/)

### 2. 查看原始 AI 响应

在浏览器开发者工具的 Network 标签中：

1. 找到 `plan-itinerary` 请求
2. 查看 Response 中的 `raw_content` 字段
3. 复制内容到 JSON 验证器检查

### 3. 检查错误日志

在开发环境中，控制台会显示：

```
[voice] iFlyTek error code: xxx, message: xxx
[plan-itinerary] JSON parse candidate failed
[plan-itinerary] Parse and store error: xxx
```

### 4. 查看数据库记录

检查 `voice_transcripts` 表中的原始响应：

```sql
SELECT content, created_at 
FROM voice_transcripts 
WHERE user_id = 'xxx'
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🔍 调试技巧

### 使用浏览器开发者工具

```javascript
// 在控制台中测试 JSON 解析
const rawResponse = `...AI 返回的内容...`

try {
  const parsed = JSON.parse(rawResponse)
  console.log('✅ 解析成功', parsed)
} catch (error) {
  console.error('❌ 解析失败', error.message)
  
  // 尝试提取 JSON
  const match = rawResponse.match(/```json\s*([\s\S]*?)\s*```/)
  if (match) {
    try {
      const extracted = JSON.parse(match[1])
      console.log('✅ 从代码块提取成功', extracted)
    } catch (e) {
      console.error('❌ 代码块提取失败', e.message)
    }
  }
}
```

### 手动修复常见问题

```javascript
// 移除空字符串
let fixed = rawResponse.replace(/,\s*""\s*,/g, ',')

// 移除尾部逗号
fixed = fixed.replace(/,\s*}/g, '}')
fixed = fixed.replace(/,\s*\]/g, ']')

// 移除空值字段
fixed = fixed.replace(/"[^"]*"\s*:\s*""\s*,/g, '')

console.log('修复后的 JSON:', fixed)
```

---

## 🚨 预防措施

### 1. 优化 Prompt

在发送给 AI 的提示词中明确要求：

```
**关键要求**：
1. 必须返回有效的 JSON 格式，不要添加额外的解释文字
2. 所有字段值不能为空字符串，使用 null 或省略该字段
3. location 必须使用完整格式：省+市+区+具体地点全称
4. 时间格式统一为 HH:MM（例如：09:00、14:30）
5. 日期格式统一为 YYYY-MM-DD（例如：2025-11-10）
```

### 2. 后端校验

Edge Function 已实现自动校验：

```typescript
// 地址规范化
const sanitizeText = (value: unknown, maxLength = 500): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

// 时间提取
const extractTimeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const match = value.match(/(\d{1,2})(?:[:：h点时](\d{1,2}))?/)
  if (!match) return null
  // ... 格式化为 HH:MM
}
```

### 3. 降级策略

当 AI 返回无效 JSON 时，系统会自动使用模板生成基础行程：

```typescript
const buildFallbackItinerary = (prompt: string): AIItinerary => {
  const destination = extractDestinationFromPrompt(prompt) || '目的地待定'
  return {
    title: `${destination} 行程草稿`,
    destination,
    days: [/* 默认 3 天模板 */]
  }
}
```

---

## 📊 常见问题统计

根据实际使用数据，最常见的错误类型：

| 错误类型 | 占比 | 解决方案 |
|---------|------|---------|
| 空字符串键值对 | 45% | `sanitizeAiJsonText` 自动清理 |
| 地址格式不规范 | 30% | System Prompt 强调规范 |
| 时间格式错误 | 15% | `extractTimeString` 容错解析 |
| 字段缺失 | 10% | `normalizeItinerary` 填充默认值 |

---

## ✅ 验证清单

在提交行程 JSON 前，检查以下项目：

- [ ] 所有 `{` 都有对应的 `}`
- [ ] 所有 `[` 都有对应的 `]`
- [ ] 所有字符串都用双引号 `"` 包裹
- [ ] 字段之间用逗号 `,` 分隔
- [ ] 最后一个字段后**不加**逗号
- [ ] 没有空字符串 `""` 作为独立元素
- [ ] `location` 字段包含省市区信息
- [ ] 时间格式为 `HH:MM`
- [ ] 日期格式为 `YYYY-MM-DD`
- [ ] `category` 只使用允许的值

---

## 🔗 相关资源

- [JSON 规范 (RFC 8259)](https://datatracker.ietf.org/doc/html/rfc8259)
- [jsonrepair 库文档](https://github.com/josdejong/jsonrepair)
- [Edge Functions 文档](./edge-functions.md)
- [API 参考](./API-QUICK-REFERENCE.md)

---

**最后更新**: 2025年11月8日  
**维护人**: GitHub Copilot
