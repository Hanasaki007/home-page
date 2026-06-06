(function () {
  const $ = (sel) => document.querySelector(sel);

  const DEFAULT_BOOKMARKS = [
    { id: 'b1', title: '必应', url: 'https://www.bing.com' },
    { id: 'b2', title: 'GitHub', url: 'https://github.com' },
    { id: 'b3', title: '知乎', url: 'https://www.zhihu.com' },
    { id: 'b4', title: '哔哩哔哩', url: 'https://www.bilibili.com' }
  ];

  const SEARCH_ENGINES = [
    { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=' },
    { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=' },
    { id: 'google', name: '谷歌', url: 'https://www.google.com/search?q=' },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=' }
  ];

  let currentEngineId = 'bing';
  let bookmarks = [];
  let bgImage = null;
  let editingBookmarkId = null;
  let highPerformance = false;

  const storageGet = (keys) => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, resolve);
      } else {
        const result = {};
        keys.forEach((k) => {
          const v = localStorage.getItem(k);
          result[k] = v ? JSON.parse(v) : undefined;
        });
        resolve(result);
      }
    });
  };

  const storageSet = (data) => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, resolve);
      } else {
        Object.entries(data).forEach(([k, v]) => {
          localStorage.setItem(k, JSON.stringify(v));
        });
        resolve();
      }
    });
  };

  // ── Clock ──

  const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function getGreeting() {
    const h = new Date().getHours();
    if (h >= 0 && h < 6) return '夜深了，注意休息';
    if (h >= 6 && h < 9) return '早上好';
    if (h >= 9 && h < 12) return '上午好';
    if (h >= 12 && h < 14) return '中午好';
    if (h >= 14 && h < 18) return '下午好';
    if (h >= 18 && h < 23) return '晚上好';
    return '夜深了，注意休息';
  }

  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    $('#time-display').textContent = `${h}:${m}`;

    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekday = WEEKDAYS[now.getDay()];
    $('#date-display').textContent = `${year}年${month}月${day}日 ${weekday}`;

    $('#greeting-display').textContent = getGreeting();
  }

  // ── Search ──

  function getCurrentEngine() {
    return SEARCH_ENGINES.find((e) => e.id === currentEngineId) || SEARCH_ENGINES[0];
  }

  function updateSearchUI() {
    const engine = getCurrentEngine();
    $('#engine-label').textContent = engine.name;
    $('#search-input').placeholder = '在' + engine.name + '上搜索';
  }

  function renderEngineDropdown() {
    const dropdown = $('#engine-dropdown');
    dropdown.innerHTML = '';
    SEARCH_ENGINES.forEach((engine) => {
      const item = document.createElement('div');
      item.className = 'engine-dropdown-item';
      if (engine.id === currentEngineId) item.classList.add('active');
      item.textContent = engine.name;
      item.dataset.engineId = engine.id;
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        currentEngineId = engine.id;
        updateSearchUI();
        renderEngineDropdown();
        hideEngineDropdown();
        await storageSet({ searchEngine: engine.id });
      });
      dropdown.appendChild(item);
    });
  }

  function showEngineDropdown() {
    hideSettingsDropdown();
    hideContextMenu();
    const dropdown = $('#engine-dropdown');
    dropdown.classList.remove('hidden');
  }

  function hideEngineDropdown() {
    $('#engine-dropdown').classList.add('hidden');
  }

  $('#engine-label').closest('.engine-selector').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = $('#engine-dropdown');
    if (dropdown.classList.contains('hidden')) {
      showEngineDropdown();
    } else {
      hideEngineDropdown();
    }
  });

  document.addEventListener('click', hideEngineDropdown);

  function doSearch() {
    const q = $('#search-input').value.trim();
    if (q) {
      const engine = getCurrentEngine();
      window.location.href = engine.url + encodeURIComponent(q);
    }
  }

  $('#search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  $('#search-btn').addEventListener('click', doSearch);

  // ── Background ──

  function applyBackground(imgDataUrl) {
    const el = $('#background');
    if (imgDataUrl) {
      el.style.backgroundImage = `url(${imgDataUrl})`;
      el.classList.add('has-image');
    } else {
      el.style.backgroundImage = '';
      el.classList.remove('has-image');
    }
  }

  function compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_W = 1920;
          let w = img.width;
          let h = img.height;
          if (w > MAX_W) {
            h = Math.round((h / w) * MAX_W);
            w = MAX_W;
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleBgUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await compressImage(file);
    bgImage = dataUrl;
    applyBackground(dataUrl);
    await storageSet({ backgroundImage: dataUrl });
  }

  $('#bg-change-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    showContextMenu();
  });

  function showContextMenu() {
    hideEngineDropdown();
    hideSettingsDropdown();
    const menu = $('#bg-context-menu');
    const btn = $('#bg-change-btn');
    menu.classList.remove('hidden');
    const btnRect = btn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let posX = btnRect.right - menuRect.width;
    let posY = btnRect.bottom + 8;
    if (posX < 10) posX = 10;
    if (posY + menuRect.height > window.innerHeight) {
      posY = btnRect.top - menuRect.height - 8;
    }
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';
  }

  function hideContextMenu() {
    $('#bg-context-menu').classList.add('hidden');
  }

  document.addEventListener('click', hideContextMenu);

  $('#bg-context-menu').addEventListener('click', async (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item) return;
    const action = item.dataset.action;
    hideContextMenu();
    if (action === 'change') {
      $('#bg-file-input').click();
    } else if (action === 'reset') {
      bgImage = null;
      applyBackground(null);
      await storageSet({ backgroundImage: null });
    }
  });

  $('#bg-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await handleBgUpload(file);
    e.target.value = '';
  });

  // ── Settings (Import / Export) ──

  function showSettingsDropdown() {
    hideEngineDropdown();
    hideContextMenu();
    const dropdown = $('#settings-dropdown');
    const btn = $('#settings-btn');
    dropdown.classList.remove('hidden');
    const btnRect = btn.getBoundingClientRect();
    dropdown.style.right = (window.innerWidth - btnRect.right) + 'px';
    dropdown.style.top = (btnRect.bottom + 8) + 'px';
  }

  function hideSettingsDropdown() {
    $('#settings-dropdown').classList.add('hidden');
  }

  $('#settings-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = $('#settings-dropdown');
    if (dropdown.classList.contains('hidden')) {
      showSettingsDropdown();
    } else {
      hideSettingsDropdown();
    }
  });

  document.addEventListener('click', hideSettingsDropdown);

  function toggleHighPerformance(enabled) {
    highPerformance = enabled;
    document.body.classList.toggle('high-performance', enabled);
    $('#high-perf-toggle').checked = enabled;
    storageSet({ highPerformance: enabled });
  }

  $('#high-perf-toggle').addEventListener('change', (e) => {
    e.stopPropagation();
    toggleHighPerformance(e.target.checked);
  });

  $('#settings-dropdown').addEventListener('click', (e) => {
    const item = e.target.closest('.settings-dropdown-item');
    if (!item) return;
    if (e.target.closest('.toggle-switch')) return;
    const action = item.dataset.action;
    hideSettingsDropdown();
    if (action === 'export') {
      exportBookmarks();
    } else if (action === 'import') {
      $('#import-file-input').click();
    }
  });

  function exportBookmarks() {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  $('#import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data) || !data.every((b) => b.id && b.title && b.url)) return;
      bookmarks = data;
      renderBookmarks();
      await storageSet({ bookmarks });
    } catch {}
    e.target.value = '';
  });

  // ── Todo ──

  let todos = [];

  function renderTodos() {
    const list = $('#todo-list');
    list.innerHTML = '';
    todos.forEach((todo) => {
      const item = document.createElement('div');
      item.className = 'todo-item' + (todo.completed ? ' completed' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.completed;
      checkbox.className = 'todo-checkbox';
      checkbox.addEventListener('change', async () => {
        todo.completed = checkbox.checked;
        item.classList.toggle('completed', todo.completed);
        await storageSet({ todos });
      });

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'todo-delete';
      deleteBtn.title = '删除';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', async () => {
        todos = todos.filter((t) => t.id !== todo.id);
        renderTodos();
        await storageSet({ todos });
      });

      item.appendChild(checkbox);
      item.appendChild(text);
      item.appendChild(deleteBtn);
      list.appendChild(item);
    });
  }

  function addTodo() {
    const input = $('#todo-input');
    const text = input.value.trim();
    if (!text) return;
    todos.push({ id: generateId(), text, completed: false });
    input.value = '';
    renderTodos();
    storageSet({ todos });
  }

  $('#todo-add-btn').addEventListener('click', addTodo);

  $('#todo-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
  });

  $('#todo-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#todo-panel').classList.toggle('hidden');
  });

  $('#todo-close').addEventListener('click', () => {
    $('#todo-panel').classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if ($('#todo-panel').classList.contains('hidden')) return;
    if (e.target.closest('#todo-panel') || e.target.closest('#todo-btn')) return;
    $('#todo-panel').classList.add('hidden');
  });

  // ── Bookmarks ──

  function generateId() {
    return 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  const AVATAR_COLORS = [
    '#5B86E5', '#36D1DC', '#E44D26', '#F7971E',
    '#8E2DE2', '#00B4DB', '#FC5C7D', '#6A82FB',
    '#11998E', '#FC00FF', '#F2994A', '#56CCF2'
  ];

  function getColorForTitle(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function renderBookmarks() {
    const grid = $('#bookmarks-grid');
    grid.innerHTML = '';

    bookmarks.forEach((bm) => {
      const card = document.createElement('a');
      card.className = 'bookmark-card glass';
      card.href = bm.url;
      card.target = '_self';
      card.draggable = true;
      card.dataset.bookmarkId = bm.id;

      const initial = bm.title.charAt(0).toUpperCase();
      const bgColor = getColorForTitle(bm.title);

      const wrapper = document.createElement('div');
      wrapper.className = 'favicon-wrapper';
      wrapper.style.background = bgColor;

      const initialSpan = document.createElement('span');
      initialSpan.className = 'favicon-fallback';
      initialSpan.textContent = initial;
      wrapper.appendChild(initialSpan);

      const label = document.createElement('span');
      label.className = 'bookmark-label';
      label.title = bm.title;
      label.textContent = bm.title;

      const actions = document.createElement('div');
      actions.className = 'bookmark-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'bookmark-edit';
      editBtn.title = '编辑';
      editBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'bookmark-delete';
      deleteBtn.title = '删除';
      deleteBtn.innerHTML = '&times;';

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(wrapper);
      card.appendChild(label);
      card.appendChild(actions);

      card.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-actions')) return;
      });

      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal(bm);
      });

      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        bookmarks = bookmarks.filter((b) => b.id !== bm.id);
        renderBookmarks();
        await storageSet({ bookmarks });
      });

      grid.appendChild(card);
    });
  }

  // ── Bookmark Drag & Drop ──

  let draggedId = null;

  $('#bookmarks-grid').addEventListener('dragstart', (e) => {
    const card = e.target.closest('.bookmark-card');
    if (!card || card.classList.contains('add-card')) return;
    draggedId = card.dataset.bookmarkId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  $('#bookmarks-grid').addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.target.closest('.bookmark-card');
    if (!card || card.dataset.bookmarkId === draggedId) return;

    const allCards = [...$('#bookmarks-grid').querySelectorAll('.bookmark-card:not(.add-card)')];
    allCards.forEach((c) => c.classList.remove('drag-over-left', 'drag-over-right'));

    const rect = card.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    if (e.clientX < mid) {
      card.classList.add('drag-over-left');
    } else {
      card.classList.add('drag-over-right');
    }
  });

  $('#bookmarks-grid').addEventListener('dragleave', (e) => {
    const card = e.target.closest('.bookmark-card');
    if (card) card.classList.remove('drag-over-left', 'drag-over-right');
  });

  $('#bookmarks-grid').addEventListener('drop', async (e) => {
    e.preventDefault();
    const card = e.target.closest('.bookmark-card');
    if (!card || card.dataset.bookmarkId === draggedId) return;

    const fromIdx = bookmarks.findIndex((b) => b.id === draggedId);
    const toIdx = bookmarks.findIndex((b) => b.id === card.dataset.bookmarkId);
    if (fromIdx === -1 || toIdx === -1) return;

    const rect = card.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    const insertAfter = e.clientX >= mid;

    const [moved] = bookmarks.splice(fromIdx, 1);
    let targetIdx = bookmarks.findIndex((b) => b.id === card.dataset.bookmarkId);
    if (insertAfter) targetIdx++;
    bookmarks.splice(targetIdx, 0, moved);

    renderBookmarks();
    await storageSet({ bookmarks });
  });

  $('#bookmarks-grid').addEventListener('dragend', () => {
    draggedId = null;
    const allCards = $('#bookmarks-grid').querySelectorAll('.bookmark-card');
    allCards.forEach((c) => {
      c.classList.remove('dragging', 'drag-over-left', 'drag-over-right');
    });
  });

  // ── Add / Edit Bookmark Modal ──

  function openModal(bookmark) {
    const title = $('#modal-title');
    const confirmBtn = $('#modal-confirm');
    if (bookmark) {
      editingBookmarkId = bookmark.id;
      title.textContent = '编辑快捷网址';
      confirmBtn.textContent = '保存';
      $('#bm-title-input').value = bookmark.title;
      $('#bm-url-input').value = bookmark.url;
    } else {
      editingBookmarkId = null;
      title.textContent = '添加快捷网址';
      confirmBtn.textContent = '添加';
      $('#bm-title-input').value = '';
      $('#bm-url-input').value = '';
    }
    $('#modal-overlay').classList.remove('hidden');
    setTimeout(() => $('#bm-title-input').focus(), 100);
  }

  function closeModal() {
    $('#modal-overlay').classList.add('hidden');
    editingBookmarkId = null;
  }

  $('#add-bookmark-btn').addEventListener('click', () => openModal());

  $('#modal-cancel').addEventListener('click', closeModal);

  $('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  $('#modal-confirm').addEventListener('click', async () => {
    const title = $('#bm-title-input').value.trim();
    let url = $('#bm-url-input').value.trim();

    if (!title || !url) return;

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
    } catch {
      return;
    }

    if (editingBookmarkId) {
      const bm = bookmarks.find((b) => b.id === editingBookmarkId);
      if (bm) {
        bm.title = title;
        bm.url = url;
      }
    } else {
      bookmarks.push({ id: generateId(), title, url });
    }

    renderBookmarks();
    await storageSet({ bookmarks });
    closeModal();
  });

  $('#bm-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#modal-confirm').click();
  });

  $('#bm-title-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#bm-url-input').focus();
  });

  // ── Gomoku Game ──

  const GOMOKU_SIZE = 15;
  const GOMOKU_CELL = 30;
  const GOMOKU_PAD = 15;
  const GOMOKU_CANVAS = GOMOKU_PAD * 2 + (GOMOKU_SIZE - 1) * GOMOKU_CELL;
  const EMPTY = 0, PLAYER = 1, AI = 2;

  let gomokuBoard = [];
  let gomokuOver = false;
  let gomokuPlayerTurn = true;
  let gomokuHistory = [];
  let gomokuScores = { you: 0, ai: 0, draw: 0 };
  let gomokuHoverPos = null;
  let gomokuWinCells = null;

  const gomokuCanvas = () => $('#game-canvas');
  const gomokuCtx = () => gomokuCanvas().getContext('2d');

  function gomokuInitBoard() {
    gomokuBoard = Array.from({ length: GOMOKU_SIZE }, () => Array(GOMOKU_SIZE).fill(EMPTY));
    gomokuOver = false;
    gomokuPlayerTurn = true;
    gomokuHistory = [];
    gomokuHoverPos = null;
    gomokuWinCells = null;
    $('#game-status').textContent = '你的回合';
    $('#game-status').className = 'game-status';
  }

  function gomokuDrawBoard() {
    if (gomokuOver) return;
    const ctx = gomokuCtx();
    const canvas = gomokuCanvas();
    canvas.width = GOMOKU_CANVAS;
    canvas.height = GOMOKU_CANVAS;
    ctx.clearRect(0, 0, GOMOKU_CANVAS, GOMOKU_CANVAS);

    const boardGrad = ctx.createLinearGradient(0, 0, GOMOKU_CANVAS, GOMOKU_CANVAS);
    boardGrad.addColorStop(0, '#d4a94b');
    boardGrad.addColorStop(0.5, '#c99a3e');
    boardGrad.addColorStop(1, '#b8892f');
    ctx.fillStyle = boardGrad;
    ctx.fillRect(0, 0, GOMOKU_CANVAS, GOMOKU_CANVAS);

    ctx.strokeStyle = 'rgba(80, 50, 10, 0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < GOMOKU_SIZE; i++) {
      const pos = GOMOKU_PAD + i * GOMOKU_CELL;
      ctx.beginPath();
      ctx.moveTo(GOMOKU_PAD, pos);
      ctx.lineTo(GOMOKU_PAD + (GOMOKU_SIZE - 1) * GOMOKU_CELL, pos);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos, GOMOKU_PAD);
      ctx.lineTo(pos, GOMOKU_PAD + (GOMOKU_SIZE - 1) * GOMOKU_CELL);
      ctx.stroke();
    }

    const stars = [[3,3],[3,11],[7,7],[11,3],[11,11]];
    ctx.fillStyle = 'rgba(80, 50, 10, 0.6)';
    stars.forEach(([r, c]) => {
      ctx.beginPath();
      ctx.arc(GOMOKU_PAD + c * GOMOKU_CELL, GOMOKU_PAD + r * GOMOKU_CELL, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let r = 0; r < GOMOKU_SIZE; r++) {
      for (let c = 0; c < GOMOKU_SIZE; c++) {
        if (gomokuBoard[r][c] !== EMPTY) {
          gomokuDrawStone(ctx, r, c, gomokuBoard[r][c]);
        }
      }
    }

    if (gomokuHoverPos && !gomokuOver && gomokuPlayerTurn) {
      const [hr, hc] = gomokuHoverPos;
      if (gomokuBoard[hr][hc] === EMPTY) {
        const x = GOMOKU_PAD + hc * GOMOKU_CELL;
        const y = GOMOKU_PAD + hr * GOMOKU_CELL;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    if (gomokuHistory.length > 0) {
      const last = gomokuHistory[gomokuHistory.length - 1];
      const lx = GOMOKU_PAD + last.c * GOMOKU_CELL;
      const ly = GOMOKU_PAD + last.r * GOMOKU_CELL;
      ctx.strokeStyle = last.player === PLAYER ? '#e04040' : '#3080e0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function gomokuDrawStone(ctx, r, c, player) {
    const x = GOMOKU_PAD + c * GOMOKU_CELL;
    const y = GOMOKU_PAD + r * GOMOKU_CELL;
    const radius = 12;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (player === PLAYER) {
      const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius);
      grad.addColorStop(0, '#555');
      grad.addColorStop(1, '#111');
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#d0d0d0');
      ctx.fillStyle = grad;
    }
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = player === PLAYER ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function gomokuDrawWinOverlay(result) {
    if (!gomokuWinCells || gomokuWinCells.length < 2) return;
    const ctx = gomokuCtx();

    const c1 = gomokuWinCells[0];
    const c2 = gomokuWinCells[gomokuWinCells.length - 1];
    const x1 = GOMOKU_PAD + c1[1] * GOMOKU_CELL;
    const y1 = GOMOKU_PAD + c1[0] * GOMOKU_CELL;
    const x2 = GOMOKU_PAD + c2[1] * GOMOKU_CELL;
    const y2 = GOMOKU_PAD + c2[0] * GOMOKU_CELL;

    ctx.strokeStyle = result === 'player' ? '#ff4444' : '#4488ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = result === 'player' ? 'rgba(255, 60, 60, 0.6)' : 'rgba(60, 120, 255, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    gomokuWinCells.forEach(([wr, wc]) => {
      const wx = GOMOKU_PAD + wc * GOMOKU_CELL;
      const wy = GOMOKU_PAD + wr * GOMOKU_CELL;
      ctx.strokeStyle = result === 'player' ? '#ff4444' : '#4488ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wx, wy, 15, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function gomokuDrawGameOver(result) {
    const ctx = gomokuCtx();
    const canvas = gomokuCanvas();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, GOMOKU_CANVAS, GOMOKU_CANVAS);

    const text = result === 'player' ? '你赢了！' : result === 'ai' ? 'AI 赢了！' : '平局！';
    const color = result === 'player' ? '#ff6b6b' : result === 'ai' ? '#6baaff' : '#aaaaaa';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 36px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fff';
    ctx.fillText(text, GOMOKU_CANVAS / 2, GOMOKU_CANVAS / 2 - 16);

    ctx.shadowBlur = 0;
    ctx.font = '16px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = color;
    ctx.fillText('点击「重新开始」再来一局', GOMOKU_CANVAS / 2, GOMOKU_CANVAS / 2 + 24);
  }

  function gomokuCheckWin(board, player) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < GOMOKU_SIZE; r++) {
      for (let c = 0; c < GOMOKU_SIZE; c++) {
        if (board[r][c] !== player) continue;
        for (const [dr, dc] of dirs) {
          let count = 1;
          const winCells = [[r, c]];
          for (let i = 1; i < 5; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) break;
            if (board[nr][nc] !== player) break;
            count++;
            winCells.push([nr, nc]);
          }
          if (count >= 5) return winCells;
        }
      }
    }
    return null;
  }

  function gomokuIsFull() {
    for (let r = 0; r < GOMOKU_SIZE; r++)
      for (let c = 0; c < GOMOKU_SIZE; c++)
        if (gomokuBoard[r][c] === EMPTY) return false;
    return true;
  }

  function gomokuCountLine(board, r, c, dr, dc, player) {
    let count = 0;
    let block = 0;
    for (let i = 1; i <= 4; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) { block++; break; }
      if (board[nr][nc] === player) count++;
      else if (board[nr][nc] === EMPTY) break;
      else { block++; break; }
    }
    for (let i = 1; i <= 4; i++) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) { block++; break; }
      if (board[nr][nc] === player) count++;
      else if (board[nr][nc] === EMPTY) break;
      else { block++; break; }
    }
    return { count, block };
  }

  function gomokuScorePattern(count, block) {
    if (count >= 4) return 100000;
    if (count === 3 && block === 0) return 10000;
    if (count === 3 && block === 1) return 1000;
    if (count === 2 && block === 0) return 1000;
    if (count === 2 && block === 1) return 100;
    if (count === 1 && block === 0) return 100;
    if (count === 1 && block === 1) return 10;
    return 0;
  }

  function gomokuScorePos(board, r, c, player) {
    if (board[r][c] !== EMPTY) return 0;
    let score = 0;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      const temp = board.map((row) => [...row]);
      temp[r][c] = player;
      const { count, block } = gomokuCountLine(temp, r, c, dr, dc, player);
      score += gomokuScorePattern(count, block);
    }
    return score;
  }

  function gomokuAiMove() {
    let bestScore = -1;
    let bestMoves = [];
    const candidates = new Set();

    for (let r = 0; r < GOMOKU_SIZE; r++) {
      for (let c = 0; c < GOMOKU_SIZE; c++) {
        if (gomokuBoard[r][c] !== EMPTY) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE && gomokuBoard[nr][nc] === EMPTY) {
                candidates.add(nr * GOMOKU_SIZE + nc);
              }
            }
          }
        }
      }
    }

    if (candidates.size === 0) {
      const center = Math.floor(GOMOKU_SIZE / 2);
      return { r: center, c: center };
    }

    for (const key of candidates) {
      const r = Math.floor(key / GOMOKU_SIZE);
      const c = key % GOMOKU_SIZE;
      const attackScore = gomokuScorePos(gomokuBoard, r, c, AI);
      const defenseScore = gomokuScorePos(gomokuBoard, r, c, PLAYER);
      const total = attackScore * 1.1 + defenseScore;

      if (total > bestScore) {
        bestScore = total;
        bestMoves = [{ r, c }];
      } else if (total === bestScore) {
        bestMoves.push({ r, c });
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function gomokuPlaceStone(r, c, player) {
    gomokuBoard[r][c] = player;
    gomokuHistory.push({ r, c, player });
  }

  function gomokuUndo() {
    if (gomokuHistory.length < 2 || gomokuOver) return;
    for (let i = 0; i < 2; i++) {
      const last = gomokuHistory.pop();
      gomokuBoard[last.r][last.c] = EMPTY;
    }
    gomokuPlayerTurn = true;
    $('#game-status').textContent = '你的回合';
    gomokuDrawBoard();
  }

  function gomokuUpdateScore() {
    $('#game-score-you').textContent = '你: ' + gomokuScores.you;
    $('#game-score-ai').textContent = 'AI: ' + gomokuScores.ai;
    $('#game-score-draw').textContent = '平局: ' + gomokuScores.draw;
  }

  function gomokuPlayerMove(r, c) {
    if (gomokuOver || !gomokuPlayerTurn || gomokuBoard[r][c] !== EMPTY) return;

    gomokuPlaceStone(r, c, PLAYER);
    gomokuDrawBoard();

    const win = gomokuCheckWin(gomokuBoard, PLAYER);
    if (win) {
      gomokuOver = true;
      gomokuWinCells = win;
      gomokuScores.you++;
      gomokuUpdateScore();
      gomokuDrawBoard();
      gomokuDrawWinOverlay('player');
      gomokuDrawGameOver('player');
      $('#game-status').textContent = '你赢了！';
      $('#game-status').className = 'game-status win';
      return;
    }

    if (gomokuIsFull()) {
      gomokuOver = true;
      gomokuScores.draw++;
      gomokuUpdateScore();
      gomokuDrawBoard();
      gomokuDrawGameOver('draw');
      $('#game-status').textContent = '平局！';
      $('#game-status').className = 'game-status draw';
      return;
    }

    gomokuPlayerTurn = false;
    $('#game-status').textContent = 'AI 思考中...';
    $('#game-status').className = 'game-status';

    setTimeout(() => {
      const move = gomokuAiMove();
      gomokuPlaceStone(move.r, move.c, AI);
      gomokuDrawBoard();

      const aiWin = gomokuCheckWin(gomokuBoard, AI);
      if (aiWin) {
        gomokuOver = true;
        gomokuWinCells = aiWin;
        gomokuScores.ai++;
        gomokuUpdateScore();
        gomokuDrawBoard();
        gomokuDrawWinOverlay('ai');
        gomokuDrawGameOver('ai');
        $('#game-status').textContent = 'AI 赢了！';
        $('#game-status').className = 'game-status lose';
        return;
      }

      if (gomokuIsFull()) {
        gomokuOver = true;
        gomokuScores.draw++;
        gomokuUpdateScore();
        gomokuDrawBoard();
        gomokuDrawGameOver('draw');
        $('#game-status').textContent = '平局！';
        $('#game-status').className = 'game-status draw';
        return;
      }

      gomokuPlayerTurn = true;
      $('#game-status').textContent = '你的回合';
      $('#game-status').className = 'game-status';
    }, 300);
  }

  function gomokuGetPos(e) {
    const canvas = gomokuCanvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const c = Math.round((x - GOMOKU_PAD) / GOMOKU_CELL);
    const r = Math.round((y - GOMOKU_PAD) / GOMOKU_CELL);
    if (r >= 0 && r < GOMOKU_SIZE && c >= 0 && c < GOMOKU_SIZE) return [r, c];
    return null;
  }

  function gomokuStart() {
    gomokuInitBoard();
    gomokuDrawBoard();
  }

  function gomokuOpen() {
    $('#game-modal').classList.remove('hidden');
    gomokuStart();
  }

  function gomokuClose() {
    $('#game-modal').classList.add('hidden');
  }

  $('#game-btn').addEventListener('click', gomokuOpen);

  $('#game-close').addEventListener('click', gomokuClose);

  $('#game-modal').addEventListener('click', (e) => {
    if (e.target === $('#game-modal')) gomokuClose();
  });

  $('#game-restart').addEventListener('click', gomokuStart);

  $('#game-undo').addEventListener('click', gomokuUndo);

  gomokuCanvas().addEventListener('click', (e) => {
    const pos = gomokuGetPos(e);
    if (pos) gomokuPlayerMove(pos[0], pos[1]);
  });

  gomokuCanvas().addEventListener('mousemove', (e) => {
    if (gomokuOver) return;
    const pos = gomokuGetPos(e);
    if (pos && (gomokuHoverPos === null || gomokuHoverPos[0] !== pos[0] || gomokuHoverPos[1] !== pos[1])) {
      gomokuHoverPos = pos;
      gomokuDrawBoard();
    }
  });

  gomokuCanvas().addEventListener('mouseleave', () => {
    if (gomokuOver) return;
    gomokuHoverPos = null;
    gomokuDrawBoard();
  });

  // ── Init ──

  async function init() {
    updateClock();
    setInterval(updateClock, 60000);

    const data = await storageGet(['bookmarks', 'backgroundImage', 'searchEngine', 'todos', 'highPerformance']);

    bookmarks = data.bookmarks || [...DEFAULT_BOOKMARKS];
    bgImage = data.backgroundImage || null;
    currentEngineId = data.searchEngine || 'bing';
    todos = data.todos || [];
    highPerformance = !!data.highPerformance;

    updateSearchUI();
    renderEngineDropdown();
    renderBookmarks();
    renderTodos();
    applyBackground(bgImage);
    if (highPerformance) toggleHighPerformance(true);
  }

  init();
})();
