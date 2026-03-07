# Agent 模块改动说明

> 分支: `hanson`  
> 日期: 2026-03-07  
> 作者: Hanson

## 新增文件

### `src/sim/pathfinding.ts` — A* 路径寻找算法
- 基于路网图做 A* 寻路
- 火势动态代价：靠近火的路代价高，强度 ≥ 3 直接封路
- 支持路障（blockedEdges）
- Haversine 距离计算
- `findNearestNode()` / `findNearestSafePoint()` 辅助函数

### `src/sim/agentEngine.ts` — Agent 引擎
- 居民状态机：idle → moving → safe / dead
- **居民只在引导员范围（150米）内才会移动**，不在范围内原地不动
- 引导员跟随：60% 概率跟随附近引导员
- 每 8 tick 重新算路径（因为火在变化）
- 火焰碰撞检测（intensity ≥ 2 且距离 < 50米 → 死亡）
- 安全点到达检测（距离 < 30米 → 安全）

### `src/sim/guideAgent.ts` — Backboard AI 引导员大脑
- 自动创建 Backboard Assistant（系统提示 + 工具定义）
- 每个引导员一个 Thread
- 每 10 tick 把火势/居民状态发给 AI
- AI 通过 Tool Call 返回 `{ safe_point_id, reason }`
- **已测试通过**：AI 返回了 "引导居民去 s2，因为更近且路线安全"
- 无 API key 时自动降级为走最近安全点

### `src/ui/EvacuationDialog.tsx` — 撤离确认弹窗
- Glassmorphism 风格对话框
- "开始撤离" / "取消" 按钮

## 修改文件

### `src/app/types.ts`
- Agent 类型新增: `status`, `speed`, `path`, `pathIndex`, `followingGuideId`, `reactionDelay` 等
- 新增: `AgentStatus` 类型, `GuideDecision` 类型

### `src/app/api.ts`
- Backboard API key + Base URL 配置（从 `.env.local` 读取）

### `src/map/layers/agents.ts`
- 引导员影响范围可视化：半透明绿色圆 + 脉冲环动画
- 居民状态颜色：dead=灰, safe=绿, 跟随引导员=绿边框
- 单击/双击交互支持

### `src/map/MapView.tsx`
- 新增 `onMapClick` 回调 prop

### `src/App.tsx`
- tick 循环集成 (火势 → Agent → AI)
- 统计面板 (Tick, 火势, 居民状态, 撤离率)
- Start / Pause / Reset
- 引导员放置交互 (选中 → 点地图 → 移动)
- 修复 n4 节点缺失 bug

### `src/index.css`
- fadeIn 动画

### `.env.local` (不提交)
- `VITE_MAPBOX_TOKEN` + `VITE_BACKBOARD_API_KEY`

## Backboard AI 接入说明

系统提示（中文）告诉 AI 它是山火疏散引导员，要：
1. 观察火势
2. 了解居民位置
3. 调用 `direct_residents_to_safe_point(safe_point_id, reason)` 工具做决策

AI 模型: GPT-4o（Backboard 后端分配），每次调用约 800 tokens。

## 下一步

- [ ] 把引导员交互改成侧边栏控制面板（RTS 风格）
- [ ] 等队友路网数据合并
- [ ] 等队友风速/风向火势逻辑合并
