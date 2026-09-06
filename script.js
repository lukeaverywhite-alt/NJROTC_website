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

  function replaceMountContent(mount, fragment, rendererName) {
    mount.replaceChildren(fragment);
    mount.dataset.renderedBy = rendererName;
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
    controls.append(theme, mobile); bar.append(nav, controls); const fragment = document.createDocumentFragment(); fragment.append(bar); replaceMountContent(mount, fragment, 'header');
  }

  function closeDropdowns(except) { document.querySelectorAll('.nav-trigger').forEach(button => { if (button !== except) button.setAttribute('aria-expanded', 'false'); }); }
  function closeMobile(button = document.querySelector('.menu-button')) { document.body.classList.remove('menu-open'); button?.setAttribute('aria-expanded', 'false'); }

  function initializeTheme() {
    let saved = null;
    try { saved = localStorage.getItem('bhsnjrotc-theme'); } catch (_) { /* Storage may be unavailable. */ }
    root.dataset.theme = saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const button = document.querySelector('[data-theme-toggle]'); if (!button) return;
    const update = () => { const dark = root.dataset.theme === 'dark'; button.textContent = dark ? '☀' : '☾'; button.setAttribute('aria-label', dark ? 'Use light theme' : 'Use dark theme'); button.title = button.getAttribute('aria-label'); button.setAttribute('aria-pressed', String(!dark)); };
    button.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('bhsnjrotc-theme', root.dataset.theme); } catch (_) { /* Theme still works for this page. */ } update(); }); update();
  }

  function renderFooter() {
    const mount = document.querySelector('[data-site-footer]'); if (!mount) return;
    const wrap = element('div', 'footer-inner site-width'); wrap.append(element('p', '', `© ${new Date().getFullYear()} ${identity.fullName || 'Bethel High School NJROTC'}`));
    const contact = link('Contact', 'pages/contact.html'); if (contact) wrap.append(contact); const fragment = document.createDocumentFragment(); fragment.append(wrap); replaceMountContent(mount, fragment, 'footer');
  }

  function renderCollection(mount) {
    const unique = new Map();
    ordered(content[mount.dataset.content]).forEach(record => { if (record.id && !unique.has(record.id)) unique.set(record.id, record); });
    const records = ordered([...unique.values()]);
    const fragment = document.createDocumentFragment();
    if (!records.length) fragment.append(element('p', 'empty-state', 'Verified information is not available yet.'));
    records.slice(0, Number(mount.dataset.limit) || records.length).forEach(record => {
      const card = element(record.url ? 'a' : 'article', 'card');
      if (record.url) { const url = safeUrl(record.url); if (!url) return; card.href = url; }
      card.dataset.contentId = record.id;
      card.append(element('p', 'eyebrow', record.category || ''), element('h2', '', record.title), element('p', '', record.description)); fragment.append(card);
    });
    replaceMountContent(mount, fragment, 'collection');
  }

  function renderAnnouncements() {
    const today = new Date().toISOString().slice(0, 10);
    const records = (window.ANNOUNCEMENTS || []).filter(a => a.enabled !== false && (!a.startDate || a.startDate <= today) && (!a.endDate || a.endDate >= today) && a.message && !/^confirmed announcements will/i.test(a.message));
    document.querySelectorAll('[data-announcements]').forEach(mount => { const fragment=document.createDocumentFragment(); records.forEach(record => { const note=element('aside',`announcement ${record.level || 'normal'}`); note.append(element('strong','',record.title),element('p','',record.message)); if(record.link){const more=link('Details',record.link);if(more)note.append(more);} fragment.append(note); }); replaceMountContent(mount,fragment,'announcements'); });
  }

  function renderQuickLinks() { document.querySelectorAll('[data-quick-links]').forEach(mount => { const fragment=document.createDocumentFragment(); (config.quickLinks || []).forEach(item => { const node=link(item.label,item.href,'card'); if(node){node.append(element('span','',item.description));fragment.append(node);} }); replaceMountContent(mount,fragment,'quick-links'); }); }
  function renderCountdown() { document.querySelectorAll('[data-countdown]').forEach(mount => { const fragment=document.createDocumentFragment(); const event=config.featuredEvent; mount.hidden=!event?.enabled || !event.target; if(!mount.hidden){const days=Math.max(0,Math.ceil((new Date(event.target)-Date.now())/86400000));fragment.append(element('strong','',`${days} days — ${event.name}`),element('p','',event.subtitle || ''));} replaceMountContent(mount,fragment,'countdown'); }); }
  function renderCalendar() { document.querySelectorAll('[data-calendar]').forEach(mount => { const fragment=document.createDocumentFragment(); const url=safeUrl(config.calendar?.embedUrl || ''); if(!url)fragment.append(element('p','empty-state','The verified public unit calendar is not available yet.')); else {const frame=element('iframe');frame.src=url;frame.title='Bethel NJROTC calendar';frame.loading='lazy';fragment.append(frame);} replaceMountContent(mount,fragment,'calendar'); }); }
  function renderGallery() { document.querySelectorAll('[data-gallery]').forEach(mount => { const fragment=document.createDocumentFragment(); const items=window.GALLERY_ITEMS || []; if(!items.length)fragment.append(element('p','empty-state','No approved gallery images are available yet.')); items.forEach(item => {const src=safeUrl(item.src);if(!src)return;const figure=element('figure','gallery-item');const image=element('img');image.src=src;image.alt=item.alt || '';image.loading='lazy';figure.append(image,element('figcaption','',item.caption || ''));fragment.append(figure);}); replaceMountContent(mount,fragment,'gallery'); }); }
  function renderCurrentYear() { document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); }); }

  function initializeProgramVisuals() {
    const visuals = [...document.querySelectorAll('[data-program-visual]')].filter(visual => !visual.dataset.programMotionInitialized);
    if (!visuals.length) return;
    const activate = visual => {
      if (visual.dataset.programMotionComplete) return false;
      visual.classList.add('is-active');
      const image = visual.querySelector('img');
      if (image && !matchMedia('(prefers-reduced-motion: reduce)').matches) image.src = `${image.currentSrc || image.src}`.split('#')[0] + '#play';
      visual.dataset.programMotionComplete = 'true';
      return true;
    };
    visuals.forEach(visual => { visual.dataset.programMotionInitialized = 'true'; });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      visuals.forEach(activate);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (activate(entry.target)) observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    visuals.forEach(visual => observer.observe(visual));
  }

  function initializePhotoVisuals() {
    document.querySelectorAll('[data-photo-visual]').forEach(visual => {
      if (visual.dataset.photoInteractionInitialized) return;
      visual.dataset.photoInteractionInitialized = 'true';
      const toggle = () => {
        const selected = !visual.classList.contains('is-selected');
        document.querySelectorAll('[data-photo-visual].is-selected').forEach(photo => photo.classList.remove('is-selected'));
        visual.classList.toggle('is-selected', selected);
        document.querySelectorAll('[data-photo-visual]').forEach(photo => photo.setAttribute('aria-pressed',String(photo.classList.contains('is-selected'))));
      };
      visual.addEventListener('click', event => { event.stopPropagation(); toggle(); });
      visual.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault(); toggle();
      });
    });
  }

  function initialize() {
    renderHeader(); initializeTheme(); renderFooter(); renderAnnouncements(); renderQuickLinks(); renderCountdown(); renderCalendar(); renderGallery(); renderCurrentYear();
    document.querySelectorAll('[data-content]').forEach(renderCollection);
    initializeProgramVisuals(); initializePhotoVisuals();
    if (document.documentElement.dataset.siteListenersBound) return;
    document.documentElement.dataset.siteListenersBound = 'true';
    document.addEventListener('click', event => { if (!event.target.closest('.nav-group')) closeDropdowns(); if (!event.target.closest('[data-photo-visual]')) document.querySelectorAll('[data-photo-visual].is-selected').forEach(photo => photo.classList.remove('is-selected')); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeDropdowns(); closeMobile(); document.querySelector('.menu-button')?.focus(); } });
    document.querySelector('.site-nav')?.addEventListener('focusout', event => { const group = event.target.closest('.nav-group'); if (group && !group.contains(event.relatedTarget)) group.querySelector('.nav-trigger')?.setAttribute('aria-expanded', 'false'); });
  }

  initialize();
})();
