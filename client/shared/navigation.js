/**
 * Universal Navigation Bar & Floating Menu
 * Tüm sayfalarda (/scoreboard, /referee, /editor) sayfalar arası hızlı geçiş sağlar
 */
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;

  // Ana navigasyon butonu ve modal arayüzünü oluştur
  const navContainer = document.createElement('div');
  navContainer.className = 'universal-nav-widget';
  navContainer.innerHTML = `
    <button class="nav-trigger-btn" id="navTriggerBtn" title="Sayfalar Arası Geçiş">
      <span class="nav-icon">🚀</span>
      <span class="nav-label">Hızlı Geçiş</span>
    </button>

    <div class="nav-drawer" id="navDrawer">
      <div class="nav-drawer-header">
        <h3>🔗 Sayfalar & Özellikler</h3>
        <button class="nav-close-btn" id="navCloseBtn">✕</button>
      </div>
      <div class="nav-links-list">
        <a href="/scoreboard/" class="nav-item ${currentPath.includes('scoreboard') ? 'active' : ''}">
          <span class="nav-item-icon">📺</span>
          <div class="nav-item-info">
            <span class="nav-item-title">TV Skorboard</span>
            <span class="nav-item-desc">Tam ekran canlı skor ve sayaç</span>
          </div>
        </a>
        <a href="/referee/" class="nav-item ${currentPath.includes('referee') ? 'active' : ''}">
          <span class="nav-item-icon">📱</span>
          <div class="nav-item-info">
            <span class="nav-item-title">Hakem Paneli</span>
            <span class="nav-item-desc">Maç yönetimi, skor ve kartlar</span>
          </div>
        </a>
        <a href="/editor/" class="nav-item ${currentPath.includes('editor') ? 'active' : ''}">
          <span class="nav-item-icon">🎨</span>
          <div class="nav-item-info">
            <span class="nav-item-title">Tasarım Editörü</span>
            <span class="nav-item-desc">Sürükle bırak skorboard dizilimi</span>
          </div>
        </a>
        <a href="/tablet/" class="nav-item ${currentPath.includes('tablet') ? 'active' : ''}">
          <span class="nav-item-icon">📊</span>
          <div class="nav-item-info">
            <span class="nav-item-title">Tablet Skor</span>
            <span class="nav-item-desc">Sadece skor kontrolü</span>
          </div>
        </a>
        <a href="/" class="nav-item ${currentPath === '/' ? 'active' : ''}">
          <span class="nav-item-icon">🏠</span>
          <div class="nav-item-info">
            <span class="nav-item-title">Ana Sayfa</span>
            <span class="nav-item-desc">Sistem merkezi ve özet</span>
          </div>
        </a>
      </div>
    </div>
    <div class="nav-backdrop" id="navBackdrop"></div>
  `;

  document.body.appendChild(navContainer);

  const triggerBtn = document.getElementById('navTriggerBtn');
  const drawer = document.getElementById('navDrawer');
  const closeBtn = document.getElementById('navCloseBtn');
  const backdrop = document.getElementById('navBackdrop');

  const openDrawer = () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  };

  triggerBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  // Klavye kısayolu (Escape ile kapatma, Alt+N veya ESC ile aç/kapat)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  // Tam ekran modunda Hızlı Geçiş butonunu gizle
  const checkFullscreen = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
      navContainer.style.display = 'none';
      if (drawer.classList.contains('open')) closeDrawer();
    } else {
      navContainer.style.display = '';
    }
  };

  document.addEventListener('fullscreenchange', checkFullscreen);
  document.addEventListener('webkitfullscreenchange', checkFullscreen);
  document.addEventListener('mozfullscreenchange', checkFullscreen);
  document.addEventListener('MSFullscreenChange', checkFullscreen);
});
