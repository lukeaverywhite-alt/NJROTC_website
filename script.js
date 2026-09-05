(() => {
  'use strict';
  const root = document.documentElement;
  const base = document.body.dataset.base || '';
  const page = document.body.dataset.page || 'home';
  const config = window.SITE_CONFIG || {};
  const content = window.SITE_CONTENT || {};
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

  renderHeader();
  renderFooter();
  renderCollections();
  renderAnnouncements();
  renderQuickLinks();
  renderCountdown();
  renderCalendar();
  renderGallery();

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
})();
