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
    { id: 'roleplay', label: 'Role-play' },
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

  const SOURCES = ['Job boards', 'Social media', 'Referral', 'Career site', 'Job fair', 'Talent pool'];

  const ROLEPLAY_PROMPTS = {
    support: 'A customer calls upset because their order arrived damaged. How do you respond?',
    sales: 'A prospect says your product is too expensive. What do you tell them?',
    operations: 'Your shift is behind schedule and a teammate is not following safety rules. What do you do?',
    hospitality: 'A guest complains that their room is not ready at check-in time. How do you handle it?',
  };

  const POSITIONS = [
    {
      id: 'pos-csr', clientId: 'cl-fabrikam', title: 'Bilingual Customer Support Representative',
      category: 'Customer support', location: 'Remote (US)', type: 'Full-time',
      schedule: 'Mon–Fri, 9:00 am – 5:30 pm CT', headcount: 25, pay: '$18–20/hr',
      requirements: ['English (fluent)', 'Spanish (conversational)', 'Customer service', 'CRM tools', 'Typing 40+ wpm'],
      description: 'Answer inbound calls and chats, resolve order issues and keep customers happy.',
      roleplay: 'support', daysAgo: 40,
    },
    {
      id: 'pos-wh', clientId: 'cl-contoso', title: 'Warehouse Associate',
      category: 'Operations', location: 'Dallas, TX', type: 'Full-time',
      schedule: 'Rotating shifts, 4×10 h', headcount: 40, pay: '$17–19/hr',
      requirements: ['Forklift certification', 'Inventory', 'Lift 50 lbs', 'Safety procedures', 'Teamwork'],
      description: 'Pick, pack and ship orders in a high-volume distribution center.',
      roleplay: 'operations', daysAgo: 45,
    },
    {
      id: 'pos-driver', clientId: 'cl-contoso', title: 'Delivery Driver',
      category: 'Operations', location: 'Houston, TX', type: 'Full-time',
      schedule: 'Mon–Sat, 7:00 am – 3:30 pm', headcount: 15, pay: '$19–21/hr',
      requirements: ['Valid driver license', 'Clean driving record', 'Route planning', 'Customer service', 'Time management'],
      description: 'Deliver packages on assigned routes with a company van.',
      roleplay: 'operations', daysAgo: 30,
    },
    {
      id: 'pos-retail', clientId: 'cl-northwind', title: 'Retail Sales Associate',
      category: 'Retail', location: 'Phoenix, AZ', type: 'Part-time',
      schedule: 'Weekends + 2 evenings', headcount: 20, pay: '$16–18/hr',
      requirements: ['Customer service', 'POS systems', 'Upselling', 'Merchandising', 'Teamwork'],
      description: 'Help shoppers, run the register and keep the sales floor organized.',
      roleplay: 'sales', daysAgo: 35,
    },
    {
      id: 'pos-sales', clientId: 'cl-fabrikam', title: 'Inbound Sales Agent',
      category: 'Sales', location: 'Remote (US)', type: 'Full-time',
      schedule: 'Mon–Fri, 10:00 am – 6:30 pm ET', headcount: 12, pay: '$17/hr + commission',
      requirements: ['English (fluent)', 'Sales experience', 'CRM tools', 'Objection handling', 'Goal oriented'],
      description: 'Turn inbound leads into customers over the phone.',
      roleplay: 'sales', daysAgo: 25,
    },
    {
      id: 'pos-frontdesk', clientId: 'cl-northwind', title: 'Front Desk Receptionist',
      category: 'Hospitality', location: 'Orlando, FL', type: 'Full-time',
      schedule: 'Rotating, includes weekends', headcount: 6, pay: '$16–17/hr',
      requirements: ['Customer service', 'English (fluent)', 'Scheduling software', 'Multitasking', 'Professional appearance'],
      description: 'Welcome guests, manage check-ins and answer phones.',
      roleplay: 'hospitality', daysAgo: 20,
    },
    {
      id: 'pos-data', clientId: 'cl-fabrikam', title: 'Data Entry Clerk',
      category: 'Administrative', location: 'Remote (US)', type: 'Contract',
      schedule: 'Flexible, 30 h/week', headcount: 10, pay: '$16/hr',
      requirements: ['Typing 50+ wpm', 'Excel', 'Attention to detail', 'Data privacy', 'Time management'],
      description: 'Enter and verify records accurately for a back-office team.',
      roleplay: 'support', daysAgo: 18,
    },
    {
      id: 'pos-cook', clientId: 'cl-northwind', title: 'Line Cook',
      category: 'Hospitality', location: 'Atlanta, GA', type: 'Full-time',
      schedule: 'Evenings and weekends', headcount: 8, pay: '$17–19/hr',
      requirements: ['Food handler card', 'Line cooking', 'Food safety', 'Speed under pressure', 'Teamwork'],
      description: 'Prepare dishes on a busy line following recipes and safety standards.',
      roleplay: 'hospitality', daysAgo: 15,
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

  const ROLEPLAY_ANSWERS = [
    'First I would listen and apologize for the trouble. I understand how frustrating it is. Then I would confirm the details, offer a replacement or refund right away, and follow up by email so they know the solution is on its way.',
    'I would stay calm, thank them for telling me, and ask questions to understand the problem. I would explain the options we have and agree on a solution together, then make sure it is resolved.',
    'I would apologize and tell them I will check with my supervisor to find a solution.',
    'I would listen to the customer, understand what happened, and offer to fix it as soon as possible. I would keep a positive attitude.',
    'Tell them sorry and send a new one.',
    'I would acknowledge the concern, explain the value and the benefits they get, and offer options that fit their budget. Then I would ask if they have any other questions before closing.',
    'I would talk to the teammate respectfully, remind them of the safety procedure, and if it continues I would report it to the shift lead. Safety comes first even when we are behind.',
    'I would apologize, offer them a seat and a drink, give a clear time estimate and check on the room personally. If possible I would offer an upgrade or a small courtesy.',
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
        location: position.location.startsWith('Remote') ? pick(['San Antonio, TX', 'Miami, FL', 'Chicago, IL', 'Denver, CO', 'Charlotte, NC']) : position.location,
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

  window.MOCK = { STAGES, CLIENTS, SOURCES, ROLEPLAY_PROMPTS, build };
})();
