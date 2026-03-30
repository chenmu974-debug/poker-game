# 🃏 Texas Hold'em Poker — 多人在线德州扑克

支持 2~8 人实时联机的德州扑克网页游戏。所有游戏逻辑在服务端执行。

## 快速启动

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 启动开发服务器（前后端同时启动）
npm run dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3001

## 局域网多人测试

在局域网中测试时，将 `localhost` 替换为本机 IP 地址：

1. 查看本机 IP（Windows: `ipconfig`，Mac/Linux: `ifconfig`）
2. 在客户端创建 `.env` 文件：
   ```
   VITE_SERVER_URL=http://192.168.x.x:3001
   ```
3. 其他玩家访问 `http://192.168.x.x:5173`

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite |
| 实时通信 | Socket.IO |
| 后端 | Node.js + Express |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |

## 功能特性

- ✅ 完整德州扑克规则（Pre-flop → Flop → Turn → River → Showdown）
- ✅ 7 张牌最优 5 张牌型判定（皇家同花顺 → 高牌）
- ✅ Fold / Check / Call / Raise / All-In
- ✅ 边池（Side Pot）计算
- ✅ 30 秒操作倒计时，超时自动操作
- ✅ 断线重连（60 秒内保留座位）
- ✅ 观战模式
- ✅ Web Audio API 音效
- ✅ 金色粒子赢家动画
- ✅ 深色赌场主题 UI
