# LoTus AI Travel Planner - 部署指南

> **版本**: v1.0.0  
> **更新时间**: 2025年11月9日  
> **镜像文件**: `lotus-ai-travel-planner-v1.0.0.tar` (20MB)

---

## 📦 部署包内容

```
部署包/
├── lotus-ai-travel-planner-v1.0.0.tar   # Docker 镜像文件 (20MB)
└── DEPLOYMENT_GUIDE.md                  # 本说明文档
```

---

## 🖥️ 系统要求

- **操作系统**: Windows 10/11, macOS, Linux
- **Docker**: 20.10 或更高版本
- **内存**: 最低 512MB (推荐 1GB+)
- **磁盘空间**: 100MB

---

## 🚀 快速部署 (3步完成)

### Windows 系统

```powershell
# 第1步: 导入镜像
docker load -i lotus-ai-travel-planner-v1.0.0.tar

# 第2步: 验证镜像
docker images | Select-String "lotus"

# 第3步: 启动容器
docker run -d `
  --name lotus-web `
  -p 80:80 `
  --restart unless-stopped `
  lotus-ai-travel-planner:latest

# 访问应用
start http://localhost
```

### macOS / Linux 系统

```bash
# 第1步: 导入镜像
docker load -i lotus-ai-travel-planner-v1.0.0.tar

# 第2步: 验证镜像
docker images | grep lotus

# 第3步: 启动容器
docker run -d \
  --name lotus-web \
  -p 80:80 \
  --restart unless-stopped \
  lotus-ai-travel-planner:latest

# 访问应用
open http://localhost  # macOS
# 或在浏览器打开 http://localhost
```

---

## 🔧 高级配置

### 自定义端口

如果端口 80 被占用,可以使用其他端口:

```powershell
# 使用 8080 端口
docker run -d `
  --name lotus-web `
  -p 8080:80 `
  --restart unless-stopped `
  lotus-ai-travel-planner:latest

# 访问地址: http://localhost:8080
```

### 查看运行状态

```powershell
# 查看容器状态
docker ps -a | Select-String "lotus"

# 查看实时日志
docker logs -f lotus-web

# 查看最近20条日志
docker logs lotus-web --tail 20
```

### 管理容器

```powershell
# 停止容器
docker stop lotus-web

# 启动容器
docker start lotus-web

# 重启容器
docker restart lotus-web

# 删除容器(会保留镜像)
docker rm -f lotus-web
```

---

## 🌐 网络访问

### 本地访问
- **地址**: http://localhost 或 http://127.0.0.1
- **默认端口**: 80

### 局域网访问

1. 查看本机 IP 地址:
   ```powershell
   # Windows
   ipconfig | Select-String "IPv4"
   
   # macOS/Linux
   ifconfig | grep "inet "
   ```

2. 其他设备通过 IP 访问:
   ```
   http://192.168.x.x
   ```

### 公网访问(需要配置)

- 需要在路由器配置端口转发
- 建议使用 Nginx Proxy Manager 配置 HTTPS
- 或使用云服务器部署

---

## ✅ 验证部署

### 1. 检查容器状态
```powershell
docker ps
```
应该看到 `lotus-web` 状态为 `Up`

### 2. 测试服务响应
```powershell
curl http://localhost -UseBasicParsing
```
应该返回 HTTP 200 状态码

### 3. 浏览器访问
打开 http://localhost,应该能看到应用界面

---

## 🐛 故障排除

### 问题1: 导入镜像失败

**错误**: `Error response from daemon: archive/tar: invalid tar header`

**解决方法**:
- 检查 tar 文件是否完整下载
- 重新下载镜像文件
- 确认文件大小为 20MB

---

### 问题2: 容器启动后无法访问

**症状**: 浏览器显示"无法访问此网站"

**排查步骤**:
```powershell
# 1. 检查容器是否运行
docker ps -a | Select-String "lotus"

# 2. 查看容器日志
docker logs lotus-web

# 3. 检查端口占用
netstat -ano | findstr ":80"
```

**解决方法**:
- 如果端口被占用,使用 `-p 8080:80` 改用其他端口
- 检查防火墙是否阻止访问

---

### 问题3: 页面加载但功能异常

**症状**: 页面显示但无法登录或调用 API 失败

**原因**: 这是正常现象!本镜像仅包含前端应用,后端服务依赖 Supabase 云服务。

**完整功能需要**:
1. Supabase 账号和项目配置
2. 环境变量正确配置(在构建镜像时已注入)
3. 网络能访问 Supabase 服务

如需重新配置后端连接,请参考完整部署文档。

---

## 📊 资源占用

- **镜像大小**: 76.4MB (解压后)
- **运行内存**: ~50MB
- **CPU**: 极低(Nginx 静态服务)
- **磁盘 I/O**: 极低

---

## 🔄 更新应用

如果有新版本镜像:

```powershell
# 1. 停止并删除旧容器
docker stop lotus-web
docker rm lotus-web

# 2. 删除旧镜像(可选)
docker rmi lotus-ai-travel-planner:latest

# 3. 导入新镜像
docker load -i lotus-ai-travel-planner-v2.0.0.tar

# 4. 启动新容器
docker run -d --name lotus-web -p 80:80 --restart unless-stopped lotus-ai-travel-planner:latest
```

---

## 📞 技术支持

- **GitHub**: https://github.com/JXTZZ/ai-travel-planner
- **文档**: 查看项目 `docs/` 目录
- **Issues**: 提交问题到 GitHub Issues

---

## 🎯 快速命令参考卡

| 操作 | 命令 |
|------|------|
| 导入镜像 | `docker load -i lotus-ai-travel-planner-v1.0.0.tar` |
| 启动容器 | `docker run -d --name lotus-web -p 80:80 --restart unless-stopped lotus-ai-travel-planner:latest` |
| 查看状态 | `docker ps` |
| 查看日志 | `docker logs -f lotus-web` |
| 停止容器 | `docker stop lotus-web` |
| 启动容器 | `docker start lotus-web` |
| 重启容器 | `docker restart lotus-web` |
| 删除容器 | `docker rm -f lotus-web` |
| 访问应用 | http://localhost |

---

**部署愉快! 🚀**
