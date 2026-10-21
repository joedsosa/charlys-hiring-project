/*
 * Demo state persisted in localStorage so the flow works across pages and tabs.
 * Replace these functions with API calls when a real backend exists; pages only
 * talk to the Store, never to localStorage directly.
 */
(function () {
  const KEY = window.APP_CONFIG.storageKey;
  const VERSION = 1;
  const listeners = [];
  let state = null;

  function seed() {
    const data = window.MOCK.build();
    const byId = Object.fromEntries(data.positions.map((p) => [p.id, p]));
    data.candidates.forEach((c) => {
      c.ai = window.AI.scoreSync(c, byId[c.positionId]);
      c.ai.analyzedAt = c.appliedAt + 2 * 60 * 1000; // seeded analyses ran minutes after applying
    });
    return {
      version: VERSION,
      positions: data.positions,
      candidates: data.candidates,
      clients: data.clients,
      myApplicationIds: [], // applications submitted from this browser in the candidate portal
      seededAt: Date.now(),
    };
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === VERSION) return parsed;
      }
    } catch (e) { /* storage unavailable or corrupted: fall back to fresh data */ }
    return null;
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep in memory */ }
    listeners.forEach((fn) => fn(state));
  }

  function load() {
    state = read();
    if (!state) { state = seed(); write(); }
    return state;
  }

  const uid = (prefix) => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Other tabs (e.g. admin open next to the candidate portal) write the same key.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = read() || seed();
    listeners.forEach((fn) => fn(state));
  });

  const Store = {
    get state() { return state || load(); },

    subscribe(fn) { listeners.push(fn); },

    reset() { state = seed(); write(); },

    clients() { return this.state.clients; },
    client(id) { return this.state.clients.find((c) => c.id === id); },

    positions() { return this.state.positions; },
    position(id) { return this.state.positions.find((p) => p.id === id); },

    addPosition(data) {
      const position = Object.assign({
        id: uid('pos'),
        status: 'open',
        stages: ['applied', 'screened', 'roleplay', 'interview', 'approved', 'declined'],
        weights: { cv: 0.4, communication: 0.35, roleplay: 0.25 },
        roleplayPrompt: window.MOCK.ROLEPLAY_PROMPTS.support,
        createdAt: Date.now(),
        isNew: true,
      }, data);
      this.state.positions.unshift(position);
      write();
      return position;
    },

    updatePosition(id, patch) {
      const p = this.position(id);
      if (!p) return null;
      Object.assign(p, patch);
      write();
      return p;
    },

    candidates() { return this.state.candidates; },
    candidate(id) { return this.state.candidates.find((c) => c.id === id); },
    candidatesFor(positionId) { return this.state.candidates.filter((c) => c.positionId === positionId); },

    /** Submit a new application. AI analysis starts as "pending" and is run by the admin dashboard. */
    addCandidate(data) {
      const now = Date.now();
      const candidate = Object.assign({
        id: uid('cand'),
        source: 'Career site',
        stage: 'applied',
        history: [{ stage: 'applied', at: now }],
        appliedAt: now,
        ai: { status: 'pending' },
        isNew: true,
      }, data);
      this.state.candidates.unshift(candidate);
      this.state.myApplicationIds.unshift(candidate.id);
      write();
      return candidate;
    },

    updateCandidate(id, patch) {
      const c = this.candidate(id);
      if (!c) return null;
      Object.assign(c, patch);
      write();
      return c;
    },

    moveStage(id, stage) {
      const c = this.candidate(id);
      if (!c || c.stage === stage) return c;
      c.stage = stage;
      c.history.push({ stage, at: Date.now() });
      write();
      return c;
    },

    myApplications() {
      return this.state.myApplicationIds.map((id) => this.candidate(id)).filter(Boolean);
    },
  };

  window.Store = Store;
  load();
})();
