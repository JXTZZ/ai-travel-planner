# syntax=docker/dockerfile:1.7-labs

FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml* frontend/yarn.lock* frontend/package-lock.json* ./frontend/
RUN \ \
  if [ -f frontend/pnpm-lock.yaml ]; then \ \
    npm install -g pnpm && pnpm install --frozen-lockfile --filter .; \ \
  elif [ -f frontend/yarn.lock ]; then \ \
    npm install -g yarn && cd frontend && yarn install --frozen-lockfile; \ \
  else \ \
    cd frontend && npm install --omit=dev=false; \ \
  fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend
WORKDIR /app/frontend
ENV VITE_SUPABASE_URL="" \
  VITE_SUPABASE_ANON_KEY="" \
  VITE_AMAP_WEB_KEY="" \
  VITE_IFLYTEK_APP_ID="" \
  VITE_IFLYTEK_API_KEY="" \
  VITE_IFLYTEK_API_SECRET="" \
  VITE_LLM_API_BASE="" \
  VITE_LLM_API_KEY=""
RUN npm install -g pnpm && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/frontend/dist ./dist
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 4173
CMD ["./entrypoint.sh"]
