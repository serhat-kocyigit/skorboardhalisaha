/**
 * Tasarım Editörü — editor.js
 * Drag, Resize, Properties Panel
 * Varsayılan konumlar scoreboard.css sb-* sınıflarıyla BİREBİR eşleşir.
 */

let currentLayout = null;
let selectedElement = null;
let layoutConfig = {};
let isDragging = false;
let isResizing = false;
let resizeDir = null;

// Drag state
let dragStartX, dragStartY, elemStartX, elemStartY;
// Resize state
let rsStartX, rsStartY, rsStartW, rsStartH, rsElemX, rsElemY;

// ============================================================
// VARSAYILAN DÜZEN
// !! Bu değerler scoreboard.css'deki sb-* sınıf değerleriyle
//    BİREBİR AYNI olmalı (yüzde cinsinden).
// ============================================================
const DEFAULT_LAYOUT = {
  fieldLogo: { x: 1,  y: 2,  w: 18, h: 12, visible: true },
  period:    { x: 36, y: 2,  w: 26, h: 8,  visible: true },
  timer:     { x: 73, y: 2,  w: 25, h: 12, visible: true },
  teamHome:  { x: 2,  y: 16, w: 27, h: 58, visible: true },
  score:     { x: 31, y: 22, w: 36, h: 44, visible: true },
  teamAway:  { x: 70, y: 16, w: 27, h: 58, visible: true },
  lastGoal:  { x: 18, y: 77, w: 62, h: 9,  visible: true  },
  adBanner:  { x: 0,  y: 92, w: 100,h: 8,  visible: true  }
};

// ============================================================
// BAŞLATMA
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  SocketClient.connect();
  initDraggables();
  initComponentPanel();
  loadLayouts();
  loadActiveLayout();
});

// ============================================================
// LAYOUT YÖNETİMİ
// ============================================================
async function loadLayouts() {
  const res = await API.get('/layouts');
  const sel = document.getElementById('layoutSelect');
  sel.innerHTML = '<option value="">— Layout Seçin —</option>';
  if (res.success) {
    res.data.forEach(l => {
      const o = document.createElement('option');
      o.value = l.id;
      o.textContent = l.name + (l.is_active ? ' ✓' : '');
      sel.appendChild(o);
    });
  }
}

async function loadActiveLayout() {
  const res = await API.get('/layouts/active');
  if (res.success && res.data) {
    currentLayout = res.data;
    layoutConfig = parseConfig(res.data.config);
    document.getElementById('layoutSelect').value = res.data.id;
  } else {
    layoutConfig = deepClone(DEFAULT_LAYOUT);
  }
  applyToPreview();
}

