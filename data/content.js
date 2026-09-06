/**
 * Webmaster-managed collections. Keep IDs stable, URLs root-relative-to-site,
 * dates in YYYY-MM-DD, and verifiedOn current when facts are reviewed.
 */
window.SITE_CONTENT = {
  teams: [
    { id: 'drill', title: 'Drill & Ceremony', description: 'Develop precision, discipline, and teamwork through armed and unarmed drill.', url: 'pages/drill-and-ceremony.html', category: 'Precision', order: 10, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'fitness', title: 'Athletics & Fitness', description: 'Build healthy habits and resilience through inclusive physical challenges.', url: 'pages/athletics-and-fitness.html', category: 'Readiness', order: 20, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'academics', title: 'Academic Teams', description: 'Put classroom knowledge to work in collaborative, fast-paced competitions.', url: 'pages/academic-teams.html', category: 'Knowledge', order: 30, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'service', title: 'Community Service', description: 'Make a meaningful difference through projects in Bethel and nearby communities.', url: 'pages/community-service.html', category: 'Citizenship', order: 40, enabled: true, verifiedOn: '2026-09-05' }
  ],
  drillPrograms: [
    { id: 'color-guard', title: 'Color Guard', description: 'Represent the unit with dignity, precision, and respect for the colors at ceremonies and events.', url: 'pages/color-guard.html', category: 'Ceremonial drill', order: 10, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'drill-team', title: 'Drill Team', description: 'Build teamwork, leadership, command presence, and precision through coordinated competition drill.', url: 'pages/drill-team.html', category: 'Competition drill', order: 20, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'unarmed-drill', title: 'Unarmed Drill', description: 'Practice regulation formations, marching, facing movements, cadence, alignment, and commands without rifles.', url: 'pages/unarmed-drill.html', category: 'Regulation drill', order: 30, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'armed-drill', title: 'Armed Drill', description: 'Perform regulation drill and approved manual-of-arms movements with the unit’s demilitarized drill rifles.', url: 'pages/armed-drill.html', category: 'Regulation drill', order: 40, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'unarmed-exhibition', title: 'Unarmed Exhibition', description: 'Perform original commander-developed routines emphasizing creativity and synchronized execution without rifles.', url: 'pages/unarmed-exhibition.html', category: 'Exhibition drill', order: 50, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'armed-exhibition', title: 'Armed Exhibition', description: 'Combine precision, creativity, and safe rifle handling in original routines governed by competition rules.', url: 'pages/armed-exhibition.html', category: 'Exhibition drill', order: 60, enabled: true, verifiedOn: '2026-09-05' }
  ],
  faqs: [
    { id: 'service-obligation', title: 'Does joining NJROTC create a military service obligation?', description: 'No. NJROTC is a citizenship and leadership program and participation does not create a military service obligation.', category: 'Joining', order: 10, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'activities', title: 'What activities are represented on this website?', description: 'The current unit content identifies drill and ceremony, athletics and fitness, academic teams, and community service.', category: 'Activities', order: 20, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'weekly-schedule', title: 'Where can I find the weekly schedule?', description: 'Use the Plan of the Week page. Current details appear there after the unit webmaster publishes an approved plan.', url: 'pages/plan-of-week.html', category: 'Schedules', order: 30, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'how-to-join', title: 'How can I learn about joining?', description: 'Talk with your school counselor or visit the NJROTC classroom. Verified official contact details are published on the Contact page.', url: 'pages/contact.html', category: 'Joining', order: 40, enabled: true, verifiedOn: '2026-09-05' }
  ],
  resources: [
    { id: 'training', title: 'Cadet Creed & Qualifications', description: 'Approved training and advancement materials.', url: 'pages/training.html', category: 'Cadet development', order: 10, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'blt', title: 'Basic Leadership Training', description: 'Leadership training information and approved resources.', url: 'pages/basic-leadership-training.html', category: 'Cadet development', order: 20, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'chain', title: 'Chain of Command', description: 'Unit leadership structure and roles.', url: 'pages/chain-of-command.html', category: 'Cadet development', order: 30, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'pow', title: 'Plan of the Week', description: 'Weekly schedule, uniforms, and reminders.', url: 'pages/plan-of-week.html', category: 'Unit information', order: 40, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'faq', title: 'Frequently Asked Questions', description: 'Answers for cadets and families.', url: 'pages/faq.html', category: 'Unit information', order: 50, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'navy-njrotc', title: 'Official Navy NJROTC website', description: 'Official program reference.', url: 'https://www.netc.navy.mil/NSTC/NJROTC/', category: 'Official reference', order: 60, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'bethel-schools', title: 'Bethel Public Schools', description: 'Official school district website.', url: 'https://www.bethel.k12.ct.us/', category: 'Official reference', order: 70, enabled: true, verifiedOn: '2026-09-05' }
  ],
  joining: [
    { id: 'counselor', title: 'Talk with your school counselor', description: 'Ask your counselor how NJROTC fits into your course plan.', category: 'First steps', order: 10, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'classroom', title: 'Visit the NJROTC classroom', description: 'Meet the unit and ask questions about participation.', category: 'First steps', order: 20, enabled: true, verifiedOn: '2026-09-05' }
  ],
  leadership: [
    { id: 'instructors', title: 'Unit instructors', description: 'Verified instructor names, ranks, and official biographies can be added by the webmaster.', category: 'Instruction', order: 10, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'command-staff', title: 'Command staff', description: 'Current cadet staff information is published only after unit approval.', category: 'Cadet leadership', order: 20, enabled: true, verifiedOn: '2026-09-05' },
    { id: 'departments', title: 'Departments', description: 'Approved billets and departmental responsibilities are arranged in hierarchy order.', category: 'Organization', order: 30, enabled: true, verifiedOn: '2026-09-05' }
  ],
  schedules: [
    { id: 'monday', title: 'Monday', description: 'Schedule not published.', category: 'Daily brief', order: 10, enabled: true, startDate: '', endDate: '', verifiedOn: '2026-09-05' },
    { id: 'tuesday', title: 'Tuesday', description: 'Schedule not published.', category: 'Daily brief', order: 20, enabled: true, startDate: '', endDate: '', verifiedOn: '2026-09-05' },
    { id: 'wednesday', title: 'Wednesday', description: 'Schedule not published.', category: 'Daily brief', order: 30, enabled: true, startDate: '', endDate: '', verifiedOn: '2026-09-05' },
    { id: 'thursday-friday', title: 'Thursday / Friday', description: 'Schedule not published.', category: 'Daily brief', order: 40, enabled: true, startDate: '', endDate: '', verifiedOn: '2026-09-05' }
  ],
  events: [
    { id: 'military-ball', title: 'Military Ball', description: 'Date, venue, tickets, schedule, and dress guidance await unit confirmation.', url: 'pages/military-ball.html', category: 'Special event', order: 10, enabled: true, startDate: '', endDate: '', verifiedOn: '2026-09-05' }
  ]
};
