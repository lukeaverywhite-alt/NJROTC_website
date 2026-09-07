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

  function uniqueRecords(records, keyFor = record => record.id || record.url || record.href) {
    const unique = new Map();
    (Array.isArray(records) ? records : []).forEach(record => {
      if (!record) return;
      const key = keyFor(record);
      if (key && !unique.has(key)) unique.set(key, record);
    });
    return [...unique.values()];
  }

  function renderHeader() {
    const mount = document.querySelector('[data-site-header]');
    if (!mount) return;
    const bar = element('div', 'header-inner site-width');
    const brand = link(identity.shortName || 'Bethel NJROTC', identity.logo ? 'index.html' : 'index.html', 'brand');
    // The hero is the homepage's single, prominent mark. Interior pages retain
    // the compact header mark so every page still has a recognizable way home.
    if (page !== 'home') {
      const logo = element('img'); logo.src = safeUrl(identity.logo || 'assets/official-unit-mark.png'); logo.alt = ''; logo.width = 50; logo.height = 49;
      brand.prepend(logo);
    }
    bar.append(brand);
    const nav = element('nav', 'site-nav'); nav.id = 'site-navigation'; nav.setAttribute('aria-label', 'Primary navigation');
    const list = element('ul', 'nav-list');
    ordered(window.NAVIGATION).forEach(item => {
      const li = element('li', item.children ? 'nav-group' : '');
      if (item.children) {
        const children = ordered(item.children);
        const button = element('button', 'nav-trigger', item.title); button.type = 'button'; button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-haspopup', 'true');
        const menu = element('ul', 'dropdown'); menu.id = `nav-${item.id}`; button.setAttribute('aria-controls', menu.id);
        if (children.some(child => child.id === page)) button.setAttribute('aria-current', 'page');
        children.forEach(child => { const a = link(child.title, child.url); if (a) { if (child.id === page) a.setAttribute('aria-current', 'page'); const sub = element('li'); sub.append(a); menu.append(sub); } });
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

  function renderUnitCredentials() {
    document.querySelectorAll('[data-unit-credentials]').forEach(mount => {
      const credentials = config.credentials || {};
      const years = [...new Set(Array.isArray(credentials.awardYears) ? credentials.awardYears : [])]
        .filter(year => Number.isInteger(year)).sort((a, b) => a - b);
      const fragment = document.createDocumentFragment();
      fragment.append(element('p', 'interface-label', 'Unit credentials'));
      const heading = element('h2'); heading.id = 'unit-credentials-title';
      heading.append(document.createTextNode(credentials.distinguishedUnitAward || 'Unit recognition'));
      if (credentials.distinction) heading.append(' ', element('span', '', credentials.distinction));
      fragment.append(heading);
      if (years.length) {
        const history = element('p', 'award-years');
        history.setAttribute('aria-label', `Award years ${years.join(', ')}`);
        years.forEach((year, index) => { if (index) history.append(' ', element('span', '', '/'), ' '); history.append(String(year)); });
        fragment.append(history);
      }
      if (credentials.outstandingUnitAward && credentials.outstandingYear) {
        const outstanding = element('p', 'outstanding-award');
        outstanding.append(element('span', '', credentials.outstandingUnitAward), String(credentials.outstandingYear));
        fragment.append(outstanding);
      }
      replaceMountContent(mount, fragment, 'unit-credentials');
    });
  }

  function renderCollection(mount) {
    const records = ordered(uniqueRecords(content[mount.dataset.content]));
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
    const records = uniqueRecords(window.ANNOUNCEMENTS, a => a.id || `${a.title}\u0000${a.message}`).filter(a => a.enabled !== false && (!a.startDate || a.startDate <= today) && (!a.endDate || a.endDate >= today) && a.message && !/^confirmed announcements will/i.test(a.message));
    document.querySelectorAll('[data-announcements]').forEach(mount => { const fragment=document.createDocumentFragment(); records.forEach(record => { const note=element('aside',`announcement ${record.level || 'normal'}`); const marker=element('span','announcement-marker'); marker.setAttribute('aria-hidden','true'); note.append(marker,element('strong','',record.title),element('p','',record.message)); if(record.link){const more=link('Details',record.link);if(more)note.append(more);} fragment.append(note); }); replaceMountContent(mount,fragment,'announcements'); });
  }

  function renderQuickLinks() { document.querySelectorAll('[data-quick-links]').forEach(mount => { const fragment=document.createDocumentFragment(); uniqueRecords(config.quickLinks, item => item.href).forEach(item => { const node=link(item.label,item.href,'card'); if(node){node.append(element('span','',item.description));fragment.append(node);} }); replaceMountContent(mount,fragment,'quick-links'); }); }
  function renderCountdown() { document.querySelectorAll('[data-countdown]').forEach(mount => { const fragment=document.createDocumentFragment(); const event=config.featuredEvent; mount.hidden=!event?.enabled || !event.target; if(!mount.hidden){const days=Math.max(0,Math.ceil((new Date(event.target)-Date.now())/86400000));fragment.append(element('strong','',`${days} days — ${event.name}`),element('p','',event.subtitle || ''));} replaceMountContent(mount,fragment,'countdown'); }); }
  function renderCalendar() { document.querySelectorAll('[data-calendar]').forEach(mount => { const fragment=document.createDocumentFragment(); const url=safeUrl(config.calendar?.embedUrl || ''); if(!url)fragment.append(element('p','empty-state','The verified public unit calendar is not available yet.')); else {const frame=element('iframe');frame.src=url;frame.title='Bethel NJROTC calendar';frame.loading='lazy';fragment.append(frame);} replaceMountContent(mount,fragment,'calendar'); }); }
  function renderGallery() { document.querySelectorAll('[data-gallery]').forEach(mount => { const fragment=document.createDocumentFragment(); const items=uniqueRecords(window.GALLERY_ITEMS, item => item.id || item.src); if(!items.length)fragment.append(element('p','empty-state','No approved gallery images are available yet.')); items.forEach(item => {const src=safeUrl(item.src);if(!src)return;const figure=element('figure','gallery-item');const image=element('img');image.src=src;image.alt=item.alt || '';image.loading='lazy';figure.append(image,element('figcaption','',item.caption || ''));fragment.append(figure);}); replaceMountContent(mount,fragment,'gallery'); }); }
  function renderCurrentYear() { document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); }); }


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

  function initializeAnimations() {
    document.documentElement.classList.add('animations-ready');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const selector = '.page-hero .site-width,.section-heading,.card,.content-card,.resource-group,.gallery-item,.forecast-item,.review-note,.program-overview,.photo-visual,.creed-presentation';
    let observer;
    const reveal = node => { node.classList.add('is-visible'); observer?.unobserve(node); };
    const register = () => {
      document.querySelectorAll(selector).forEach((node, index) => {
        if (node.dataset.animationReady) return;
        node.dataset.animationReady = 'true';
        node.classList.add('reveal-item');
        node.style.setProperty('--reveal-order', String(index % 6));
        if (reduced || !observer) reveal(node); else observer.observe(node);
      });
    };
    if (!reduced && 'IntersectionObserver' in window) observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    register();
    document.addEventListener('site:content-rendered', register);
  }

  function initializePageTransitions() {
    document.addEventListener('click', event => {
      const anchor = event.target.closest('a[href]');
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute('download')) return;
      const target = new URL(anchor.href, location.href);
      if (target.origin !== location.origin || target.pathname === location.pathname && target.search === location.search && target.hash) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault(); document.documentElement.classList.add('page-exit');
      setTimeout(() => { location.href = target.href; }, 130);
    });
    addEventListener('pageshow', () => document.documentElement.classList.remove('page-exit'));
  }

  function initialize() {
    if (document.documentElement.dataset.siteInitialized) return;
    document.documentElement.dataset.siteInitialized = 'true';
    renderHeader(); initializeTheme(); renderFooter(); renderUnitCredentials(); renderAnnouncements(); renderQuickLinks(); renderCountdown(); renderCalendar(); renderGallery(); renderCurrentYear();
    document.querySelectorAll('[data-content]').forEach(renderCollection);
    initializePhotoVisuals(); initializeAnimations(); initializePageTransitions();
    if (document.documentElement.dataset.siteListenersBound) return;
    document.documentElement.dataset.siteListenersBound = 'true';
    document.addEventListener('click', event => { if (!event.target.closest('.nav-group')) closeDropdowns(); if (!event.target.closest('[data-photo-visual]')) document.querySelectorAll('[data-photo-visual].is-selected').forEach(photo => photo.classList.remove('is-selected')); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeDropdowns(); closeMobile(); document.querySelector('.menu-button')?.focus(); } });
    document.querySelector('.site-nav')?.addEventListener('focusout', event => { const group = event.target.closest('.nav-group'); if (group && !group.contains(event.relatedTarget)) group.querySelector('.nav-trigger')?.setAttribute('aria-expanded', 'false'); });
  }

  initialize();
})();
