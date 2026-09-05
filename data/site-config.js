/**
 * Frequently edited site settings. Keep URLs relative so GitHub project Pages works.
 * Replace placeholder values only with verified unit information.
 */
window.SITE_CONFIG = {
  identity: {
    shortName: 'Bethel NJROTC',
    fullName: 'Bethel High School NJROTC',
    location: 'Bethel, Connecticut',
    motto: 'Citizenship · Leadership · Service',
    logo: 'assets/unit-mark.svg'
  },
  featuredEvent: {
    enabled: false,
    // EDIT THESE VALUES only after a real event is confirmed. ISO date example: 2027-05-20T18:00:00-04:00
    name: 'Featured unit event',
    target: '',
    subtitle: 'Event details will be posted after unit confirmation.',
    location: ''
  },
  weather: {
    // Bethel, Connecticut community coordinates. Verify/update to the unit's preferred fixed location.
    name: 'Bethel, Connecticut',
    latitude: 41.3712,
    longitude: -73.4140,
    timezone: 'America/New_York'
  },
  calendar: {
    // Paste the verified public Google Calendar EMBED URL here; never paste a private calendar URL.
    embedUrl: ''
  },
  contact: {
    // Add verified official school/unit contact details here. Do not add cadet personal information.
    email: '',
    phone: '',
    address: ''
  },
  quickLinks: [
    { label: 'Plan of the Week', href: 'pages/plan-of-week.html', description: 'Weekly schedule and uniform guidance' },
    { label: 'Chain of Command', href: 'pages/chain-of-command.html', description: 'Unit leadership structure' },
    { label: 'Information Center', href: 'pages/information-center.html', description: 'Cadet references and resources' },
    { label: 'Live Weather', href: 'pages/weather.html', description: 'Current conditions for Bethel' }
  ]
};
