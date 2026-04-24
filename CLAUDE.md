# Scholars — Exclusive Dating App for Oxford University

## 项目概述

**Scholars** 是一款专为牛津大学（Oxford University）学生打造的高端交友/匹配应用。只有持有牛津大学邮箱（`@ox.ac.uk` / `@oxford.ac.uk`）的用户才能注册，定位于"私人会员俱乐部"式体验，而非普通的游戏化交友 App。

---

## 视觉风格

- **主题**：Dark Academia / 珠宝奢华（Jewel & Luxury）
- **配色**：深海军蓝背景 `#060A11`，金色主色调 `#D4AF37`，牛津红点缀 `#8A1538`
- **字体**：标题用 `Cormorant Garamond`（衬线，古典感），正文用 `Outfit`（现代无衬线）
- **动效**：Framer Motion 驱动的滑动卡片、Venn 图式匹配动画、页面淡入过渡
- **布局**：移动优先，固定底部导航栏，Profile 卡片全屏沉浸式 3:4 比例

---

## 技术栈

### 前端

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + React Router 7 |
| 样式 | Tailwind CSS 3 + Shadcn/ui（深度定制） |
| 动效 | Framer Motion 12 |
| 表单 | React Hook Form + Zod 验证 |
| HTTP | Axios |
| 图标 | Lucide React（stroke-width 1.5） |
| 构建 | Create React App + Craco |

**页面结构（`frontend/src/pages/`）：**

```
Login.js        — 登录，牛津建筑背景图，邮箱限制提示
Register.js     — 注册，仅接受 ox.ac.uk 邮箱
Onboarding.js   — 注册后完善 Profile（学院、专业、年级、兴趣等）
Discover.js     — 核心滑动页：全屏 Profile 卡片，左划 Pass / 右划 Like
Matches.js      — 已匹配列表，展示对方头像、姓名、最后一条消息
Chat.js         — 聊天界面，含 AI Icebreaker 生成按钮
Events.js       — 牛津校园活动浏览 & 报名
Profile.js      — 个人资料编辑 & 照片上传
```

**组件结构（`frontend/src/components/`）：**

- `BottomNav.js`：固定底部导航（Discover / Matches / Events / Profile）
- `ui/`：48 个 Shadcn UI 基础组件（Button、Dialog、Form、Select 等，均按深色奢华主题覆盖样式）

---

### 后端

| 层级 | 技术 |
|------|------|
| 框架 | FastAPI（Python 异步）|
| 数据库 | MongoDB（Motor 异步驱动）|
| 认证 | JWT（Access Token 15min + Refresh Token 7天，HttpOnly Cookie）|
| 密码 | bcrypt 哈希 |
| 文件存储 | Emergent Object Storage（类 S3）|
| AI | LiteLLM → Claude Sonnet（claude-sonnet-4-5）|
| 服务器 | Uvicorn ASGI |

**API 路由（均挂载在 `/api` 前缀下）：**

```
认证
  POST   /auth/register       — 注册（限牛津邮箱）
  POST   /auth/login          — 登录（含暴力破解防护：5次错误锁定15分钟）
  POST   /auth/logout         — 登出（清除 Cookie）
  GET    /auth/me             — 获取当前用户信息
  POST   /auth/refresh        — 刷新 Access Token

个人资料
  PUT    /profile             — 更新资料（学院+专业填写完毕则 profile_complete=true）
  GET    /profile/{user_id}   — 获取指定用户资料
  POST   /upload/photo        — 上传头像/照片
  GET    /files/{path}        — 获取存储文件

发现 & 匹配
  GET    /discover            — 获取推荐用户列表（过滤：学院/专业/年级/gender preference，排除已划过的）
  POST   /swipe               — 滑动操作（like/pass），双向 like 则自动创建 match

匹配 & 聊天
  GET    /matches             — 获取所有匹配，附带最后一条消息
  GET    /messages/{match_id} — 获取某对话的消息列表
  POST   /messages            — 发送消息

AI 功能
  POST   /ai/icebreaker       — 根据对方 Profile（学院/专业/兴趣/Bio）用 Claude 生成 3 条开场白

活动
  GET    /events              — 获取即将举行的校园活动（可按学院过滤）
  POST   /events              — 创建活动
  POST   /events/{id}/attend  — 报名/取消报名活动

元数据
  GET    /colleges            — 返回 39 所牛津学院列表
  GET    /majors              — 返回 27 个专业列表
```

---

## 核心业务流程

```
注册(牛津邮箱) → Onboarding(完善资料) → Discover(滑卡) → 匹配成功
     ↓                                                          ↓
  设置性别偏好                                        Chat(消息 + AI Icebreaker)
                                                               ↓
                                                      Events(一起参加校园活动)
```

---

## 数据模型（MongoDB Collections）

| Collection | 说明 |
|---|---|
| `users` | 用户账号 + Profile，`profile_complete` 标记资料是否完整 |
| `swipes` | 滑动记录（user_id, target_id, action: like/pass）|
| `matches` | 互相 like 后生成的匹配记录（user1_id, user2_id）|
| `messages` | 聊天消息（match_id, sender_id, content）|
| `events` | 校园活动（title, date, location, college, attendees[]）|
| `files` | 上传文件元数据（storage_path, content_type）|
| `login_attempts` | 暴力破解防护记录 |

---

## 特色功能

### AI Icebreaker
点击聊天页的"Generate Icebreaker"按钮，后端调用 **Claude Sonnet** 模型，结合对方的学院、专业、兴趣和 Bio，生成 3 条个性化、智识风格的开场白，前端用打字机动画展示。

### 匹配动画
当双向 like 触发 match 时，背景变暗，两个圆形头像像维恩图一样相向滑动交叠，发出金色光晕。

### 学院筛选
Discover、Events 页均支持按牛津学院筛选，强化学院归属感。

---

## 开发/测试数据

启动时自动 seed 以下演示账号：

| 邮箱 | 密码 | 角色 |
|------|------|------|
| `admin@ox.ac.uk` | `admin123` | Admin |
| `emma@ox.ac.uk` | `demo123` | PPE @ Balliol |
| `james@ox.ac.uk` | `demo123` | Physics @ Magdalen |
| `sophia@ox.ac.uk` | `demo123` | History of Art @ Christ Church |
| `oliver@ox.ac.uk` | `demo123` | Medicine @ Exeter |
