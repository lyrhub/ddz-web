# 🃏 斗地主 Web 客户端

基于 WebSocket + Protobuf 的斗地主网页版客户端，连接 [fight-the-landlord](https://github.com/palemoky/fight-the-landlord) Go 后端服务器。

## 功能

- 🎮 完整的斗地主游戏流程（叫地主/抢地主/出牌/不出）
- 🌐 WebSocket 实时通信，Protobuf 二进制协议
- 📱 响应式设计，支持手机和桌面
- 🔄 断线重连支持
- 👥 多人联网对战（快速匹配/创建房间/加入房间）
- 🤖 支持 DouZero AI 机器人对战

## 使用方法

### 1. 启动后端服务器

参考 [fight-the-landlord](https://github.com/palemoky/fight-the-landlord) 部署服务端：

```bash
# Docker 方式
docker compose up -d

# 或本地开发
redis-server &
go run ./cmd/server
```

### 2. 打开网页客户端

直接用浏览器打开 `public/index.html`，或部署到任意静态服务器。

在页面中输入服务器 WebSocket 地址（如 `ws://your-server:9999/ws`）和昵称，点击连接即可。

### 3. 部署到 GitHub Pages

本仓库已配置 GitHub Pages，访问：

```
https://lyrhub.github.io/ddz-web/
```

## 技术栈

- 纯 HTML/CSS/JavaScript，无框架依赖
- [protobuf.js](https://github.com/protobufjs/protobuf.js) — Protobuf 编解码
- WebSocket — 实时通信
- 后端：Go + Redis + DouZero AI

## 协议

通信协议与 Go 服务端完全兼容：

- 消息格式：`Message { type: MessageType, payload: bytes }`
- 编码：Protocol Buffers 3
- 传输：WebSocket Binary Frame

## 项目结构

```
public/
├── index.html      # 主页面
├── css/
│   └── style.css   # 样式
└── js/
    ├── proto.js    # Protobuf 协议定义与编解码
    └── game.js     # 游戏逻辑与 UI
```

## License

GPL-3.0 (与原项目一致)
