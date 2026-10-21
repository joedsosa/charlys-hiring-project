/*
 * Mock data for the demo. Every company, person and number here is invented.
 * MOCK.build() returns a fresh, deterministic dataset (same output on every reset).
 */
(function () {
  const DAY = 24 * 60 * 60 * 1000;

  // Pipeline stages. Each position picks the subset it uses (see Settings in the admin).
  const STAGES = [
    { id: 'applied', label: 'Applied' },
    { id: 'screened', label: 'AI Screened' },
    { id: 'roleplay', label: 'Role play' },
    { id: 'interview', label: 'Interview' },
    { id: 'approved', label: 'Approved', terminal: true },
    { id: 'declined', label: 'Declined', terminal: true },
  ];

  // Fictional sample companies (the classic placeholder names used in software demos).
  const CLIENTS = [
    { id: 'cl-northwind', name: 'Northwind Retail', industry: 'Retail' },
    { id: 'cl-contoso', name: 'Contoso Logistics', industry: 'Logistics' },
    { id: 'cl-fabrikam', name: 'Fabrikam Services', industry: 'Customer service' },
  ];

  const SOURCES = ['Job boards', 'Social media', 'Referral', 'Career site', 'Virtual job fair', 'Talent pool'];

  // Every role is remote. Regions say where candidates may live; schedules say which hours they cover.
  const REGIONS = ['Remote (US)', 'Remote (Americas)'];
  const TIMEZONES = ['Eastern (ET)', 'Central (CT)', 'Mountain (MT)', 'Pacific (PT)'];

  const ROLEPLAY_PROMPTS = {
    support: 'A customer on a video call is upset because their order arrived damaged. How do you respond?',
    sales: 'A prospect on a call says your product is too expensive. What do you tell them?',
    techsupport: 'A frustrated customer cannot log in to their account and you can only help over chat. How do you guide them?',
    dispatch: 'A delivery is running late, the customer is calling, and you can only reach the driver by messages. What do you do?',
    assistant: 'Your manager, two time zones away, sends you three urgent tasks on the team chat at once. How do you prioritize and communicate?',
  };

  const POSITIONS = [
    {
      id: 'pos-csr', clientId: 'cl-fabrikam', title: 'Bilingual Customer Support Representative',
      category: 'Customer support', location: 'Remote (US)', type: 'Full time',
      schedule: 'Mon to Fri, 9:00 am to 5:30 pm CT', headcount: 25, pay: '$18 to $20/hr',
      requirements: ['English (fluent)', 'Spanish (conversational)', 'Customer service', 'CRM tools', 'Stable internet (25+ Mbps)'],
      description: 'Answer inbound calls and chats from home, resolve order issues and keep customers happy.',
      roleplay: 'support', daysAgo: 45,
    },
    {
      id: 'pos-sales', clientId: 'cl-fabrikam', title: 'Inbound Sales Agent',
      category: 'Sales', location: 'Remote (US)', type: 'Full time',
      schedule: 'Mon to Fri, 10:00 am to 6:30 pm ET', headcount: 12, pay: '$17/hr + commission',
      requirements: ['English (fluent)', 'Sales experience', 'CRM tools', 'Objection handling', 'Quiet home office'],
      description: 'Turn inbound leads into customers over phone and video calls.',
      roleplay: 'sales', daysAgo: 40,
    },
    {
      id: 'pos-tech', clientId: 'cl-contoso', title: 'Technical Support Specialist (Tier 1)',
      category: 'IT support', location: 'Remote (US)', type: 'Full time',
      schedule: 'Rotating shifts, 24/7 coverage', headcount: 15, pay: '$19 to $22/hr',
      requirements: ['Troubleshooting', 'Ticketing systems', 'English (fluent)', 'Typing 40+ wpm', 'Own computer'],
      description: 'Help customers solve login, setup and connectivity issues through chat, email and phone.',
      roleplay: 'techsupport', daysAgo: 35,
    },
    {
      id: 'pos-dispatch', clientId: 'cl-contoso', title: 'Remote Dispatch Coordinator',
      category: 'Operations', location: 'Remote (Americas)', type: 'Full time',
      schedule: 'Mon to Sat, 7:00 am to 3:30 pm CT', headcount: 10, pay: '$17 to $19/hr',
      requirements: ['Route planning', 'Customer service', 'Time management', 'Multitasking', 'Stable internet (25+ Mbps)'],
      description: 'Coordinate drivers and deliveries in real time from a home office.',
      roleplay: 'dispatch', daysAgo: 30,
    },
    {
      id: 'pos-chat', clientId: 'cl-northwind', title: 'Ecommerce Chat Support Agent',
      category: 'Customer support', location: 'Remote (Americas)', type: 'Part time',
      schedule: 'Weekends + 2 evenings, ET hours', headcount: 30, pay: '$15 to $17/hr',
      requirements: ['English (fluent)', 'Written communication', 'Customer service', 'Typing 50+ wpm', 'Own computer'],
      description: 'Answer online shoppers through live chat and email for a growing online store.',
      roleplay: 'support', daysAgo: 25,
    },
    {
      id: 'pos-appt', clientId: 'cl-northwind', title: 'Appointment Setter',
      category: 'Sales', location: 'Remote (US)', type: 'Full time',
      schedule: 'Mon to Fri, 9:00 am to 5:00 pm PT', headcount: 8, pay: '$16/hr + bonus',
      requirements: ['English (fluent)', 'Cold calling', 'CRM tools', 'Goal oriented', 'Quiet home office'],
      description: 'Call warm leads and book meetings for the sales team.',
      roleplay: 'sales', daysAgo: 20,
    },
    {
      id: 'pos-data', clientId: 'cl-fabrikam', title: 'Data Entry Specialist',
      category: 'Administrative', location: 'Remote (Americas)', type: 'Contract',
      schedule: 'Flexible, 30 h/week', headcount: 10, pay: '$15/hr',
      requirements: ['Typing 50+ wpm', 'Excel', 'Attention to detail', 'Data privacy', 'Own computer'],
      description: 'Enter and verify records accurately for a remote back-office team.',
      roleplay: 'assistant', daysAgo: 18,
    },
    {
      id: 'pos-va', clientId: 'cl-northwind', title: 'Virtual Assistant',
      category: 'Administrative', location: 'Remote (Americas)', type: 'Full time',
      schedule: 'Mon to Fri, 8:00 am to 4:30 pm ET', headcount: 6, pay: '$16 to $18/hr',
      requirements: ['English (fluent)', 'Calendar management', 'Google Workspace', 'Written communication', 'Time management'],
      description: 'Support managers with email, scheduling, research and documents.',
      roleplay: 'assistant', daysAgo: 15,
    },
  ];

  const NAMES = [
    'Maria Hernandez', 'James Carter', 'Aisha Thompson', 'Luis Ramirez', 'Emily Nguyen',
    'Daniel Brooks', 'Sofia Martinez', 'Kevin Patel', 'Jasmine Williams', 'Carlos Mendoza',
    'Hannah Kim', 'Marcus Johnson', 'Valeria Torres', 'Tyler Anderson', 'Priya Shah',
    'Andre Robinson', 'Gabriela Flores', 'Ryan Mitchell', 'Keisha Davis', 'Diego Castillo',
    'Olivia Bennett', 'Jamal Washington', 'Camila Reyes', 'Brandon Lee', 'Natalie Cruz',
    'Isaiah Green', 'Lucia Morales', 'Ethan Walker', 'Destiny Harris', 'Javier Ortiz',
    'Chloe Adams', 'Malik Jackson', 'Ana Gutierrez', 'Logan Scott', 'Mei Chen',
    'Jordan Price', 'Paola Vargas', 'Trevor Collins', 'Imani Wright', 'Rafael Soto',
  ];

  const US_CITIES = ['San Antonio, TX', 'Miami, FL', 'Chicago, IL', 'Denver, CO', 'Charlotte, NC', 'Phoenix, AZ', 'Columbus, OH', 'Sacramento, CA'];
  const AMERICAS_CITIES = US_CITIES.concat(['Mexico City, Mexico', 'Bogotá, Colombia', 'San Pedro Sula, Honduras', 'San José, Costa Rica', 'Santo Domingo, Dominican Republic']);

  const ROLEPLAY_ANSWERS = [
    'First I would listen and apologize for the trouble. I understand how frustrating it is. Then I would confirm the details, offer a replacement or refund right away, and follow up by email so they know the solution is on its way.',
    'I would stay calm, thank them for telling me, and ask questions to understand the problem. I would explain the options we have and agree on a solution together, then make sure it is resolved.',
    'I would apologize and tell them I will check with my supervisor to find a solution.',
    'I would listen to the customer, understand what happened, and offer to fix it as soon as possible. I would keep a positive attitude.',
    'Tell them sorry and send a new one.',
    'I would acknowledge the concern, explain the value and the benefits they get, and offer options that fit their budget. Then I would ask if they have any other questions before closing.',
    'I would message the driver for an updated estimate, call the customer back to apologize and give a clear time, and log everything in the system so the team knows. If it keeps slipping, I would offer a new delivery window.',
    'I would acknowledge each request quickly so my manager knows I saw them, check deadlines to prioritize, confirm the order with a short message, and send an update as each task is done.',
  ];

  // Deterministic pseudo-random generator so every reset yields the same dataset.
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function build(now) {
    now = now || Date.now();
    const rand = rng(2026);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];

    const positions = POSITIONS.map((p) => ({
      id: p.id, clientId: p.clientId, title: p.title, category: p.category, location: p.location,
      type: p.type, schedule: p.schedule, headcount: p.headcount, pay: p.pay,
      requirements: p.requirements.slice(), description: p.description,
      roleplayPrompt: ROLEPLAY_PROMPTS[p.roleplay],
      stages: ['applied', 'screened', 'roleplay', 'interview', 'approved', 'declined'],
      weights: { cv: 0.4, communication: 0.35, roleplay: 0.25 },
      status: 'open',
      createdAt: now - p.daysAgo * DAY,
    }));

    // Stage outcome mix for the seeded candidates (weighted towards early stages).
    // No seeded candidate sits in "Applied": that column is reserved for live demo applications.
    const STAGE_MIX = ['screened', 'screened', 'screened', 'roleplay', 'roleplay', 'interview', 'interview', 'approved', 'approved', 'approved', 'declined', 'declined'];
    const ORDER = ['applied', 'screened', 'roleplay', 'interview'];

    const candidates = NAMES.map((name, i) => {
      const position = positions[i % positions.length];
        // Each candidate matches a random subset of the requirements, plus a generic skill or two.
      const skills = position.requirements.filter(() => rand() > 0.35);
      if (rand() > 0.5) skills.push(pick(['Microsoft Office', 'Bilingual', 'Problem solving', 'Leadership', 'Cash handling']));
      const finalStage = pick(STAGE_MIX);
      const appliedAt = now - Math.floor(rand() * Math.min(55, (now - position.createdAt) / DAY)) * DAY - Math.floor(rand() * DAY);
      const speaksSpanish = /Spanish|Bilingual/.test(skills.join(' ')) || rand() > 0.6;

      // Build a consistent stage history up to the final stage.
      const history = [{ stage: 'applied', at: appliedAt }];
      let t = appliedAt;
      const target = finalStage === 'approved' || finalStage === 'declined'
        ? ORDER.slice(1, 2 + Math.floor(rand() * 3))
        : ORDER.slice(1, ORDER.indexOf(finalStage) + 1);
      target.forEach((s) => { t += (0.3 + rand() * 3) * DAY; history.push({ stage: s, at: Math.min(t, now) }); });
      if (finalStage === 'approved' || finalStage === 'declined') {
        t += (0.5 + rand() * 4) * DAY;
        history.push({ stage: finalStage, at: Math.min(t, now) });
      }

      const first = name.split(' ')[0].toLowerCase();
      const last = name.split(' ')[1].toLowerCase();
      const hasVoice = rand() > 0.12;
      return {
        id: 'cand-' + String(i + 1).padStart(3, '0'),
        name,
        email: `${first}.${last}@example.com`,
        phone: `(555) ${String(200 + i * 7).slice(-3)}-${String(1000 + i * 137).slice(-4)}`,
        location: pick(position.location === 'Remote (US)' ? US_CITIES : AMERICAS_CITIES),
        timezone: pick(TIMEZONES),
        positionId: position.id,
        source: pick(SOURCES),
        experienceYears: Math.floor(rand() * 9),
        skills,
        languages: speaksSpanish ? ['English', 'Spanish'] : ['English'],
        englishLevel: pick(['Native', 'Fluent', 'Fluent', 'Conversational']),
        availability: pick(['Immediately', 'In 1 week', 'In 2 weeks']),
        cvFile: `${first}_${last}_resume.pdf`,
        voiceNote: hasVoice ? { fileName: `${first}_${last}_intro.webm`, duration: 18 + Math.floor(rand() * 45) } : null,
        roleplayAnswer: pick(ROLEPLAY_ANSWERS),
        stage: finalStage,
        history,
        appliedAt,
        ai: null, // filled by the store at seed time (see store.js)
      };
    });

    return { positions, candidates, clients: CLIENTS };
  }

  window.MOCK = { STAGES, CLIENTS, SOURCES, REGIONS, TIMEZONES, ROLEPLAY_PROMPTS, build };
})();
