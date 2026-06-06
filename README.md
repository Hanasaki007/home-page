# 清新新标签页

一款 Chrome 浏览器扩展，替换默认新标签页，提供简洁大方的毛玻璃（Glassmorphism）风格界面。

## 功能特性

- **实时时钟与问候语** — 显示当前时间、日期与个性化问候
- **多引擎搜索** — 支持必应、百度、谷歌、DuckDuckGo、搜狗，可随时切换
- **快捷网址管理** — 支持添加、编辑、删除、拖拽排序，带彩色首字母图标
- **自定义背景** — 上传本地图片作为背景，支持恢复默认渐变背景
- **待办事项** — 侧边栏 Todo 面板，支持勾选完成与删除
- **五子棋小游戏** — 内置人机对弈，支持悔棋与计分
- **书签导入/导出** — 一键导出为 JSON 文件，方便备份与迁移
- **高性能模式** — 关闭毛玻璃模糊与动画，适配低性能设备
- **数据持久化** — 通过 `chrome.storage` API 保存所有用户数据

## 项目结构

```
home-page/
├── manifest.json          # 扩展配置（Manifest V3）
├── newtab.html            # 新标签页主页面
├── css/
│   └── style.css          # 样式（毛玻璃风格）
├── js/
│   └── script.js          # 全部交互逻辑
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 安装与使用

1. 打开 Chrome 浏览器，进入 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目文件夹
5. 打开新标签页即可使用

## 技术栈

- HTML / CSS / JavaScript
- Manifest V3
- Canvas API
- `chrome.storage` API + `localStorage` 回退