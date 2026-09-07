/** The single source of truth for desktop and mobile navigation. */
window.NAVIGATION = [
  { id: 'home', title: 'Home', url: 'index.html', order: 10, enabled: true },
  { id: 'cadets', title: 'Cadet Hub', order: 20, enabled: true, children: [
    { id: 'pow', title: 'Plan of the Week', url: 'pages/plan-of-week.html', order: 10, enabled: true },
    { id: 'calendar', title: 'Calendar', url: 'pages/calendar.html', order: 20, enabled: true },
    { id: 'info', title: 'All Cadet Resources', url: 'pages/information-center.html', order: 30, enabled: true },
    { id: 'training', title: 'Creed & Qualifications', url: 'pages/training.html', order: 40, enabled: true },
    { id: 'cadet-reference-manual', title: 'Cadet Reference Manual', url: 'pages/cadet-reference-manual.html', order: 50, enabled: true },
    { id: 'weather', title: 'Weather', url: 'pages/weather.html', order: 60, enabled: true },
    { id: 'wellness', title: 'Wellness', url: 'pages/wellness.html', order: 70, enabled: true }
  ] },
  { id: 'explore', title: 'Explore', order: 30, enabled: true, children: [
    { id: 'faq', title: 'Program Overview & FAQ', url: 'pages/faq.html', order: 10, enabled: true },
    { id: 'teams', title: 'Teams & Activities', url: 'pages/teams.html', order: 20, enabled: true },
    { id: 'chain', title: 'Leadership & Organization', url: 'pages/chain-of-command.html', order: 30, enabled: true },
    { id: 'blt', title: 'Basic Leadership Training', url: 'pages/basic-leadership-training.html', order: 40, enabled: true },
    { id: 'gallery', title: 'Gallery', url: 'pages/gallery.html', order: 50, enabled: true }
  ] },
  { id: 'events', title: 'Events', order: 40, enabled: true, children: [
    { id: 'all-events', title: 'Events Command Center', url: 'pages/events.html', order: 10, enabled: true },
    { id: 'ball', title: 'Military Ball', url: 'pages/military-ball.html', order: 20, enabled: true }
  ] },
  { id: 'contact', title: 'Contact', url: 'pages/contact.html', order: 50, enabled: true }
];