function parseConfig(c) {
  return typeof c === 'string' ? JSON.parse(c) : (c || deepClone(DEFAULT_LAYOUT));
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

/** Config'i önizlemeye uygula */
function applyToPreview() {
  Object.entries(layoutConfig).forEach(([key, cfg]) => {
    const el = document.getElementById(`drag-${key}`);
    if (!el) return;
    if (cfg.x !== undefined) el.style.left   = cfg.x + '%';
    if (cfg.y !== undefined) el.style.top    = cfg.y + '%';
    if (cfg.w !== undefined) el.style.width  = (key === 'adBanner' ? 100 : cfg.w) + '%';
    if (cfg.h !== undefined) el.style.height = cfg.h + '%';
    el.style.opacity = cfg.visible === false ? '0.25' : '1';
  });
}

/** Ekrandaki pozisyonları config'e kaydet */
function syncConfigFromDOM() {
  const c = document.getElementById('previewContainer');
  document.querySelectorAll('.draggable').forEach(el => {
    const key = el.dataset.key; if (!key) return;
    if (!layoutConfig[key]) layoutConfig[key] = {};
    layoutConfig[key].x = round1(el.offsetLeft / c.offsetWidth  * 100);
    layoutConfig[key].y = round1(el.offsetTop  / c.offsetHeight * 100);
    layoutConfig[key].w = key === 'adBanner' ? 100 : round1(el.offsetWidth  / c.offsetWidth  * 100);
    layoutConfig[key].h = round1(el.offsetHeight / c.offsetHeight * 100);
  });
}

function round1(v) { return Math.round(v * 10) / 10; }

async function saveLayout() {
  syncConfigFromDOM();
  if (currentLayout) {
    const res = await API.put(`/layouts/${currentLayout.id}`, { config: layoutConfig });
    if (res.success) showToast('✅ Layout kaydedildi!', 'success');
  } else {
    const name = prompt('Layout adı:', 'Yeni Layout');
    if (!name) return;
    const res = await API.post('/layouts', { name, config: layoutConfig });
    if (res.success) { currentLayout = res.data; loadLayouts(); showToast('✅ Oluşturuldu!', 'success'); }
  }
}

async function activateLayout() {
  if (!currentLayout) return showToast('⚠️ Önce kaydedin', 'warning');
  await API.put(`/layouts/${currentLayout.id}/activate`);
  loadLayouts();
  showToast('🚀 TV\'de güncellendi!', 'success');
}

function resetLayout() {
  layoutConfig = deepClone(DEFAULT_LAYOUT);
  applyToPreview();
  deselectAll();
}

function newLayout() {
  currentLayout = null;
  document.getElementById('layoutSelect').value = '';
  resetLayout();
}

document.getElementById('layoutSelect').addEventListener('change', async (e) => {
  if (!e.target.value) return;
  const res = await API.get('/layouts');
  if (res.success) {
    const l = res.data.find(x => x.id === parseInt(e.target.value));
    if (l) { currentLayout = l; layoutConfig = parseConfig(l.config); applyToPreview(); }
  }
});

// ============================================================
// DRAG & DROP + RESIZE
// ============================================================
function initDraggables() {
  document.querySelectorAll('.draggable').forEach(el => {
    addResizeHandles(el);

    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('resize-handle')) return;
      e.preventDefault();
      selectElement(el);
      startDrag(e.clientX, e.clientY, el);
    });

    el.addEventListener('touchstart', (e) => {
      if (e.target.classList.contains('resize-handle')) return;
      e.preventDefault();
      selectElement(el);
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY, el);
    }, { passive: false });
  });

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e.touches[0]); }, { passive: false });
  document.addEventListener('touchend', onUp);

  document.getElementById('previewContainer').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) deselectAll();
  });
}

function addResizeHandles(el) {
  ['se','sw','ne','nw','e','w','s','n'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `resize-handle resize-${dir}`;
    h.dataset.dir = dir;
    h.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); startResize(e.clientX, e.clientY, el, dir); });
    h.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); startResize(e.touches[0].clientX, e.touches[0].clientY, el, dir); }, { passive: false });
    el.appendChild(h);
  });
}

function startDrag(cx, cy, el) {
  isDragging = true; selectedElement = el;
  el.classList.add('dragging');
  dragStartX = cx; dragStartY = cy;
  elemStartX = el.offsetLeft; elemStartY = el.offsetTop;
}

function startResize(cx, cy, el, dir) {
  isResizing = true; resizeDir = dir; selectedElement = el;
  rsStartX = cx; rsStartY = cy;
  rsStartW = el.offsetWidth;  rsStartH = el.offsetHeight;
  rsElemX  = el.offsetLeft;   rsElemY  = el.offsetTop;
}

function onMove(e) {
  if (isDragging && selectedElement)  doDrag(e.clientX, e.clientY);
  if (isResizing && selectedElement)  doResize(e.clientX, e.clientY);
}

function doDrag(cx, cy) {
  const c = document.getElementById('previewContainer');
  let nx = elemStartX + (cx - dragStartX);
  let ny = elemStartY + (cy - dragStartY);
  nx = clamp(nx, 0, c.offsetWidth  - selectedElement.offsetWidth);
  ny = clamp(ny, 0, c.offsetHeight - selectedElement.offsetHeight);
  selectedElement.style.left = nx + 'px';
  selectedElement.style.top  = ny + 'px';
  updatePropsPanel(selectedElement);
}

