(function () {
  const $ = (sel) => document.querySelector(sel);

  const DEFAULT_BOOKMARKS = [
    { id: 'b1', title: '必应', url: 'https://www.bing.com' },
    { id: 'b2', title: 'GitHub', url: 'https://github.com' },
    { id: 'b3', title: '知乎', url: 'https://www.zhihu.com' },
    { id: 'b4', title: '哔哩哔哩', url: 'https://www.bilibili.com' }
  ];

  let bookmarks = [];
  let bgImage = null;

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

  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    $('#time-display').textContent = `${h}:${m}:${s}`;

    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekday = WEEKDAYS[now.getDay()];
    $('#date-display').textContent = `${year}年${month}月${day}日 ${weekday}`;
  }

  // ── Search ──

  function doSearch() {
    const q = $('#search-input').value.trim();
    if (q) {
      window.location.href = 'https://www.bing.com/search?q=' + encodeURIComponent(q);
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

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'bookmark-delete';
      deleteBtn.title = '删除';
      deleteBtn.innerHTML = '&times;';

      card.appendChild(wrapper);
      card.appendChild(label);
      card.appendChild(deleteBtn);

      card.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-delete')) return;
        e.preventDefault();
        window.location.href = bm.url;
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

  // ── Add Bookmark Modal ──

  function openModal() {
    $('#modal-overlay').classList.remove('hidden');
    $('#bm-title-input').value = '';
    $('#bm-url-input').value = '';
    setTimeout(() => $('#bm-title-input').focus(), 100);
  }

  function closeModal() {
    $('#modal-overlay').classList.add('hidden');
  }

  $('#add-bookmark-btn').addEventListener('click', openModal);

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

    bookmarks.push({ id: generateId(), title, url });
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

  // ── Init ──

  async function init() {
    updateClock();
    setInterval(updateClock, 1000);

    const data = await storageGet(['bookmarks', 'backgroundImage']);

    bookmarks = data.bookmarks || [...DEFAULT_BOOKMARKS];
    bgImage = data.backgroundImage || null;

    renderBookmarks();
    applyBackground(bgImage);
  }

  init();
})();
