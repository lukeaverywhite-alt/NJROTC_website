/** The single source of truth for desktop and mobile navigation. */
window.NAVIGATION = [
  { id: 'home', title: 'Home', url: 'index.html', order: 10, enabled: true },
  { id: 'about', title: 'About', order: 20, enabled: true, children: [
    { id: 'faq', title: 'Program Overview & FAQ', url: 'pages/faq.html', order: 10, enabled: true },
    { id: 'teams', title: 'Teams & Activities', url: 'pages/teams.html', order: 20, enabled: true },
    { id: 'gallery', title: 'Gallery', url: 'pages/gallery.html', order: 30, enabled: true }
  ] },
  { id: 'resources', title: 'Cadet Resources', order: 30, enabled: true, children: [
    { id: 'calendar', title: 'Calendar', url: 'pages/calendar.html', order: 10, enabled: true },
    { id: 'pow', title: 'Plan of the Week', url: 'pages/plan-of-week.html', order: 20, enabled: true },
    { id: 'chain', title: 'Chain of Command', url: 'pages/chain-of-command.html', order: 30, enabled: true },
    { id: 'training', title: 'Cadet Creed & Qualifications', url: 'pages/training.html', order: 40, enabled: true },
    { id: 'blt', title: 'Basic Leadership Training', url: 'pages/basic-leadership-training.html', order: 50, enabled: true },
    { id: 'weather', title: 'Weather', url: 'pages/weather.html', order: 60, enabled: true },
    { id: 'wellness', title: 'Wellness', url: 'pages/wellness.html', order: 70, enabled: true },
    { id: 'info', title: 'Information Center', url: 'pages/information-center.html', order: 80, enabled: true },
    { id: 'navy', title: 'Official Navy NJROTC website', url: 'https://www.netc.navy.mil/NSTC/NJROTC/', order: 90, enabled: true },
    { id: 'schools', title: 'Bethel Public Schools', url: 'https://www.bethel.k12.ct.us/', order: 100, enabled: true }
  ] },
  { id: 'events', title: 'Events', order: 40, enabled: true, children: [
    { id: 'ball', title: 'Military Ball', url: 'pages/military-ball.html', order: 10, enabled: true }
  ] },
  { id: 'contact', title: 'Contact', url: 'pages/contact.html', order: 50, enabled: true }
];