function doResize(cx, cy) {
  const c = document.getElementById('previewContainer');
  const dx = cx - rsStartX, dy = cy - rsStartY;
  const key = selectedElement.dataset.key;
  const minW = 30, minH = 16;
  let nw = rsStartW, nh = rsStartH, nx = rsElemX, ny = rsElemY;

  if (resizeDir.includes('e')) nw = Math.max(minW, rsStartW + dx);
  if (resizeDir.includes('s')) nh = Math.max(minH, rsStartH + dy);
  if (resizeDir.includes('w')) { nw = Math.max(minW, rsStartW - dx); nx = rsElemX + (rsStartW - nw); }
  if (resizeDir.includes('n')) { nh = Math.max(minH, rsStartH - dy); ny = rsElemY + (rsStartH - nh); }

  if (key === 'adBanner') { nw = c.offsetWidth; nx = 0; }

  nx = clamp(nx, 0, Infinity); ny = clamp(ny, 0, Infinity);
  if (nx + nw > c.offsetWidth)  nw = c.offsetWidth  - nx;
  if (ny + nh > c.offsetHeight) nh = c.offsetHeight - ny;

  selectedElement.style.left   = nx + 'px';
  selectedElement.style.top    = ny + 'px';
  selectedElement.style.width  = nw + 'px';
  selectedElement.style.height = nh + 'px';
  updatePropsPanel(selectedElement);
}

function onUp() {
  if (selectedElement) selectedElement.classList.remove('dragging');
  isDragging = false; isResizing = false; resizeDir = null;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ============================================================
// SEÇİM & ÖZELLIKLER
// ============================================================
function initComponentPanel() {
  document.querySelectorAll('.component-item').forEach(item => {
    item.addEventListener('click', () => {
      const el = document.getElementById(`drag-${item.dataset.component}`);
      if (el) selectElement(el);
    });
  });
}

function selectElement(el) {
  deselectAll();
  el.classList.add('selected');
  selectedElement = el;
  document.querySelectorAll('.component-item').forEach(ci => {
    ci.classList.toggle('active', ci.dataset.component === el.dataset.key);
  });
  updatePropsPanel(el);
  document.getElementById('propertiesPanel').style.display = 'block';

  // Başlık
  const labels = { fieldLogo:'Saha Bilgisi', period:'Devre', timer:'Sayaç',
    teamHome:'Ev Sahibi', score:'Skor', teamAway:'Deplasman',
    lastGoal:'Son Gol', adBanner:'Reklam Bandı' };
  document.getElementById('selectedLabel').textContent = labels[el.dataset.key] || 'Özellikler';
}

function deselectAll() {
  document.querySelectorAll('.draggable').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.component-item').forEach(ci => ci.classList.remove('active'));
  document.getElementById('propertiesPanel').style.display = 'none';
  selectedElement = null;
}

function updatePropsPanel(el) {
  const c = document.getElementById('previewContainer');
  document.getElementById('propX').value = round1(el.offsetLeft / c.offsetWidth  * 100);
  document.getElementById('propY').value = round1(el.offsetTop  / c.offsetHeight * 100);
  document.getElementById('propW').value = round1(el.offsetWidth  / c.offsetWidth  * 100);
  document.getElementById('propH').value = round1(el.offsetHeight / c.offsetHeight * 100);
  const key = el.dataset.key;
  document.getElementById('propVisible').checked = !(layoutConfig[key] && layoutConfig[key].visible === false);
}

function updateProperty(prop) {
  if (!selectedElement) return;
  const key = selectedElement.dataset.key;
  const c = document.getElementById('previewContainer');
  if (!layoutConfig[key]) layoutConfig[key] = {};

  if (prop === 'x') {
    const v = parseFloat(document.getElementById('propX').value) || 0;
    selectedElement.style.left = v + '%'; layoutConfig[key].x = v;
  } else if (prop === 'y') {
    const v = parseFloat(document.getElementById('propY').value) || 0;
    selectedElement.style.top  = v + '%'; layoutConfig[key].y = v;
  } else if (prop === 'w') {
    const v = parseFloat(document.getElementById('propW').value) || 10;
    selectedElement.style.width = (key === 'adBanner' ? 100 : v) + '%'; layoutConfig[key].w = v;
  } else if (prop === 'h') {
    const v = parseFloat(document.getElementById('propH').value) || 5;
    selectedElement.style.height = v + '%'; layoutConfig[key].h = v;
  } else if (prop === 'visible') {
    const v = document.getElementById('propVisible').checked;
    selectedElement.style.opacity = v ? '1' : '0.25'; layoutConfig[key].visible = v;
  }
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'info') {
  document.getElementById('editorToast')?.remove();
  const t = document.createElement('div');
  t.id = 'editorToast';
  t.className = `editor-toast editor-toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('editor-toast-fade'); setTimeout(() => t.remove(), 400); }, 2500);
}
