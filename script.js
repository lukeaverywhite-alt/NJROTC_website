(() => {
  'use strict';

  const root = document.documentElement;
  const base = document.body.dataset.base || '';
  const page = document.body.dataset.page || 'home';
  const config = window.SITE_CONFIG || {};
  const content = window.SITE_CONTENT || {};
  const identity = config.identity || {};
  const approvedHosts = new Set(['www.netc.navy.mil', 'www.bethel.k12.ct.us', 'calendar.google.com']);

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    if (/^https:\/\//i.test(value)) {
      try { const url = new URL(value); return approvedHosts.has(url.hostname) ? url.href : null; } catch (_) { return null; }
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//') || value.startsWith('/') || value.split(/[?#]/)[0].split('/').includes('..')) return null;
    return base + value;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(label, href, className) {
    const safe = safeUrl(href);
    if (!safe) return null;
    const node = element('a', className, label);
    node.href = safe;
    if (safe.startsWith('https://')) { node.rel = 'noopener noreferrer'; node.target = '_blank'; }
    return node;
  }

  const ordered = records => (Array.isArray(records) ? records : []).filter(item => item && item.enabled !== false).slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  function renderHeader() {
    const mount = document.querySelector('[data-site-header]');
    if (!mount) return;
    const bar = element('div', 'header-inner site-width');
    const brand = link(identity.shortName || 'Bethel NJROTC', identity.logo ? 'index.html' : 'index.html', 'brand');
    const logo = element('img'); logo.src = safeUrl(identity.logo || 'assets/unit-mark.svg'); logo.alt = ''; logo.width = 46; logo.height = 46;
    brand.prepend(logo); bar.append(brand);
    const nav = element('nav', 'site-nav'); nav.id = 'site-navigation'; nav.setAttribute('aria-label', 'Primary navigation');
    const list = element('ul', 'nav-list');
    ordered(window.NAVIGATION).forEach(item => {
      const li = element('li', item.children ? 'nav-group' : '');
      if (item.children) {
        const button = element('button', 'nav-trigger', item.title); button.type = 'button'; button.setAttribute('aria-expanded', 'false');
        const menu = element('ul', 'dropdown');
        ordered(item.children).forEach(child => { const a = link(child.title, child.url); if (a) { if (child.id === page) a.setAttribute('aria-current', 'page'); const sub = element('li'); sub.append(a); menu.append(sub); } });
        button.addEventListener('click', () => { closeDropdowns(button); button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true')); });
        button.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); button.setAttribute('aria-expanded', 'true'); menu.querySelector('a')?.focus(); } });
        li.append(button, menu);
      } else { const a = link(item.title, item.url); if (a) { if (item.id === page) a.setAttribute('aria-current', 'page'); li.append(a); } }
      list.append(li);
    });
    nav.append(list);
    const controls = element('div', 'header-controls');
    const theme = element('button', 'icon-button'); theme.type = 'button'; theme.dataset.themeToggle = '';
    const mobile = element('button', 'icon-button menu-button', 'Menu'); mobile.type = 'button'; mobile.setAttribute('aria-controls', nav.id); mobile.setAttribute('aria-expanded', 'false');
    mobile.addEventListener('click', () => { const open = document.body.classList.toggle('menu-open'); mobile.setAttribute('aria-expanded', String(open)); if (open) nav.querySelector('a,button')?.focus(); });
    nav.addEventListener('click', e => { if (e.target.closest('a')) closeMobile(mobile); });
    controls.append(theme, mobile); bar.append(nav, controls); mount.append(bar);
  }

  function closeDropdowns(except) { document.querySelectorAll('.nav-trigger').forEach(button => { if (button !== except) button.setAttribute('aria-expanded', 'false'); }); }
  function closeMobile(button = document.querySelector('.menu-button')) { document.body.classList.remove('menu-open'); button?.setAttribute('aria-expanded', 'false'); }

  function initializeTheme() {
    let saved = null;
    try { saved = localStorage.getItem('bhsnjrotc-theme'); } catch (_) { /* Storage may be unavailable. */ }
    root.dataset.theme = saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const button = document.querySelector('[data-theme-toggle]');
    const update = () => { const dark = root.dataset.theme === 'dark'; button.textContent = dark ? '☀' : '☾'; button.setAttribute('aria-label', dark ? 'Use light theme' : 'Use dark theme'); button.title = button.getAttribute('aria-label'); button.setAttribute('aria-pressed', String(!dark)); };
    button.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('bhsnjrotc-theme', root.dataset.theme); } catch (_) { /* Theme still works for this page. */ } update(); }); update();
  }

  function renderFooter() {
    const mount = document.querySelector('[data-site-footer]'); if (!mount) return;
    const wrap = element('div', 'footer-inner site-width'); wrap.append(element('p', '', `© ${new Date().getFullYear()} ${identity.fullName || 'Bethel High School NJROTC'}`));
    const contact = link('Contact', 'pages/contact.html'); if (contact) wrap.append(contact); mount.append(wrap);
  }

  function renderCollection(mount) {
    const records = ordered(content[mount.dataset.content]);
    if (!records.length) { mount.append(element('p', 'empty-state', 'Verified information is not available yet.')); return; }
    records.slice(0, Number(mount.dataset.limit) || records.length).forEach(record => {
      const card = element(record.url ? 'a' : 'article', 'card'); if (record.url) { const url = safeUrl(record.url); if (!url) return; card.href = url; }
      card.append(element('p', 'eyebrow', record.category || ''), element('h2', '', record.title), element('p', '', record.description)); mount.append(card);
    });
  }

  function renderAnnouncements() {
    const today = new Date().toISOString().slice(0, 10);
    const records = (window.ANNOUNCEMENTS || []).filter(a => a.enabled !== false && (!a.startDate || a.startDate <= today) && (!a.endDate || a.endDate >= today) && a.message && !/^confirmed announcements will/i.test(a.message));
    document.querySelectorAll('[data-announcements]').forEach(mount => records.forEach(record => { const note = element('aside', `announcement ${record.level || 'normal'}`); note.append(element('strong', '', record.title), element('p', '', record.message)); if (record.link) { const more = link('Details', record.link); if (more) note.append(more); } mount.append(note); }));
  }

  function renderQuickLinks() { document.querySelectorAll('[data-quick-links]').forEach(mount => (config.quickLinks || []).forEach(item => { const node = link(item.label, item.href, 'card'); if (node) { node.append(element('span', '', item.description)); mount.append(node); } })); }
  function renderCountdown() { document.querySelectorAll('[data-countdown]').forEach(mount => { const event = config.featuredEvent; if (!event?.enabled || !event.target) { mount.hidden = true; return; } const days = Math.max(0, Math.ceil((new Date(event.target) - Date.now()) / 86400000)); mount.append(element('strong', '', `${days} days — ${event.name}`), element('p', '', event.subtitle || '')); }); }
  function renderCalendar() { document.querySelectorAll('[data-calendar]').forEach(mount => { const url = safeUrl(config.calendar?.embedUrl || ''); if (!url) { mount.append(element('p', 'empty-state', 'The verified public unit calendar is not available yet.')); return; } const frame = element('iframe'); frame.src = url; frame.title = 'Bethel NJROTC calendar'; frame.loading = 'lazy'; mount.append(frame); }); }
  function renderGallery() { document.querySelectorAll('[data-gallery]').forEach(mount => { const items = window.GALLERY_ITEMS || []; if (!items.length) { mount.append(element('p', 'empty-state', 'No approved gallery images are available yet.')); return; } items.forEach(item => { const src = safeUrl(item.src); if (!src) return; const figure = element('figure', 'gallery-item'); const image = element('img'); image.src = src; image.alt = item.alt || ''; image.loading = 'lazy'; figure.append(image, element('figcaption', '', item.caption || '')); mount.append(figure); }); }); }
  function renderCurrentYear() { document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); }); }

  function initialize() {
    renderHeader(); initializeTheme(); renderFooter(); renderAnnouncements(); renderQuickLinks(); renderCountdown(); renderCalendar(); renderGallery(); renderCurrentYear();
    document.querySelectorAll('[data-content]').forEach(renderCollection);
    document.addEventListener('click', event => { if (!event.target.closest('.nav-group')) closeDropdowns(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeDropdowns(); closeMobile(); document.querySelector('.menu-button')?.focus(); } });
    document.querySelector('.site-nav')?.addEventListener('focusout', event => { const group = event.target.closest('.nav-group'); if (group && !group.contains(event.relatedTarget)) group.querySelector('.nav-trigger')?.setAttribute('aria-expanded', 'false'); });
  }

  initialize();
})();
