(() => {
  const root = document.documentElement;
  const base = document.body.dataset.base || '';
  const page = document.body.dataset.page || 'home';
  const config = window.SITE_CONFIG;
  const storedTheme = localStorage.getItem('bhsnjrotc-theme');
  const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
  root.dataset.theme = theme;

  const nav = [
    ['home', 'Home', `${base}index.html`],
    ['weather', 'Weather', `${base}pages/weather.html`],
    ['chain', 'Chain of Command', `${base}pages/chain-of-command.html`],
    ['pow', 'Plan of the Week', `${base}pages/plan-of-week.html`],
    ['teams', 'Teams & Groups', `${base}pages/teams.html`],
    ['info', 'Information Center', `${base}pages/information-center.html`]
  ];
  const more = [
    ['gallery', 'Gallery', `${base}pages/gallery.html`],
    ['training', 'Cadet Creed & Qualifications', `${base}pages/training.html`],
    ['blt', 'Basic Leadership Training', `${base}pages/basic-leadership-training.html`],
    ['ball', 'Military Ball', `${base}pages/military-ball.html`],
    ['wellness', 'Mental Health Resources', `${base}pages/wellness.html`],
    ['faq', 'FAQ', `${base}pages/faq.html`],
    ['contact', 'Contact', `${base}pages/contact.html`]
  ];

  const link = ([id, label, href]) => `<a href="${href}"${page === id ? ' class="active" aria-current="page"' : ''}>${label}</a>`;
  const header = document.querySelector('[data-site-header]');
  if (header) {
    header.innerHTML = `
      <a class="skip-link" href="#main-content">Skip to main content</a>
      <div class="status-strip"><div class="site-width"><span><i></i> Unit information portal</span><span>${config.identity.location}</span></div></div>
      <nav class="command-nav site-width" aria-label="Primary navigation">
        <a class="compact-brand" href="${base}index.html" aria-label="${config.identity.shortName} home" title="Return home">
          <img src="${base}${config.identity.logo}" alt=""><span>${config.identity.shortName}</span>
        </a>
        <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span class="sr-only">Open navigation</span><b></b><b></b><b></b></button>
        <div class="site-menu" id="site-menu">${nav.map(link).join('')}
          <details class="more-menu"><summary${more.some(x => x[0] === page) ? ' class="active"' : ''}>More</summary><div>${more.map(link).join('')}</div></details>
        </div>
        <button class="theme-toggle" type="button" aria-label="Switch to ${theme === 'dark' ? 'light' : 'dark'} mode" title="Change color theme"><span aria-hidden="true">${theme === 'dark' ? '☀' : '☾'}</span></button>
      </nav>`;
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) footer.innerHTML = `<div class="site-width footer-grid"><div><strong>${config.identity.fullName}</strong><p>${config.identity.motto}</p></div><nav aria-label="Footer navigation"><a href="${base}pages/information-center.html">Resources</a><a href="${base}pages/wellness.html">Wellness</a><a href="${base}pages/contact.html">Contact</a><a href="https://www.netc.navy.mil/NSTC/NJROTC/" rel="noreferrer" target="_blank">Official NJROTC site <span class="sr-only">(opens in new tab)</span></a></nav></div><div class="site-width footer-legal"><span>&copy; <span data-year></span> ${config.identity.shortName}</span><span>School program information portal</span></div>`;

  const themeButton = document.querySelector('.theme-toggle');
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('bhsnjrotc-theme', next);
    themeButton.querySelector('span').textContent = next === 'dark' ? '☀' : '☾';
    themeButton.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} mode`);
  });

  const menuButton = document.querySelector('.menu-button');
  const menu = document.querySelector('.site-menu');
  const closeMenu = () => { menu?.classList.remove('open'); menuButton?.setAttribute('aria-expanded', 'false'); };
  menuButton?.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  menu?.addEventListener('click', e => { if (e.target.matches('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); menuButton?.focus(); } });
  document.addEventListener('click', e => { if (menu?.classList.contains('open') && !e.target.closest('.command-nav')) closeMenu(); });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  renderAnnouncements();
  renderQuickLinks();
  renderCountdown();
  renderCalendar();
  renderGallery();

  function activeAnnouncements() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return (window.ANNOUNCEMENTS || []).filter(item => {
      if (!item.enabled) return false;
      const starts = item.startDate ? new Date(`${item.startDate}T00:00:00`) : null;
      const ends = item.endDate ? new Date(`${item.endDate}T23:59:59`) : null;
      return (!starts || now >= starts) && (!ends || now <= ends);
    });
  }
  function renderQuickLinks() {
    document.querySelectorAll('[data-quick-links]').forEach(region => {
      region.innerHTML = config.quickLinks.map((item, index) => `<a class="nav-card" href="${item.href}"><small>Quick access</small><b>${String(index + 1).padStart(2, '0')}</b><h3>${item.label}</h3><p>${item.description}</p></a>`).join('');
    });
  }
  function renderAnnouncements() {
    document.querySelectorAll('[data-announcements]').forEach(region => {
      const items = activeAnnouncements();
      region.innerHTML = items.length ? items.map(item => `<article class="announcement ${item.level}" role="${item.level === 'urgent' ? 'alert' : 'status'}"><span class="notice-level">${item.level} notice</span><div><h2>${item.title}</h2><p>${item.message}</p></div>${item.link ? `<a href="${item.link}">Learn more <span aria-hidden="true">→</span></a>` : ''}</article>`).join('') : '';
    });
  }
  function renderCountdown() {
    const region = document.querySelector('[data-countdown]');
    if (!region) return;
    const event = config.featuredEvent;
    if (!event.enabled || !event.target || Number.isNaN(new Date(event.target).getTime())) {
      region.innerHTML = `<div class="countdown-empty"><span class="interface-label">Featured event</span><h2>Next milestone awaiting confirmation</h2><p>The unit webmaster can publish a verified countdown from the central configuration file.</p></div>`;
      return;
    }
    region.innerHTML = `<div class="countdown-copy"><span class="interface-label">Featured event</span><h2>${event.name}</h2><p>${event.subtitle}</p>${event.location ? `<small>${event.location}</small>` : ''}</div><div class="countdown-units" aria-live="polite">${['days','hours','minutes','seconds'].map(u => `<div><strong data-unit="${u}">00</strong><span>${u}</span></div>`).join('')}</div>`;
    const update = () => {
      const distance = Math.max(0, new Date(event.target).getTime() - Date.now());
      const values = { days: Math.floor(distance / 86400000), hours: Math.floor(distance / 3600000) % 24, minutes: Math.floor(distance / 60000) % 60, seconds: Math.floor(distance / 1000) % 60 };
      Object.entries(values).forEach(([unit, value]) => { region.querySelector(`[data-unit="${unit}"]`).textContent = String(value).padStart(2, '0'); });
      if (!distance) region.querySelector('.countdown-copy p').textContent = 'This event has started or concluded.';
    };
    update(); setInterval(update, 1000);
  }
  function renderCalendar() {
    const region = document.querySelector('[data-calendar]');
    if (!region) return;
    if (!config.calendar.embedUrl) {
      region.innerHTML = `<div class="calendar-empty"><span aria-hidden="true">▦</span><h3>Calendar connection pending</h3><p>Add the unit's verified public Google Calendar embed URL in <code>data/site-config.js</code>.</p></div>`;
      return;
    }
    region.innerHTML = `<iframe title="Bethel NJROTC calendar" src="${config.calendar.embedUrl}" loading="lazy"></iframe>`;
  }
  function renderGallery() {
    const grid = document.querySelector('[data-gallery]');
    if (!grid) return;
    const items = window.GALLERY_ITEMS || [];
    if (!items.length) { grid.innerHTML = '<div class="gallery-empty"><h2>Unit photography coming soon</h2><p>Verified photographs can be added without changing this page layout.</p></div>'; return; }
    grid.innerHTML = items.map((item, i) => `<button class="gallery-card" type="button" data-gallery-index="${i}"><img src="${base}${item.src}" alt="${item.alt}" loading="lazy"><span>${item.caption || item.alt}</span></button>`).join('');
    const dialog = document.querySelector('#gallery-dialog');
    let current = 0;
    const show = i => { current = (i + items.length) % items.length; dialog.querySelector('img').src = `${base}${items[current].src}`; dialog.querySelector('img').alt = items[current].alt; dialog.querySelector('p').textContent = items[current].caption || items[current].alt; };
    grid.addEventListener('click', e => { const button = e.target.closest('[data-gallery-index]'); if (button) { show(Number(button.dataset.galleryIndex)); dialog.showModal(); } });
    dialog?.addEventListener('click', e => { if (e.target === dialog || e.target.closest('[data-close]')) dialog.close(); if (e.target.closest('[data-prev]')) show(current - 1); if (e.target.closest('[data-next]')) show(current + 1); });
    dialog?.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(current - 1); if (e.key === 'ArrowRight') show(current + 1); });
  }
})();
