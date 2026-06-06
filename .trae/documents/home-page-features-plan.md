# 起始页插件四大功能实施计划

## 总览

为浏览器起始页插件新增 4 个功能模块，涉及 3 个文件的修改：`newtab.html`、`js/script.js`、`css/style.css`。遵循项目现有 IIFE 封装、`$()` 选择器、`hidden` 类切换、`storageGet/storageSet` 持久化等模式。

---

## 功能一：时段问候语

### 目标
在时钟上方显示根据当前时间变化的问候语，给页面增加温度感。

### 实现方案

**HTML 变更**（[newtab.html](file:///c:/MyAPP/Documents/home-page/newtab.html)）：
- 在 `.clock-section` 内、`#time-display` 上方新增 `<div id="greeting-display" class="greeting"></div>`

**JS 变更**（[script.js](file:///c:/MyAPP/Documents/home-page/js/script.js)）：
- 在 Clock 模块新增 `getGreeting()` 函数，根据当前小时返回问候文本：

  | 时段 | 问候语 |
  |------|--------|
  | 00:00–05:59 | 夜深了，注意休息 |
  | 06:00–08:59 | 早上好 |
  | 09:00–11:59 | 上午好 |
  | 12:00–13:59 | 中午好 |
  | 14:00–17:59 | 下午好 |
  | 18:00–22:59 | 晚上好 |
  | 23:00–23:59 | 夜深了，注意休息 |

- 在 `updateClock()` 末尾调用 `$('#greeting-display').textContent = getGreeting()`
- 问候语随每分钟更新自动变化（`setInterval(updateClock, 60000)` 即可，不再需要秒级刷新）

**CSS 变更**（[style.css](file:///c:/MyAPP/Documents/home-page/css/style.css)）：
- `.greeting`：`font-size: clamp(16px, 2.5vw, 22px)`、`color: var(--text-secondary)`、`font-weight: 300`、`margin-bottom: 8px`、`letter-spacing: 1px`

### 存储
无（纯前端计算，不需要持久化）

---

## 功能二：书签编辑 + 拖拽排序

### 目标
支持编辑已有书签的名称和 URL，并通过拖拽调整书签顺序。

### 2A：书签编辑

**HTML 变更**：
- 复用现有 `#modal-overlay` 弹窗，修改标题动态化：
  - 新增 `<h3 id="modal-title">添加快捷网址</h3>`（将原硬编码文字改为动态 ID）
  - 弹窗内新增隐藏字段 `<input type="hidden" id="bm-edit-id">` 用于标识编辑目标

**JS 变更**：
- 新增状态变量 `let editingBookmarkId = null;`
- 修改 `openModal()` → 接受可选参数 `openModal(bookmark?)`：
  - 无参调用：编辑模式，清空输入框，标题设为"添加快捷网址"，`editingBookmarkId = null`
  - 传入书签对象：编辑模式，预填输入框，标题设为"编辑快捷网址"，`editingBookmarkId = bookmark.id`
- 修改 `#modal-confirm` 的点击逻辑：
  - 若 `editingBookmarkId` 为 null → 现有添加逻辑
  - 若 `editingBookmarkId` 有值 → 找到对应书签并更新 title/url，重新渲染
- 修改 `renderBookmarks()`：
  - 在每个书签卡片的删除按钮旁，新增编辑按钮 `.bookmark-edit`（SVG 铅笔图标）
  - 编辑按钮同样 hover 时才显示
  - 编辑按钮点击：`e.preventDefault(); e.stopPropagation(); openModal(bm);`
- 点击书签卡片本身改为直接跳转 URL（移除当前的 `e.preventDefault()` + `window.location.href` 模式，改回 `<a>` 标签默认行为）

**CSS 变更**：
- `.bookmark-edit`：样式同 `.bookmark-delete`（绝对定位右上角、hover 显示、圆角按钮），左偏移一点避免与删除按钮重叠
- 两个按钮并排时用 `gap: 2px` 的 flex 容器包裹

### 2B：拖拽排序

**JS 变更**：
- 在 `renderBookmarks()` 中为每个书签卡片添加 `draggable="true"`
- 新增拖拽状态变量 `let draggedId = null;`
- 绑定拖拽事件（事件委托绑定到 `#bookmarks-grid`）：
  - `dragstart`：记录 `draggedId`，给当前卡片添加 `.dragging` 类（半透明效果）
  - `dragover`：`e.preventDefault()` 允许放置，计算插入位置（鼠标在目标卡片左半还是右半），显示插入指示线
  - `dragleave`：移除插入指示线
  - `drop`：根据拖拽前后位置重排 `bookmarks` 数组，调用 `renderBookmarks()` + `storageSet({ bookmarks })`
  - `dragend`：清理拖拽状态和视觉效果
- 插入位置计算逻辑：获取目标卡片的 `getBoundingClientRect()`，鼠标 X 坐标 < 卡片中心则插入到前面，否则插入到后面

**CSS 变更**：
- `.bookmark-card.dragging`：`opacity: 0.4; transform: scale(0.95);`
- `.bookmark-card.drag-over-left`：`border-left: 2px solid rgba(255,255,255,0.6);`
- `.bookmark-card.drag-over-right`：`border-right: 2px solid rgba(255,255,255,0.6);`
- 拖拽占位符的视觉指示用 `box-shadow` 或 `border` 实现

### 存储
- 编辑后立即调用 `storageSet({ bookmarks })`
- 拖拽排序后立即调用 `storageSet({ bookmarks })`

---

## 功能三：书签导入/导出

### 目标
通过右上角齿轮设置菜单，支持将书签导出为 JSON 文件和从 JSON 文件导入。

### 实现方案

**HTML 变更**（[newtab.html](file:///c:/MyAPP/Documents/home-page/newtab.html)）：
- 在 `.top-bar` 中新增齿轮按钮（SVG 齿轮图标），ID 为 `#settings-btn`
- 在 `.top-bar` 同级新增设置下拉菜单 `<div id="settings-dropdown" class="settings-dropdown glass hidden">`：
  - 包含两个菜单项：`导出书签`（`data-action="export"`）和 `导入书签`（`data-action="import"`）
- 新增隐藏 `<input type="file" id="import-file-input" accept=".json" hidden>`

**JS 变更**：
- 设置按钮点击：切换 `#settings-dropdown` 显隐（同搜索引擎下拉的模式）
- `document` 点击：关闭设置下拉菜单
- 导出逻辑：
  - `const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' })`
  - 创建临时 `<a>` 元素，设置 `href = URL.createObjectURL(blob)`，`download = 'bookmarks.json'`，触发点击，释放 URL
- 导入逻辑：
  - 触发 `#import-file-input` 的 click
  - `change` 事件中读取文件：`FileReader.readAsText()`
  - 解析 JSON，校验结构（数组且每项有 id/title/url），若无效则提示
  - 用导入数据替换当前 `bookmarks`，调用 `renderBookmarks()` + `storageSet({ bookmarks })`

**CSS 变更**：
- `.settings-dropdown`：样式同 `.engine-dropdown`，`position: fixed`，定位在齿轮按钮下方
- 设置菜单项样式同 `.engine-dropdown-item`

### 存储
- 导出：读取当前 `bookmarks` 状态
- 导入：`storageSet({ bookmarks })` 保存导入结果

---

## 功能四：待办事项（Todo）右侧面板

### 目标
页面右侧可展开/收起的毛玻璃面板，支持添加、完成、删除待办事项。

### 实现方案

**HTML 变更**（[newtab.html](file:///c:/MyAPP/Documents/home-page/newtab.html)）：
- 在 `.top-bar` 中新增待办按钮（SVG 清单图标），ID 为 `#todo-btn`
- 在 `</body>` 前新增待办面板：
  ```html
  <div id="todo-panel" class="todo-panel glass hidden">
    <div class="todo-panel-header">
      <h3>待办事项</h3>
      <button id="todo-close" class="todo-close">&times;</button>
    </div>
    <div class="todo-input-row">
      <input type="text" id="todo-input" placeholder="添加新待办..." autocomplete="off">
      <button id="todo-add-btn">+</button>
    </div>
    <div id="todo-list" class="todo-list"></div>
  </div>
  ```

**JS 变更**：
- 新增状态变量 `let todos = [];`（数组元素：`{ id, text, completed }`）
- `renderTodos()`：遍历 `todos` 渲染待办列表
  - 每项结构：`<div class="todo-item">` 包含 checkbox、文本、删除按钮
  - checkbox 变更 → 切换 `completed` 状态 + `storageSet({ todos })`
  - 删除按钮 → 移除项 + `storageSet({ todos })`
  - 已完成项添加 `.completed` 类（文字划线 + 降低透明度）
- `#todo-add-btn` 点击 / `#todo-input` Enter 键：
  - 读取输入值，非空则 `todos.push({ id: generateId(), text, completed: false })`
  - 清空输入框、重新渲染、持久化
- `#todo-btn` 点击：切换 `#todo-panel` 的 `hidden` 类
- `#todo-close` 点击：隐藏面板
- `init()` 中：`storageGet(['todos'])` 加载待办数据

**CSS 变更**：
- `.todo-panel`：`position: fixed; right: 0; top: 0; height: 100vh; width: 320px;`，从右侧滑入动画
  - `transform: translateX(100%)` → `translateX(0)` 过渡
  - `z-index: 500`，确保在所有内容之上
  - 内部 flex 布局，`padding: 24px`，`overflow-y: auto`
- `.todo-panel.hidden`：`transform: translateX(100%); pointer-events: none;`（用 transform + pointer-events 而非 display:none 实现平滑滑入动画）
- `.todo-panel-header`：flex 布局，标题 + 关闭按钮
- `.todo-close`：同 `.modal-btn` 风格的关闭按钮
- `.todo-input-row`：flex 布局，输入框 + 添加按钮
- `.todo-list`：`flex: 1; overflow-y: auto;`
- `.todo-item`：flex 布局，checkbox + 文本 + 删除按钮，`padding: 10px 0`，`border-bottom: 1px solid rgba(255,255,255,0.1)`
- `.todo-item.completed .todo-text`：`text-decoration: line-through; opacity: 0.5;`
- `.todo-delete`：hover 显示的删除按钮，同 `.bookmark-delete` 风格

### 存储
- 键名：`todos`
- 数据结构：`Array<{ id: string, text: string, completed: boolean }>`
- 每次增删改后立即 `storageSet({ todos })`

---

## 全局变更

### init() 函数更新
```javascript
const data = await storageGet(['bookmarks', 'backgroundImage', 'searchEngine', 'todos']);
// ... 现有逻辑 ...
todos = data.todos || [];
renderTodos();
```

### updateClock() 优化
- `setInterval` 从 1000ms 改为 60000ms（每分钟更新一次，不再需要秒级刷新，因为秒数已移除）

### manifest.json
- 无需修改，现有 `storage` 和 `unlimitedStorage` 权限已足够

---

## 实施顺序

| 步骤 | 内容 | 涉及文件 |
|------|------|----------|
| 1 | 时段问候语 | newtab.html, script.js, style.css |
| 2 | 书签编辑 | newtab.html, script.js, style.css |
| 3 | 书签拖拽排序 | script.js, style.css |
| 4 | 书签导入/导出 | newtab.html, script.js, style.css |
| 5 | 待办事项面板 | newtab.html, script.js, style.css |
| 6 | 全局 init() 和定时器优化 | script.js |

---

## 验证步骤

1. **问候语**：打开新标签页，确认问候文本与当前时间匹配；手动修改系统时间测试各时段切换
2. **书签编辑**：悬停书签显示编辑图标 → 点击弹出预填弹窗 → 修改保存 → 刷新页面确认持久化
3. **拖拽排序**：拖拽书签卡片调整顺序 → 刷新页面确认顺序保持
4. **导入/导出**：导出 → 确认下载 JSON 文件内容正确；导入 → 选择 JSON 文件确认书签替换
5. **待办事项**：添加/完成/删除待办 → 刷新页面确认持久化；面板滑入/滑出动画流畅
6. **兼容性**：所有功能在 `localStorage` 降级模式下也正常工作（非扩展环境）
