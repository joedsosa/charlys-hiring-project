/*
 * Simulated AI screening.
 *
 * Everything runs in the browser: scores, summaries and transcripts are derived from
 * the application data with simple, explainable rules. The public surface is
 * AI.analyze(candidate, position) -> Promise<Analysis>, so a real model can replace
 * the mock provider later without touching the pages. See AI.providers.api below.
 *
 * Analysis shape:
 * {
 *   status: 'done',
 *   score: 0-100,
 *   breakdown: { cv, communication, roleplay },   // each 0-100
 *   summary: [string, string, string],            // 3-line recruiter summary
 *   recommendation: 'Advance' | 'Review' | 'Hold',
 *   transcript: string,                           // voice note transcript
 *   matched: string[], missing: string[],         // requirements found / not found
 *   model: string, analyzedAt: number
 * }
 */
(function () {
  const EMPATHY = ['listen', 'apolog', 'understand', 'sorry', 'thank', 'calm', 'acknowledge'];
  const RESOLUTION = ['solution', 'resolve', 'replacement', 'refund', 'option', 'follow up', 'fix', 'offer', 'report', 'estimate', 'check'];

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)));

  // Small stable hash so the same candidate always gets the same "noise".
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }
  const jitter = (key, spread) => (hash(key) - 0.5) * 2 * spread;

  function norm(s) { return String(s || '').toLowerCase(); }

  function matchRequirements(candidate, position) {
    const haystack = norm([
      (candidate.skills || []).join(' '),
      (candidate.languages || []).join(' '),
      candidate.cvText || '',
    ].join(' '));
    const matched = [];
    const missing = [];
    position.requirements.forEach((req) => {
      // Match on the requirement's main words, e.g. "English (fluent)" -> "english".
      const key = norm(req).replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, ' ').trim();
      const words = key.split(/\s+/).filter((w) => w.length > 2);
      const hit = (candidate.skills || []).some((s) => norm(s) === norm(req)) ||
        (words.length && words.every((w) => haystack.includes(w)));
      (hit ? matched : missing).push(req);
    });
    return { matched, missing };
  }

  function scoreCv(candidate, position, match) {
    const ratio = position.requirements.length ? match.matched.length / position.requirements.length : 0.5;
    const exp = Math.min(Number(candidate.experienceYears) || 0, 6);
    return clamp(42 + ratio * 38 + exp * 2.6 + jitter(candidate.id + 'cv', 4) + (candidate.cvFile ? 0 : -15), 20, 98);
  }

  function scoreCommunication(candidate, position) {
    const level = { Native: 22, Fluent: 18, Conversational: 8, Basic: 0 }[candidate.englishLevel] ?? 10;
    let voice = -12;
    if (candidate.voiceNote) {
      const d = candidate.voiceNote.duration || 0;
      voice = d >= 20 && d <= 75 ? 12 : d > 0 ? 6 : 4; // unknown length (uploaded file) gets partial credit
    }
    const needsSpanish = position.requirements.some((r) => /spanish|bilingual/i.test(r));
    const bilingual = (candidate.languages || []).includes('Spanish') ? (needsSpanish ? 8 : 3) : (needsSpanish ? -10 : 0);
    return clamp(52 + level + voice + bilingual + jitter(candidate.id + 'comm', 4), 20, 98);
  }

  function scoreRoleplay(candidate) {
    const text = norm(candidate.roleplayAnswer);
    if (!text.trim()) return 35;
    const words = text.split(/\s+/).length;
    const empathy = EMPATHY.filter((w) => text.includes(w)).length;
    const resolution = RESOLUTION.filter((w) => text.includes(w)).length;
    const length = words < 12 ? -14 : words < 25 ? 0 : words < 90 ? 8 : 4;
    return clamp(48 + length + Math.min(empathy, 3) * 7 + Math.min(resolution, 3) * 6 + jitter(candidate.id + 'rp', 3), 20, 98);
  }

  function describeLevel(score, levels) {
    if (score >= 80) return levels[0];
    if (score >= 65) return levels[1];
    return levels[2];
  }

  function buildSummary(c, position, b, match) {
    const first = c.name.split(' ')[0];
    const years = Number(c.experienceYears) || 0;
    const expText = years === 0 ? 'is entry-level' : `has ${years} year${years === 1 ? '' : 's'} of relevant experience`;
    const line1 = `${first} ${expText} and matches ${match.matched.length} of ${position.requirements.length} key requirements` +
      (match.missing.length ? `. Missing: ${match.missing.slice(0, 2).join(', ')}.` : '.');

    const spanish = (c.languages || []).includes('Spanish') ? ', also speaks Spanish' : '';
    const line2 = c.voiceNote
      ? `Voice note shows ${describeLevel(b.communication, ['clear, confident', 'clear', 'hesitant'])} spoken English${spanish}.`
      : `No voice note provided; communication scored from the written application${spanish}.`;

    const line3 = `Role-play answer ${describeLevel(b.roleplay, [
      'shows empathy and a clear resolution path',
      'is reasonable but could be more specific',
      'is brief and lacks a clear resolution',
    ])}.`;
    return [line1, line2, line3];
  }

  function buildTranscript(c, position, match) {
    if (!c.voiceNote) return '';
    const first = c.name.split(' ')[0];
    const years = Number(c.experienceYears) || 0;
    const isRemoteReq = (s) => /internet|home office|own computer/i.test(s);
    const skills = match.matched.filter((s) => !/english|spanish|bilingual/i.test(s) && !isRemoteReq(s)).slice(0, 2)
      .map((s) => s.replace(/\s*\(.*\)/, '').split(' ').map((w) => (w === w.toUpperCase() ? w : w.toLowerCase())).join(' '));
    const parts = [
      `Hi, my name is ${first}, and I'm applying for the ${position.title} position.`,
      years ? `I have about ${years} year${years === 1 ? '' : 's'} of experience` + (skills.length ? `, mostly with ${skills.join(' and ')}.` : '.') : `This would be my first job in this field, but I learn fast and I'm very reliable.`,
      (c.languages || []).includes('Spanish') ? `I'm bilingual in English and Spanish, which helps a lot with customers.` : `I enjoy working with people and as part of a team.`,
      match.matched.some(isRemoteReq) ? `I work from a quiet home office with my own computer and a reliable internet connection.` : `I'm comfortable working remotely and communicating online with my team.`,
      `I'm in the ${c.timezone ? c.timezone.replace(/\s*\(.*\)/, '') + ' time zone' : 'Americas'}, I'm available to start ${norm(c.availability || 'soon')}, and the schedule works for me.`,
      `Thank you for considering my application.`,
    ];
    return parts.join(' ');
  }

  /** Synchronous scoring used for seeding mock data and by the mock provider. */
  function scoreSync(candidate, position) {
    const match = matchRequirements(candidate, position);
    const breakdown = {
      cv: scoreCv(candidate, position, match),
      communication: scoreCommunication(candidate, position),
      roleplay: scoreRoleplay(candidate),
    };
    const w = position.weights || { cv: 0.4, communication: 0.35, roleplay: 0.25 };
    const total = w.cv + w.communication + w.roleplay || 1;
    const score = clamp((breakdown.cv * w.cv + breakdown.communication * w.communication + breakdown.roleplay * w.roleplay) / total, 0, 100);
    return {
      status: 'done',
      score,
      breakdown,
      summary: buildSummary(candidate, position, breakdown, match),
      recommendation: score >= 78 ? 'Advance' : score >= 65 ? 'Review' : 'Hold',
      transcript: buildTranscript(candidate, position, match),
      matched: match.matched,
      missing: match.missing,
      model: 'mock-screening-v1',
      analyzedAt: Date.now(),
    };
  }

  const providers = {
    // Default: runs locally with an artificial delay so the UI can show progress.
    mock: {
      analyze(candidate, position) {
        const delay = (window.APP_CONFIG && window.APP_CONFIG.aiProcessingMs) || 4000;
        return new Promise((resolve) => setTimeout(() => resolve(scoreSync(candidate, position)), delay));
      },
    },
    /*
     * Real integration (example). Point `endpoint` at your backend, which would:
     *  1. fetch the CV and voice note from storage,
     *  2. transcribe the audio (speech-to-text),
     *  3. call an LLM with the job requirements + CV text + transcript + role-play answer,
     *  4. return JSON in the Analysis shape documented at the top of this file.
     * Never call a model provider directly from the browser with a secret API key.
     */
    api: {
      endpoint: '/api/screen-candidate',
      async analyze(candidate, position) {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate, position }),
        });
        if (!res.ok) throw new Error('Screening API error ' + res.status);
        return res.json();
      },
    },
  };

  // Steps shown in the UI while an analysis is running.
  const STEPS = ['Parsing CV', 'Transcribing voice note', 'Evaluating role-play', 'Scoring against requirements', 'Writing summary'];

  window.AI = {
    provider: 'mock',
    providers,
    STEPS,
    scoreSync,
    analyze(candidate, position) {
      return providers[this.provider].analyze(candidate, position);
    },
  };
})();
