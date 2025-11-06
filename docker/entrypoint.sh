#!/bin/sh
set -eu

if [ -z "${VITE_SUPABASE_URL:-}" ] || [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
  echo "[WARN] 环境变量 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 未设置，将导致应用无法调用 Supabase。" >&2
fi

npx serve dist --single --listen 0.0.0.0:4173
