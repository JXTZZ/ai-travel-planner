# ============================================
# 多阶段构建 - 构建阶段
# ============================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制依赖清单(利用 Docker 层缓存)
COPY package*.json ./

# 安装依赖
RUN npm ci --legacy-peer-deps

# 复制源代码
COPY . .

# 构建应用
# 注意: VITE_* 环境变量需要在构建时可用
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_AMAP_WEB_KEY
ARG VITE_AMAP_SECURITY_JS_CODE
ARG VITE_AMAP_REST_KEY
ARG VITE_IFLYTEK_APP_ID

# 基本校验: 如果必需变量缺失,直接终止构建
RUN test -n "$VITE_SUPABASE_URL" \
 && test -n "$VITE_SUPABASE_ANON_KEY" \
 && test -n "$VITE_AMAP_WEB_KEY" \
 && test -n "$VITE_AMAP_REST_KEY" \
 || (echo "Missing required build arguments. Please verify Docker build args." && exit 1)

# 生成构建时环境文件
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env.production && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env.production && \
    echo "VITE_AMAP_WEB_KEY=${VITE_AMAP_WEB_KEY}" >> .env.production && \
  echo "VITE_AMAP_SECURITY_JS_CODE=${VITE_AMAP_SECURITY_JS_CODE}" >> .env.production && \
  echo "VITE_AMAP_REST_KEY=${VITE_AMAP_REST_KEY}" >> .env.production && \
    echo "VITE_IFLYTEK_APP_ID=${VITE_IFLYTEK_APP_ID}" >> .env.production

# 执行构建
RUN npm run build

# ============================================
# 生产阶段 - 使用轻量级 nginx
# ============================================
FROM nginx:1.25-alpine

# 添加维护者信息
LABEL maintainer="LoTus AI Travel Planner"
LABEL description="LoTus AI Travel Planner - React Frontend with Supabase Backend"
LABEL version="1.0.0"

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制编译后的文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建非 root 用户(可选,增强安全性)
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
