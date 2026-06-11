# AGENTS.md

## Project Overview
Chrome browser extension replacing default new tab with glassmorphism UI. Manifest V3, pure frontend, no build system.

## Key Files
- `manifest.json` — Extension config, permissions, icons
- `newtab.html` — Single page with all UI
- `css/style.css` — Themes, glass effects, responsive design
- `js/script.js` — All logic (~1585 lines, single IIFE)

## Development Workflow
- **No build step**: Edit files directly, no npm/bundler
- **Install**: Chrome → `chrome://extensions/` → Developer mode → Load unpacked → Select project folder
- **Reload**: Click refresh icon in extensions page after changes
- **Debug**: Right-click extension icon → Inspect popup/background

## Architecture Notes
- Single IIFE pattern in script.js — no global variables
- `chrome.storage` API with localStorage fallback for development
- Theme system via CSS custom properties (6 themes: starry, ocean, sunset, forest, aurora, warm)
- High-performance mode disables glass effects via CSS class toggle
- Games (Gomoku, Snake) use Canvas API
- Bookmarks support drag-and-drop sorting

## Conventions
- Chinese UI text (simplified Chinese)
- All functionality in one JavaScript file — don't split unless explicitly asked
- No tests, linting, or formatting configured
- Data persistence via `chrome.storage.local`

## Gotchas
- Extension must be loaded as unpacked for development
- `chrome.storage` requires extension context — use localStorage fallback for testing in browser
- No hot reload — manual refresh required after code changes
- Single HTML page contains all modals and panels — be careful with DOM IDs