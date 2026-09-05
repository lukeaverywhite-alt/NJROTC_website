(() => {
  'use strict';

  const root = document.documentElement;
  const base = document.body.dataset.base || '';
  const page = document.body.dataset.page || 'home';
  const config = window.SITE_CONFIG || {};
  const content = window.SITE_CONTENT || {};
  const identity = config.identity || {};
  const APPROVED_HTTPS_HOSTS = new Set([
    'www.bethel.k12.ct.us',
    'www.netc.navy.mil'
  ]);

  /**
   * Data files may use site-relative paths, page fragments, or explicitly approved
   * public HTTPS services. Protocol-relative URLs, credentials, and traversal are
   * rejected. Calendar embeds have a deliberately narrower provider/path policy.
   */
  function validatedUrl(value, policy = 'link') {
    if (typeof value !== 'string' || !value.trim() || /[\\\r\n\t]/.test(value)) return null;
    const candidate = value.trim();
    if (candidate.startsWith('//') || candidate.split('/').includes('..')) return null;

    let url;
    try {
      url = new URL(candidate, document.baseURI);
    } catch {
      return null;
    }

    if (policy === 'calendar') {
      return url.protocol === 'https:' &&
        url.hostname === 'calendar.google.com' &&
        url.pathname === '/calendar/embed' &&
        !url.username && !url.password ? url.href : null;
    }

    const isRelative = !/^[a-z][a-z\d+.-]*:/i.test(candidate) &&
      url.origin === window.location.origin;
    const isApprovedHttps = url.protocol === 'https:' &&
      APPROVED_HTTPS_HOSTS.has(url.hostname) && !url.username && !url.password;
    return isRelative || isApprovedHttps ? url.href : null;
  }

  function element(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    Object.entries(options.attributes || {}).forEach(([name, value]) => node.setAttribute(name, String(value)));
    children.filter(Boolean).forEach(child => node.append(child));
    return node;
  }

  function safeLink(label, href, options = {}) {
    const url = validatedUrl(href);
    if (!url) return null;
    const anchor = element('a', { className: options.className, text: label });
    anchor.href = url;
    if (options.current) {
      anchor.classList.add('active');
      anchor.setAttribute('aria-current', 'page');
    }
    if (options.external) {
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
    }
    return anchor;
  }

  // Formatted data is intentionally unsupported. If it is introduced, pass it
  // through this policy: only text plus STRONG, EM, BR, and validated A[href]
  // nodes may be copied; no other elements or attributes are allowed.
  const FORMATTED_CONTENT_POLICY = Object.freeze({ tags: ['STRONG', 'EM', 'BR', 'A'], attributes: { A: ['href'] } });
  function sanitizeFormattedContent(markup) {
    const source = new DOMParser().parseFromString(String(markup), 'text/html').body;
    const output = document.createDocumentFragment();
    const copy = (input, parent) => input.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) return parent.append(document.createTextNode(child.textContent));
      if (child.nodeType !== Node.ELEMENT_NODE || !FORMATTED_CONTENT_POLICY.tags.includes(child.tagName)) {
        return copy(child, parent);
      }
      const clean = document.createElement(child.tagName.toLowerCase());
      if (child.tagName === 'A') {
        const href = validatedUrl(child.getAttribute('href'));
        if (!href) return copy(child, parent);
        clean.href = href;
      }
      copy(child, clean);
      parent.append(clean);
    });
    copy(source, output);
    return output;
  }
  // Keep the sanitizer visible to future data renderers without accepting HTML now.
  window.NJROTCContentPolicy = Object.freeze({ sanitizeFormattedContent, FORMATTED_CONTENT_POLICY, validatedUrl });

  const storedTheme = localStorage.getItem('bhsnjrotc-theme');
  const theme = ['light', 'dark'].includes(storedTheme) ? storedTheme : 'dark';
  root.dataset.theme = theme;

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const append = (parent, ...children) => { children.filter(Boolean).forEach(child => parent.append(child)); return parent; };
  const safeUrl = value => {
    if (typeof value !== 'string' || !value.trim()) return '';
    if (/^https:\/\//i.test(value)) return value;
    if (/^(?:[a-z]+:|\/\/|\/|\.\.\/)/i.test(value)) return '';
    return `${base}${value.replace(/^\.\//, '')}`;
  };
  const validRecord = item => item && typeof item === 'object' && typeof item.id === 'string' &&
    typeof item.title === 'string' && typeof item.description === 'string' &&
    typeof item.category === 'string' && Number.isFinite(item.order) && typeof item.enabled === 'boolean';
  const records = name => Array.isArray(content[name])
    ? content[name].filter(validRecord).filter(item => item.enabled).sort((a, b) => a.order - b.order) : [];
  const activeByDate = item => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = item.startDate && /^\d{4}-\d{2}-\d{2}$/.test(item.startDate) ? new Date(`${item.startDate}T00:00:00`) : null;
    const end = item.endDate && /^\d{4}-\d{2}-\d{2}$/.test(item.endDate) ? new Date(`${item.endDate}T23:59:59`) : null;
    return (!start || today >= start) && (!end || today <= end);
  };
  const nav = [
    ['home', 'Home', `${base}index.html`], ['weather', 'Weather', `${base}pages/weather.html`],
    ['chain', 'Chain of Command', `${base}pages/chain-of-command.html`], ['pow', 'Plan of the Week', `${base}pages/plan-of-week.html`],
    ['teams', 'Teams & Groups', `${base}pages/teams.html`], ['info', 'Information Center', `${base}pages/information-center.html`]
  ];
  const more = [
    ['gallery', 'Gallery', `${base}pages/gallery.html`], ['training', 'Cadet Creed & Qualifications', `${base}pages/training.html`],
    ['blt', 'Basic Leadership Training', `${base}pages/basic-leadership-training.html`], ['ball', 'Military Ball', `${base}pages/military-ball.html`],
    ['wellness', 'Mental Health Resources', `${base}pages/wellness.html`], ['faq', 'FAQ', `${base}pages/faq.html`],
    ['contact', 'Contact', `${base}pages/contact.html`]
  ];

  const header = document.querySelector('[data-site-header]');
  if (header) {
    const skip = safeLink('Skip to main content', '#main-content', { className: 'skip-link' });
    const status = element('div', { className: 'status-strip' }, [element('div', { className: 'site-width' }, [
      element('span', {}, [element('i'), document.createTextNode(' Unit information portal')]),
      element('span', { text: identity.location || '' })
    ])]);
    const brand = safeLink('', `${base}index.html`, { className: 'compact-brand' });
    brand?.setAttribute('aria-label', `${identity.shortName || 'NJROTC'} home`);
    brand?.setAttribute('title', 'Return home');
    const logoUrl = validatedUrl(`${base}${identity.logo || ''}`);
    if (brand && logoUrl) {
      const logo = element('img', { attributes: { alt: '' } });
      logo.src = logoUrl;
      brand.append(logo, element('span', { text: identity.shortName || '' }));
    }
    const menuButton = element('button', { className: 'menu-button', attributes: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'site-menu' } }, [
      element('span', { className: 'sr-only', text: 'Open navigation' }), element('b'), element('b'), element('b')
    ]);
    const siteMenu = element('div', { className: 'site-menu', attributes: { id: 'site-menu' } });
    nav.forEach(([id, label, href]) => siteMenu.append(safeLink(label, href, { current: page === id })));
    const details = element('details', { className: 'more-menu' });
    const summary = element('summary', { text: 'More' });
    if (more.some(item => item[0] === page)) summary.className = 'active';
    const moreLinks = element('div');
    more.forEach(([id, label, href]) => moreLinks.append(safeLink(label, href, { current: page === id })));
    details.append(summary, moreLinks);
    siteMenu.append(details);
    const themeButton = element('button', { className: 'theme-toggle', attributes: { type: 'button', 'aria-label': `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, title: 'Change color theme' } }, [
      element('span', { text: theme === 'dark' ? '☀' : '☾', attributes: { 'aria-hidden': 'true' } })
    ]);
    header.replaceChildren(skip, status, element('nav', { className: 'command-nav site-width', attributes: { 'aria-label': 'Primary navigation' } }, [brand, menuButton, siteMenu, themeButton]));
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    const footerNav = element('nav', { attributes: { 'aria-label': 'Footer navigation' } });
    [['Resources', `${base}pages/information-center.html`], ['Wellness', `${base}pages/wellness.html`], ['Contact', `${base}pages/contact.html`]].forEach(([label, href]) => footerNav.append(safeLink(label, href)));
    const official = safeLink('Official NJROTC site ', 'https://www.netc.navy.mil/NSTC/NJROTC/', { external: true });
    official?.append(element('span', { className: 'sr-only', text: '(opens in new tab)' }));
    footerNav.append(official);
    footer.replaceChildren(
      element('div', { className: 'site-width footer-grid' }, [element('div', {}, [element('strong', { text: identity.fullName || '' }), element('p', { text: identity.motto || '' })]), footerNav]),
      element('div', { className: 'site-width footer-legal' }, [element('span', {}, [document.createTextNode('© '), element('span', { attributes: { 'data-year': '' } }), document.createTextNode(` ${identity.shortName || ''}`)]), element('span', { text: 'School program information portal' })])
    );
  }

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
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu?.classList.contains('open')) {
      closeMenu();
      menuButton?.focus();
    }
  });
  document.addEventListener('click', e => { if (menu?.classList.contains('open') && !e.target.closest('.command-nav')) closeMenu(); });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  renderHeader();
  renderFooter();
  renderCollections();
  renderAnnouncements();
  renderQuickLinks();
  renderCountdown();
  renderCalendar();
  renderGallery();
  menuButton?.addEventListener('click', () => menuButton.setAttribute('aria-expanded', String(menu.classList.toggle('open'))));
  menu?.addEventListener('click', event => { if (event.target.matches('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menuButton?.focus(); } });
  document.addEventListener('click', event => { if (menu?.classList.contains('open') && !event.target.closest('.command-nav')) closeMenu(); });
  document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

  function renderHeader() {
    const header = document.querySelector('[data-site-header]');
    const navigation = window.NAVIGATION || {};
    const validNav = item => item && typeof item.id === 'string' && typeof item.title === 'string' &&
      typeof item.url === 'string' && Number.isFinite(item.order) && typeof item.enabled === 'boolean';
    const navItems = name => Array.isArray(navigation[name]) ? navigation[name].filter(validNav).filter(x => x.enabled).sort((a,b) => a.order-b.order) : [];
    if (!header) return;
    const skip = make('a', 'skip-link', 'Skip to main content'); skip.href = '#main-content';
    const strip = make('div', 'status-strip');
    const stripInner = make('div', 'site-width');
    const status = make('span'); append(status, make('i'), document.createTextNode(' Unit information portal'));
    append(stripInner, status, make('span', '', config.identity?.location || '')); append(strip, stripInner);
    const nav = make('nav', 'command-nav site-width'); nav.setAttribute('aria-label', 'Primary navigation');
    const brand = make('a', 'compact-brand'); brand.href = safeUrl('index.html'); brand.setAttribute('aria-label', `${config.identity?.shortName || 'NJROTC'} home`);
    const logo = make('img'); logo.src = safeUrl(config.identity?.logo || ''); logo.alt = '';
    append(brand, logo, make('span', '', config.identity?.shortName || 'NJROTC'));
    const button = make('button', 'menu-button'); button.type = 'button'; button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'site-menu');
    append(button, make('span', 'sr-only', 'Open navigation'), make('b'), make('b'), make('b'));
    const menu = make('div', 'site-menu'); menu.id = 'site-menu';
    const addLink = item => { const a = make('a', page === item.id ? 'active' : '', item.title); a.href = safeUrl(item.url); if (page === item.id) a.setAttribute('aria-current', 'page'); return a; };
    navItems('primary').forEach(item => menu.append(addLink(item)));
    const moreItems = navItems('more');
    if (moreItems.length) { const details = make('details', 'more-menu'); const summary = make('summary', moreItems.some(x => x.id === page) ? 'active' : '', 'More'); const box = make('div'); moreItems.forEach(item => box.append(addLink(item))); append(details, summary, box); menu.append(details); }
    const toggle = make('button', 'theme-toggle'); toggle.type = 'button'; toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`); append(toggle, make('span', '', theme === 'dark' ? '☀' : '☾'));
    append(nav, brand, button, menu, toggle); append(header, skip, strip, nav);
    toggle.addEventListener('click', () => { const next = root.dataset.theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = next; localStorage.setItem('bhsnjrotc-theme', next); toggle.firstElementChild.textContent = next === 'dark' ? '☀' : '☾'; toggle.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} mode`); });
    const close = () => { menu.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); };
    button.addEventListener('click', () => { const open = menu.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); });
    menu.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    document.addEventListener('click', event => { if (menu.classList.contains('open') && !event.target.closest('.command-nav')) close(); });
  }

  function renderFooter() {
    const footer = document.querySelector('[data-site-footer]'); if (!footer) return;
    const grid = make('div', 'site-width footer-grid'); const identity = make('div'); append(identity, make('strong', '', config.identity?.fullName || ''), make('p', '', config.identity?.motto || ''));
    const nav = make('nav'); nav.setAttribute('aria-label', 'Footer navigation');
    [['Resources','pages/information-center.html'],['Wellness','pages/wellness.html'],['Contact','pages/contact.html'],['Official NJROTC site','https://www.netc.navy.mil/NSTC/NJROTC/']].forEach(([label,url]) => { const a=make('a','',label); a.href=safeUrl(url); if (url.startsWith('https:')) { a.target='_blank'; a.rel='noreferrer'; } nav.append(a); });
    append(grid, identity, nav); const legal=make('div','site-width footer-legal'); append(legal, make('span','',`© ${new Date().getFullYear()} ${config.identity?.shortName || ''}`), make('span','','School program information portal')); append(footer,grid,legal);
  }

  function renderCollections() {
    document.querySelectorAll('[data-content]').forEach(region => {
      const name = region.dataset.content; let items = records(name);
      if (name === 'schedules' || name === 'events') items = items.filter(activeByDate);
      const limit = Number(region.dataset.limit); if (Number.isInteger(limit) && limit > 0) items = items.slice(0, limit);
      if (!items.length) { append(region, make('p', 'review-note', 'No verified information is currently published.')); return; }
      items.forEach((item, index) => {
        if (name === 'faqs') { const details=make('details'); append(details, make('summary','',item.title), make('p','',item.description)); region.append(details); return; }
        if (name === 'resources') { const a=make('a','resource-link'); a.href=safeUrl(item.url); if (item.url.startsWith('https:')) {a.target='_blank';a.rel='noreferrer';} append(a, make('strong','',item.title), make('span','',item.url.startsWith('https:')?'↗':'→')); region.append(a); return; }
        const linked = region.dataset.variant === 'summary' && safeUrl(item.url);
        const card=make(linked ? 'a' : 'article', linked ? 'nav-card' : 'content-card'); if (linked) card.href=safeUrl(item.url);
        append(card, make('span','interface-label',item.category), region.dataset.variant === 'summary' ? make('b','',String(index+1).padStart(2,'0')) : null, make(region.dataset.variant === 'summary'?'h3':'h2','',item.title), make('p','',item.description)); region.append(card);
      });
    });
  }

  function renderQuickLinks() { document.querySelectorAll('[data-quick-links]').forEach(region => { const links=Array.isArray(config.quickLinks)?config.quickLinks:[]; links.filter(x=>x&&typeof x.label==='string'&&typeof x.href==='string'&&typeof x.description==='string').forEach((item,index)=>{const a=make('a','nav-card');a.href=safeUrl(item.href);append(a,make('small','','Quick access'),make('b','',String(index+1).padStart(2,'0')),make('h3','',item.label),make('p','',item.description));region.append(a);}); }); }
  function renderAnnouncements() { document.querySelectorAll('[data-announcements]').forEach(region => { const items=Array.isArray(window.ANNOUNCEMENTS)?window.ANNOUNCEMENTS:[]; items.filter(x=>x&&typeof x.title==='string'&&typeof x.message==='string'&&['normal','important','urgent'].includes(x.level)&&x.enabled===true&&activeByDate(x)).forEach(item=>{const article=make('article',`announcement ${item.level}`);article.setAttribute('role',item.level==='urgent'?'alert':'status');const copy=make('div');append(copy,make('h2','',item.title),make('p','',item.message));append(article,make('span','notice-level',`${item.level} notice`),copy);const href=safeUrl(item.link);if(href){const a=make('a','','Learn more →');a.href=href;article.append(a);}region.append(article);}); }); }
  function renderCountdown() { const region=document.querySelector('[data-countdown]');if(!region)return;const event=config.featuredEvent||{};if(!event.enabled||typeof event.target!=='string'||Number.isNaN(new Date(event.target).getTime())){const box=make('div','countdown-empty');append(box,make('span','interface-label','Featured event'),make('h2','','Next milestone awaiting confirmation'),make('p','','The unit webmaster can publish a verified countdown from the central configuration file.'));region.append(box);return;}const copy=make('div','countdown-copy');append(copy,make('span','interface-label','Featured event'),make('h2','',String(event.name||'')),make('p','',String(event.subtitle||'')));const units=make('div','countdown-units');units.setAttribute('aria-live','polite');['days','hours','minutes','seconds'].forEach(u=>{const box=make('div');const strong=make('strong','','00');strong.dataset.unit=u;append(box,strong,make('span','',u));units.append(box);});append(region,copy,units);const update=()=>{const d=Math.max(0,new Date(event.target).getTime()-Date.now());const values={days:Math.floor(d/86400000),hours:Math.floor(d/3600000)%24,minutes:Math.floor(d/60000)%60,seconds:Math.floor(d/1000)%60};Object.entries(values).forEach(([u,v])=>{region.querySelector(`[data-unit="${u}"]`).textContent=String(v).padStart(2,'0');});};update();setInterval(update,1000); }
  function renderCalendar() { const region=document.querySelector('[data-calendar]');if(!region)return;const url=typeof config.calendar?.embedUrl==='string'&&/^https:\/\/(calendar\.google\.com|www\.google\.com)\//.test(config.calendar.embedUrl)?config.calendar.embedUrl:'';if(!url){const box=make('div','calendar-empty');append(box,make('span','','▦'),make('h3','','Calendar connection pending'),make('p','',"Add the unit's verified public Google Calendar embed URL in data/site-config.js."));region.append(box);return;}const frame=make('iframe');frame.title='Bethel NJROTC calendar';frame.src=url;frame.loading='lazy';region.append(frame); }
  function renderGallery() { const grid=document.querySelector('[data-gallery]');if(!grid)return;const items=Array.isArray(window.GALLERY_ITEMS)?window.GALLERY_ITEMS.filter(x=>x&&typeof x.src==='string'&&typeof x.alt==='string'&&(!x.caption||typeof x.caption==='string')):[];if(!items.length){const box=make('div','gallery-empty');append(box,make('h2','','Unit photography coming soon'),make('p','','Verified photographs can be added without changing this page layout.'));grid.append(box);return;}const dialog=document.querySelector('#gallery-dialog');let current=0;const show=i=>{current=(i+items.length)%items.length;const img=dialog.querySelector('img');img.src=safeUrl(items[current].src);img.alt=items[current].alt;dialog.querySelector('p').textContent=items[current].caption||items[current].alt;};items.forEach((item,i)=>{const button=make('button','gallery-card');button.type='button';button.dataset.galleryIndex=i;const img=make('img');img.src=safeUrl(item.src);img.alt=item.alt;img.loading='lazy';append(button,img,make('span','',item.caption||item.alt));grid.append(button);});grid.addEventListener('click',e=>{const button=e.target.closest('[data-gallery-index]');if(button&&dialog){show(Number(button.dataset.galleryIndex));dialog.showModal();}});dialog?.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-close]'))dialog.close();if(e.target.closest('[data-prev]'))show(current-1);if(e.target.closest('[data-next]'))show(current+1);}); }
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
      const cards = (config.quickLinks || []).map((item, index) => {
        const card = safeLink('', item.href, { className: 'nav-card' });
        if (!card) return null;
        card.append(element('small', { text: 'Quick access' }), element('b', { text: String(index + 1).padStart(2, '0') }), element('h3', { text: item.label }), element('p', { text: item.description }));
        return card;
      });
      region.replaceChildren(...cards.filter(Boolean));
    });
  }

  function renderAnnouncements() {
    document.querySelectorAll('[data-announcements]').forEach(region => {
      const notices = activeAnnouncements().map(item => {
        const level = ['normal', 'important', 'urgent'].includes(item.level) ? item.level : 'normal';
        const article = element('article', { className: `announcement ${level}`, attributes: { role: level === 'urgent' ? 'alert' : 'status' } }, [
          element('span', { className: 'notice-level', text: `${level} notice` }),
          element('div', {}, [element('h2', { text: item.title }), element('p', { text: item.message })])
        ]);
        const moreLink = item.link && safeLink('Learn more →', item.link);
        if (moreLink) article.append(moreLink);
        return article;
      });
      region.replaceChildren(...notices);
    });
  }

  function renderCountdown() {
    const region = document.querySelector('[data-countdown]');
    if (!region) return;
    const event = config.featuredEvent || {};
    if (!event.enabled || !event.target || Number.isNaN(new Date(event.target).getTime())) {
      region.replaceChildren(element('div', { className: 'countdown-empty' }, [element('span', { className: 'interface-label', text: 'Featured event' }), element('h2', { text: 'Next milestone awaiting confirmation' }), element('p', { text: 'The unit webmaster can publish a verified countdown from the central configuration file.' })]));
      return;
    }
    const copy = element('div', { className: 'countdown-copy' }, [element('span', { className: 'interface-label', text: 'Featured event' }), element('h2', { text: event.name }), element('p', { text: event.subtitle })]);
    if (event.location) copy.append(element('small', { text: event.location }));
    const units = element('div', { className: 'countdown-units', attributes: { 'aria-live': 'polite' } });
    ['days', 'hours', 'minutes', 'seconds'].forEach(unit => units.append(element('div', {}, [element('strong', { text: '00', attributes: { 'data-unit': unit } }), element('span', { text: unit })])));
    region.replaceChildren(copy, units);
    const update = () => {
      const distance = Math.max(0, new Date(event.target).getTime() - Date.now());
      const values = { days: Math.floor(distance / 86400000), hours: Math.floor(distance / 3600000) % 24, minutes: Math.floor(distance / 60000) % 60, seconds: Math.floor(distance / 1000) % 60 };
      Object.entries(values).forEach(([unit, value]) => { region.querySelector(`[data-unit="${unit}"]`).textContent = String(value).padStart(2, '0'); });
      if (!distance) copy.querySelector('p').textContent = 'This event has started or concluded.';
    };
    update(); setInterval(update, 1000);
  }

  function renderCalendar() {
    const region = document.querySelector('[data-calendar]');
    if (!region) return;
    const embedUrl = validatedUrl(config.calendar?.embedUrl, 'calendar');
    if (!embedUrl) {
      const message = element('p', { text: "Add the unit's verified public Google Calendar embed URL in " });
      message.append(element('code', { text: 'data/site-config.js' }), document.createTextNode('.'));
      region.replaceChildren(element('div', { className: 'calendar-empty' }, [element('span', { text: '▦', attributes: { 'aria-hidden': 'true' } }), element('h3', { text: 'Calendar connection pending' }), message]));
      return;
    }
    const frame = element('iframe', { attributes: { title: 'Bethel NJROTC calendar', loading: 'lazy' } });
    frame.src = embedUrl;
    region.replaceChildren(frame);
  }

  function renderGallery() {
    const grid = document.querySelector('[data-gallery]');
    if (!grid) return;

    const isLocalSource = src => typeof src === 'string'
      && src.trim().length > 0
      && !/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(src.trim())
      && !/[\u0000-\u001f<>"'`]/.test(src);
    const items = (Array.isArray(window.GALLERY_ITEMS) ? window.GALLERY_ITEMS : []).filter(item =>
      item && isLocalSource(item.src) && typeof item.alt === 'string' && item.alt.trim().length > 0
    ).map(item => ({
      src: item.src.trim(),
      alt: item.alt.trim(),
      caption: typeof item.caption === 'string' && item.caption.trim() ? item.caption.trim() : item.alt.trim()
    }));

    const showEmptyState = () => {
      const empty = document.createElement('div');
      empty.className = 'gallery-empty';
      const heading = document.createElement('h2');
      heading.textContent = 'Unit photography coming soon';
      const copy = document.createElement('p');
      copy.textContent = 'Verified photographs can be added without changing this page layout.';
      empty.append(heading, copy);
      grid.replaceChildren(empty);
    };
    if (!items.length) { showEmptyState(); return; }

    const items = (window.GALLERY_ITEMS || []).filter(item => validatedUrl(`${base}${item.src || ''}`));
    if (!items.length) {
      grid.replaceChildren(element('div', { className: 'gallery-empty' }, [element('h2', { text: 'Unit photography coming soon' }), element('p', { text: 'Verified photographs can be added without changing this page layout.' })]));
      return;
    }
    const cards = items.map((item, index) => {
      const image = element('img', { attributes: { alt: item.alt || '', loading: 'lazy' } });
      image.src = validatedUrl(`${base}${item.src}`);
      return element('button', { className: 'gallery-card', attributes: { type: 'button', 'data-gallery-index': index } }, [image, element('span', { text: item.caption || item.alt || '' })]);
    });
    grid.replaceChildren(...cards);
    const dialog = document.querySelector('#gallery-dialog');
    const dialogImage = dialog?.querySelector('img');
    const dialogCaption = dialog?.querySelector('p');
    const previousControl = dialog?.querySelector('[data-prev]');
    const closeControl = dialog?.querySelector('[data-close]');
    const nextControl = dialog?.querySelector('[data-next]');
    const dialogReady = dialog && dialogImage && dialogCaption && previousControl && closeControl && nextControl
      && typeof dialog.showModal === 'function' && typeof dialog.close === 'function';

    const makeImage = item => {
      const image = document.createElement('img');
      image.src = `${base}${item.src}`;
      image.alt = item.alt;
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        image.hidden = true;
        const unavailable = document.createElement('span');
        unavailable.className = 'gallery-image-error';
        unavailable.setAttribute('role', 'status');
        unavailable.textContent = 'Photograph unavailable';
        image.parentNode?.insertBefore(unavailable, image.nextSibling);
      }, { once: true });
      return image;
    };

    grid.replaceChildren();
    items.forEach((item, index) => {
      const card = document.createElement(dialogReady ? 'button' : 'figure');
      card.className = dialogReady ? 'gallery-card' : 'gallery-figure';
      if (dialogReady) {
        card.type = 'button';
        card.dataset.galleryIndex = String(index);
        card.setAttribute('aria-label', `View photograph: ${item.alt}`);
      }
      const caption = document.createElement(dialogReady ? 'span' : 'figcaption');
      caption.textContent = item.caption;
      card.append(makeImage(item), caption);
      grid.append(card);
    });
    if (!dialogReady) return;

    let current = 0;
    let opener = null;
    const show = index => {
      current = (index + items.length) % items.length;
      dialogImage.hidden = true;
      dialogImage.src = `${base}${items[current].src}`;
      dialogImage.alt = items[current].alt;
      dialogCaption.textContent = items[current].caption;
    };
    dialogImage.addEventListener('load', () => {
      dialogImage.hidden = false;
      dialogCaption.textContent = items[current].caption;
    });
    dialogImage.addEventListener('error', () => {
      dialogImage.hidden = true;
      dialogCaption.textContent = `Photograph unavailable. ${items[current].caption}`;
    });
    grid.addEventListener('click', e => {
      const button = e.target.closest?.('[data-gallery-index]');
      if (!button) return;
      opener = button;
      show(Number(button.dataset.galleryIndex));
      dialog.showModal();
    });
    previousControl.addEventListener('click', () => show(current - 1));
    nextControl.addEventListener('click', () => show(current + 1));
    closeControl.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    dialog.addEventListener('close', () => {
      opener?.focus();
      opener = null;
    });
    const show = index => {
      current = (index + items.length) % items.length;
      const image = dialog.querySelector('img');
      image.src = validatedUrl(`${base}${items[current].src}`);
      image.alt = String(items[current].alt || '');
      dialog.querySelector('p').textContent = String(items[current].caption || items[current].alt || '');
    };
    grid.addEventListener('click', event => { const button = event.target.closest('[data-gallery-index]'); if (button && dialog) { show(Number(button.dataset.galleryIndex)); dialog.showModal(); } });
    dialog?.addEventListener('click', event => { if (event.target === dialog || event.target.closest('[data-close]')) dialog.close(); if (event.target.closest('[data-prev]')) show(current - 1); if (event.target.closest('[data-next]')) show(current + 1); });
    dialog?.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') show(current - 1); if (event.key === 'ArrowRight') show(current + 1); });
  }

  // Future team and FAQ data use exactly the same text-only rendering contract.
  function renderTeams() {
    document.querySelectorAll('[data-teams]').forEach(region => region.replaceChildren(...(window.TEAMS || []).map(team => element('article', { className: 'content-card' }, [element('h2', { text: team.name }), element('p', { text: team.description })]))));
  }
  function renderFaqs() {
    document.querySelectorAll('[data-faqs]').forEach(region => region.replaceChildren(...(window.FAQS || []).map(faq => element('details', {}, [element('summary', { text: faq.question }), element('p', { text: faq.answer })]))));
  }

  renderAnnouncements();
  renderQuickLinks();
  renderCountdown();
  renderCalendar();
  renderGallery();
  renderTeams();
  renderFaqs();
})();
