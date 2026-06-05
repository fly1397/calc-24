# 绝对算式 24 点 H5 小游戏

一个优先适配手机 H5 的 24 点小游戏，包含 React 前端、Express 后端、共享 24 点规则引擎、程序化关卡系统、动态难度推荐和本地 JSON 数据存储。

## 已实现功能

- 标准 24 点单局玩法：4 张牌、`+ - × ÷`、撤销、重来、分数/负数中间值。
- 主线闯关：14 个阶段、每阶段 20 关，共 280 关。
- 阶段体系：入门班、小学生、拆数班、除法班、分数班、反向构造、多解法馆、速度考场、分母迷宫、唯一解区、研究生、博士生、炼狱一层、数学之神。
- Boss / 结业关：每阶段第 20 关使用独立规则限制。
- 每日一题：按 UTC 日期固定选题。
- Seed 挑战：每题有固定 Seed，可复制挑战文案。
- 提示系统：方向、关键值、首步、完整答案。
- 解法判重：表达式树规范化，交换律/结合律去重。
- 多解法收集：提交后返回是否为新解法和已发现数量。
- 残局诊所：长时间卡住后可收进本地复仇列表。
- 智能训练：根据最近用时、提示、重置、连胜/卡题情况动态推荐难度。
- AI 导师：基于局内状态、难度和规则给出实时策略文案。
- 异构实验室：集中挑战禁用除法、乘法收官、除法收官、整数路线、不许负数等规则关。
- 异构实验室玩法集合：毒苹果残局、大满贯挑战、拼接实验、特殊牌实验、高阶符号实验。
- 每周实验室关卡包：已开放玩法每周按 Seed 生成 20 关，进入后使用和主线一致的关卡网格。
- 动态出题引擎：支持按目标值、牌数、使用牌数、数字范围、运算符、DS 难度、解法数量、标签和 Seed 生成题目。
- 解法档案：展示每题已发现解法数量和图鉴进度。
- 轻量排行榜：按题目读取本地提交记录。
- 后端静态托管：`npm run build && npm start` 可用 Express 提供前端与 API。

## 启动

```bash
npm install
npm run dev
```

开发服务：

- 前端 H5：`http://localhost:5173`
- 后端 API：`http://localhost:8787`

生产预览：

```bash
npm run build
npm start
```

然后访问：

```text
http://localhost:8787
```

## 验证

```bash
npm run check
npm run build
```

## 目录

```text
src/       H5 前端
server/    Express API 与本地存储
shared/    24 点规则、题库、求解器、提示和评分
data/      运行后生成的本地数据
```

## 主要 API

- `GET /api/puzzles`
- `GET /api/puzzles/:id`
- `GET /api/daily`
- `GET /api/seed/:seed`
- `POST /api/training/next`
- `POST /api/coach`
- `POST /api/generate`
- `POST /api/attempts`
- `GET /api/attempts/:puzzleId`
- `GET /api/leaderboard/:puzzleId`
- `GET /api/stats`
