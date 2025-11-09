# LoTus AI Travel Planner - Docker 部署指南

> **最后更新**: 2025年11月9日  
> **适用版本**: v1.0.0+

本文档详细说明如何将 LoTus AI Travel Planner 前端应用容器化并部署到生产环境。

---

## 📋 目录

- [架构说明](#架构说明)
- [快速开始](#快速开始)
- [详细步骤](#详细步骤)
  - [方法1: Docker Compose(推荐)](#方法1-docker-compose推荐)
  - [方法2: 纯 Docker 命令](#方法2-纯-docker-命令)
  - [方法3: 导出镜像文件(离线部署)](#方法3-导出镜像文件离线部署)
- [环境变量配置](#环境变量配置)
- [镜像优化](#镜像优化)
- [故障排除](#故障排除)
- [安全最佳实践](#安全最佳实践)

---

## 🏗 架构说明

### 技术栈概览

- **前端**: React 19 + TypeScript + Vite
- **后端**: Supabase (托管服务,无需容器化)
- **Web 服务器**: Nginx (Alpine Linux)
- **容器编排**: Docker Compose

### 容器化范围

✅ **需要容器化**:
- `apps/web` - React 前端应用

❌ **无需容器化**:
- Supabase Backend (使用云服务)
- Edge Functions (Supabase 托管)
- PostgreSQL 数据库 (Supabase 托管)

---

## 🚀 快速开始

### 前置要求

- Docker 20.10+ ([安装指南](https://docs.docker.com/get-docker/))
- Docker Compose 2.0+ (通常随 Docker Desktop 安装)
- Git (克隆代码)

### 一键部署

```bash
# 1. 进入前端目录
cd apps/web

# 2. 配置环境变量
cp .env.docker.example .env.docker
# 编辑 .env.docker,填入真实的 Supabase 和高德地图密钥

# 3. 启动服务
docker-compose --env-file .env.docker up -d

# 4. 访问应用
# 浏览器打开: http://localhost
```

---

## 📖 详细步骤

### 方法1: Docker Compose(推荐)

#### 步骤 1: 准备环境变量

```bash
cd apps/web
cp .env.docker.example .env.docker
```

编辑 `.env.docker` 文件:

```bash
# Supabase 配置
VITE_SUPABASE_URL=https://zhugdvqgkqpmxhixtqaj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 高德地图 Web Key
VITE_AMAP_WEB_KEY=fc717be5312dd2e0ca800dce62d1d32b

# 讯飞语音 App ID
VITE_IFLYTEK_APP_ID=b4ed3cfd
```

#### 步骤 2: 构建并启动

```bash
# 构建镜像并启动容器
docker-compose --env-file .env.docker up -d

# 查看日志
docker-compose logs -f web

# 检查运行状态
docker-compose ps
```

#### 步骤 3: 验证部署

```bash
# 健康检查
curl http://localhost

# 查看容器详情
docker inspect lotus-web
```

#### 步骤 4: 管理容器

```bash
# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 更新代码后重新构建
docker-compose --env-file .env.docker up -d --build
```

---

### 方法2: 纯 Docker 命令

适用于不使用 Compose 的场景。

#### 步骤 1: 构建镜像

```bash
cd apps/web

docker build \
  --build-arg VITE_SUPABASE_URL=https://zhugdvqgkqpmxhixtqaj.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --build-arg VITE_AMAP_WEB_KEY=fc717be5312dd2e0ca800dce62d1d32b \
  --build-arg VITE_IFLYTEK_APP_ID=b4ed3cfd \
  -t lotus-ai-travel-planner:1.0.0 \
  .
```

#### 步骤 2: 运行容器

```bash
docker run -d \
  --name lotus-web \
  -p 80:80 \
  --restart unless-stopped \
  lotus-ai-travel-planner:1.0.0
```

#### 步骤 3: 管理容器

```bash
# 查看日志
docker logs -f lotus-web

# 停止容器
docker stop lotus-web

# 启动容器
docker start lotus-web

# 删除容器
docker rm -f lotus-web
```

---

### 方法3: 导出镜像文件(离线部署)

适用于无法直接访问镜像仓库的环境。

#### 场景 A: 导出为 tar 文件

```bash
# 1. 构建镜像
cd apps/web
docker build \
  --build-arg VITE_SUPABASE_URL=https://zhugdvqgkqpmxhixtqaj.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=eyJ... \
  --build-arg VITE_AMAP_WEB_KEY=fc717be... \
  --build-arg VITE_IFLYTEK_APP_ID=b4ed3cfd \
  -t lotus-ai-travel-planner:1.0.0 \
  .

# 2. 导出镜像(约 50-80MB)
docker save -o lotus-ai-travel-planner-v1.0.0.tar lotus-ai-travel-planner:1.0.0

# 3. 压缩以减小体积(可选)
gzip lotus-ai-travel-planner-v1.0.0.tar
# 最终文件: lotus-ai-travel-planner-v1.0.0.tar.gz (约 20-30MB)
```

**在目标机器上导入并运行**:

```bash
# 1. 解压(如果压缩了)
gunzip lotus-ai-travel-planner-v1.0.0.tar.gz

# 2. 导入镜像
docker load -i lotus-ai-travel-planner-v1.0.0.tar

# 3. 验证导入成功
docker images | grep lotus

# 4. 运行容器
docker run -d \
  --name lotus-web \
  -p 80:80 \
  --restart unless-stopped \
  lotus-ai-travel-planner:1.0.0
```

#### 场景 B: 推送到 Docker Hub(在线分发)

```bash
# 1. 登录 Docker Hub
docker login

# 2. 标记镜像
docker tag lotus-ai-travel-planner:1.0.0 yourusername/lotus-ai-travel-planner:1.0.0

# 3. 推送到仓库
docker push yourusername/lotus-ai-travel-planner:1.0.0

# === 用户下载运行 ===
docker pull yourusername/lotus-ai-travel-planner:1.0.0
docker run -d -p 80:80 yourusername/lotus-ai-travel-planner:1.0.0
```

---

## 🔐 环境变量配置

### 前端环境变量(VITE_*)

这些变量需要在**构建时**注入到镜像中:

| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | ✅ | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥(安全) | ✅ | `eyJhbGciOiJIUzI1NiI...` |
| `VITE_AMAP_WEB_KEY` | 高德地图 Web 服务 Key | ✅ | `fc717be5312dd2e0ca8...` |
| `VITE_IFLYTEK_APP_ID` | 讯飞开放平台 App ID | ✅ | `b4ed3cfd` |

### 后端环境变量(仅 Edge Functions)

这些变量**不应**打包进前端镜像,应配置在 Supabase Dashboard:

```bash
# 在 Supabase Dashboard > Edge Functions > Settings 中配置:
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 服务端高权限密钥
DEEPSEEK_API_KEY=sk-...           # DeepSeek AI API 密钥
IFLYTEK_API_KEY=0ecc422c...       # 讯飞 API 密钥
IFLYTEK_API_SECRET=NGUxNTNk...    # 讯飞 API 密钥
AMAP_REST_API_KEY=fc717be5...     # 高德地图服务端 Key
```

### 安全注意事项

⚠️ **重要提示**:

1. ✅ **可以打包进镜像**: `VITE_SUPABASE_ANON_KEY` (受 RLS 保护,安全暴露)
2. ❌ **绝不打包进镜像**: `SUPABASE_SERVICE_ROLE_KEY`、`DEEPSEEK_API_KEY` 等后端密钥
3. 🔒 `.env.docker` 文件应加入 `.gitignore`,不要提交到代码仓库
4. 🔑 生产环境建议使用 Docker secrets 或 Kubernetes ConfigMap

---

## 🎯 镜像优化

### 当前优化策略

本项目 Dockerfile 已实现以下优化:

| 优化项 | 说明 | 效果 |
|--------|------|------|
| **多阶段构建** | 构建阶段使用 `node:20-alpine`,运行阶段使用 `nginx:alpine` | 最终镜像 ~50MB |
| **层缓存利用** | 先复制 `package*.json`,再复制源码 | 依赖未变时跳过安装 |
| **.dockerignore** | 排除 `node_modules`、`.git` 等大文件 | 加快构建速度 |
| **静态资源压缩** | Nginx Gzip 压缩 | 减少传输体积 70% |
| **健康检查** | 内置 healthcheck | 自动监测服务状态 |

### 镜像体积对比

```
node:20 (完整镜像)        ~900MB
node:20-alpine (精简)     ~120MB
nginx:alpine              ~40MB
最终多阶段构建镜像         ~50MB ✅
```

### 进一步优化建议

```dockerfile
# 使用 npm ci 代替 npm install(更快且可重现)
RUN npm ci --legacy-peer-deps --only=production

# 清理构建缓存
RUN npm cache clean --force

# 使用特定版本标签,避免 latest 不确定性
FROM node:20.10.0-alpine AS builder
FROM nginx:1.25.3-alpine
```

---

## 🛠 故障排除

### 问题1: 容器启动后无法访问

**症状**: `curl http://localhost` 无响应

**排查步骤**:

```bash
# 1. 检查容器状态
docker ps -a

# 2. 查看日志
docker logs lotus-web

# 3. 进入容器调试
docker exec -it lotus-web sh
wget -O- http://localhost

# 4. 检查端口映射
netstat -tuln | grep 80
```

**常见原因**:
- 端口 80 被占用 → 改用 `-p 8080:80`
- 防火墙阻止 → 检查 `iptables` 或 Windows Defender

---

### 问题2: Supabase 连接失败

**症状**: 前端报错 `Failed to fetch`、`Network error`

**排查步骤**:

```bash
# 1. 检查环境变量是否正确注入
docker exec lotus-web cat /usr/share/nginx/html/assets/index-*.js | grep SUPABASE

# 2. 测试 Supabase 连接
curl https://zhugdvqgkqpmxhixtqaj.supabase.co/rest/v1/

# 3. 检查浏览器 Console 错误
# F12 > Console > 查看具体错误信息
```

**解决方法**:
- 确认 `.env.docker` 中 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 正确
- 重新构建镜像: `docker-compose up -d --build`

---

### 问题3: 构建失败 - 依赖安装错误

**症状**: `npm ERR! peer dependency`

**解决方法**:

```bash
# 在 Dockerfile 中使用 --legacy-peer-deps
RUN npm ci --legacy-peer-deps
```

---

### 问题4: 镜像体积过大

**症状**: 构建的镜像超过 500MB

**排查步骤**:

```bash
# 查看镜像层
docker history lotus-ai-travel-planner:1.0.0

# 分析镜像内容
docker run --rm -it lotus-ai-travel-planner:1.0.0 sh
du -sh /*
```

**常见原因**:
- 没有使用多阶段构建
- `node_modules` 被复制进最终镜像
- 使用了 `node:20` 而非 `node:20-alpine`

---

## 🔒 安全最佳实践

### 1. 密钥管理

❌ **不要这样做**:

```dockerfile
# 错误示例 - 硬编码密钥
ENV VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
```

✅ **正确做法**:

```bash
# 使用构建参数
docker build --build-arg VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY} .

# 或使用 Docker secrets(Swarm/Kubernetes)
docker secret create supabase_anon_key -
```

---

### 2. 最小权限原则

```dockerfile
# Dockerfile 中创建非 root 用户
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001
USER nginx-app
```

---

### 3. 网络隔离

```yaml
# docker-compose.yml
services:
  web:
    networks:
      - lotus-network

networks:
  lotus-network:
    driver: bridge
    internal: true  # 仅内部通信
```

---

### 4. 定期更新基础镜像

```bash
# 每月更新一次
docker pull node:20-alpine
docker pull nginx:1.25-alpine

# 重新构建
docker-compose build --no-cache
```

---

## 📊 生产环境检查清单

部署前请确认:

- [ ] 所有环境变量已正确配置
- [ ] `.env.docker` 未提交到 Git
- [ ] 已测试健康检查端点
- [ ] Nginx 日志可正常访问
- [ ] 已配置 HTTPS(建议使用 Nginx Proxy Manager 或 Traefik)
- [ ] 已设置容器重启策略(`restart: unless-stopped`)
- [ ] 已配置日志轮转(防止磁盘占满)
- [ ] 已备份 Supabase 数据库

---

## 📞 获取帮助

- **GitHub Issues**: [提交问题](https://github.com/JXTZZ/ai-travel-planner/issues)
- **文档**: `docs/README.md`
- **Edge Functions 部署**: `docs/edge-functions.md`

---

## 📝 更新日志

### v1.0.0 (2025-11-09)
- ✅ 初始 Docker 化支持
- ✅ 多阶段构建优化
- ✅ Nginx 配置(SPA 路由支持)
- ✅ Docker Compose 编排
- ✅ 健康检查配置

---

**部署愉快! 🚀**
