# QWEN.md — 项目指令上下文

## 项目概述

Chrome 浏览器扩展（Manifest V3），替换默认新标签页，提供毛玻璃（glassmorphism）风格界面。纯前端实现，无构建系统，无外部依赖。

## 技术栈

- **HTML/CSS/JS** — 纯原生实现，无框架
- **Chrome Extension Manifest V3** — 使用 `chrome_url_overrides` 覆盖新标签页
- **Chrome Storage API** — 数据持久化，带 localStorage fallback

## 目录结构

```
├── .gitignore             # Git 忽略规则
├── manifest.json          # 扩展配置、权限、图标
├── newtab.html            # 主页面（单页应用）
├── css/style.css          # 样式（主题系统、毛玻璃、响应式）
├── js/script.js           # 全部逻辑（~1591行，单 IIFE）
├── icons/                 # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # 项目说明文档
└── QWEN.md                # 本文件
```

## 架构要点

### 单文件模式

所有 JavaScript 逻辑封装在 `js/script.js` 的单一 IIFE 中，无全局变量。HTML 页面包含所有 UI 组件（模态框、侧边栏、游戏面板）。

### 功能模块（均在 script.js 内）

| 模块 | 说明 |
|------|------|
| 时钟系统 | 实时时钟、问候语、日期显示 |
| 搜索引擎 | 5 个引擎（必应/百度/谷歌/DuckDuckGo/搜狗），可切换 |
| 书签管理 | 快捷网址 CRUD + 拖拽排序，彩色首字母图标 |
| 主题系统 | 6 套渐变主题，通过 CSS `data-theme` 属性切换 |
| 背景管理 | 自定义背景图片上传（Canvas 压缩）+ 恢复默认 |
| 待办事项 | 侧边栏 Todo 面板，支持完成/删除 |
| 五子棋 | Canvas 渲染，人机对弈，悔棋 + 计分 |
| 贪吃蛇 | Canvas 渲染，方向键操控，最高分记录 |
| 数据导入导出 | 书签 JSON 导出/导入 |

### 存储方案

```javascript
// chrome.storage.local 优先，localStorage 降级（开发调试用）
const storageGet = (keys) => { ... }
const storageSet = (data) => { ... }
```

### 主题系统

6 套主题通过 CSS 变量和 `data-theme` 属性实现：
- 默认（星空紫）、`ocean`（海洋蓝）、`sunset`（日落橙）
- `forest`（森林绿）、`aurora`（极光）、`warm`（暖阳）

### 高性能模式

通过 `body` 的 `.high-performance` CSS 类切换，禁用毛玻璃效果（`backdrop-filter`）和动画，适配低性能设备。

### 设计模式

- **单一职责** — 每个功能模块有独立的函数组
- **异步存储** — 使用 Promise 封装 `chrome.storage` 操作
- **事件驱动** — 所有交互通过事件监听器处理
- **状态管理** — 每个模块维护自己的状态变量

### 关键技术

| 技术 | 用途 |
|------|------|
| CSS 自定义属性 | 主题颜色和毛玻璃效果管理 |
| Canvas API | 游戏图形渲染（五子棋、贪吃蛇） |
| 拖放 API | 书签拖拽排序 |
| 文件 API | 背景图片上传和压缩 |
| 键盘事件 | 游戏控制 |

### 响应式设计

页面适配移动端，使用 `clamp()` 实现响应式字号，搜索框和书签网格自动调整布局。

## 开发工作流

### 安装与调试

1. Chrome 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」→ 选择项目文件夹
4. 修改代码后，在扩展管理页面点击刷新按钮

### 开发注意事项

- **无热重载** — 代码修改后需手动刷新扩展
- **直接编辑文件** — 无需构建步骤
- **所有 UI 文本为简体中文**
- **单 IIFE 模式** — 新功能添加在现有 IIFE 内，避免引入全局变量
- **不要拆分 JS 文件** — 所有功能保留在单个 script.js 中，除非明确要求拆分
- **DOM ID 唯一性** — 页面包含大量模态框和面板，注意 ID 不要冲突
- **`chrome.storage` 依赖扩展上下文** — 浏览器直接打开 HTML 时使用 localStorage fallback

## 编码规范

### JavaScript

- 使用 `const $ = (sel) => document.querySelector(sel)` 作为选择器快捷方式
- 异步操作使用 `async/await`
- 事件监听通过 `addEventListener` 绑定，事件委托用于动态元素
- 状态变量在 IIFE 内声明，模块间通过函数传递

### CSS

- CSS 自定义属性（`--glass-bg`、`--radius`、`--transition`）统一管理样式
- `clamp()` 实现响应式字号
- 毛玻璃效果统一使用 `.glass` 类
- 动画使用 `cubic-bezier` 缓动函数

### 命名约定

- HTML：`id` 使用 kebab-case（如 `bg-change-btn`、`search-input`）
- JS 变量：camelCase（如 `currentEngineId`、`bgImage`）
- CSS 类：kebab-case（如 `game-modal`、`bookmark-card`）
- 游戏常量：全大写（如 `SNAKE_CELL`、`SNAKE_DIR`）

## 权限

```json
{
  "permissions": ["storage", "unlimitedStorage"]
}
```

## 测试

无自动化测试。手动测试流程：
1. 加载扩展到 Chrome
2. 打开新标签页验证功能
3. 调试：右键扩展图标 → 检查弹出内容

## 常见修改场景

| 场景 | 修改位置 |
|------|----------|
| 添加新主题 | CSS 中添加 `[data-theme="xxx"]`，JS 的 `THEMES` 数组添加条目 |
| 添加新搜索引擎 | JS 的 `SEARCH_ENGINES` 数组 |
| 添加新书签预设 | JS 的 `DEFAULT_BOOKMARKS` 数组 |
| 修改 UI 文本 | `newtab.html` + `js/script.js` 中的中文字符串 |
| 调整毛玻璃效果 | CSS 变量 `--glass-bg`、`--glass-blur` |
| 修改游戏逻辑 | `js/script.js` 中对应游戏模块函数组 |
