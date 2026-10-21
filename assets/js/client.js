/* Client portal: post positions and review the AI-ranked shortlist of approved candidates. */
(function () {
  const { $, $$, esc, fmtDate, timeAgo, avatar, colorIndex, tag, scoreRing, scoreBar, toast } = window.UI;
  const CLIENT_KEY = window.APP_CONFIG.storageKey + '-client';

  const SAMPLE_POSITION = {
    title: 'Bilingual Call Center Agent',
    category: 'Customer support',
    location: 'Remote (US)',
    type: 'Full time',
    schedule: 'Mon to Fri, 8:00 am to 4:30 pm CT',
    headcount: 30,
    pay: '$18/hr',
    requirements: ['English (fluent)', 'Spanish (conversational)', 'Customer service', 'CRM tools', 'Stable internet (25+ Mbps)'],
    description: 'Handle inbound customer calls from home, solve account questions and log every interaction in the CRM.',
    roleplay: 'support',
  };
  const CATEGORIES = ['Customer support', 'Sales', 'IT support', 'Operations', 'Administrative', 'Marketing'];
  const ROLEPLAY_LABELS = { support: 'Upset customer on a call (support)', sales: 'Price objection (sales)', techsupport: 'Login issue over chat (IT support)', dispatch: 'Late delivery, remote coordination (operations)', assistant: 'Competing urgent tasks (assistant / admin)' };

  // ---------- Signed-in client (demo switcher) ----------
  let clientId;
  try { clientId = localStorage.getItem(CLIENT_KEY); } catch (e) { /* ignore */ }
  if (!Store.client(clientId)) clientId = Store.clients()[0].id;
  const select = $('#client-select');
  Store.clients().forEach((c) => select.add(new Option(c.name, c.id)));
  select.value = clientId;
  select.addEventListener('change', () => {
    clientId = select.value;
    try { localStorage.setItem(CLIENT_KEY, clientId); } catch (e) { /* ignore */ }
    location.hash = 'positions';
    route();
  });

  // ---------- Routing ----------
  function route() {
    const hash = location.hash.replace('#', '');
    if (hash.startsWith('shortlist/')) return showShortlist(hash.slice(10));
    const view = hash === 'post' ? 'post' : 'positions';
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === view)));
    $('#view-positions').classList.toggle('hidden', view !== 'positions');
    $('#view-post').classList.toggle('hidden', view !== 'post');
    $('#view-shortlist').classList.add('hidden');
    if (view === 'positions') renderPositions();
    else renderPostForm();
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => { location.hash = t.dataset.view; }));
  window.addEventListener('hashchange', route);

  // ---------- Positions ----------
  let highlightId = null;
  function renderPositions() {
    const list = Store.positions().filter((p) => p.clientId === clientId);
    $('#positions').innerHTML = list.length ? list.map((p) => {
      const cands = Store.candidatesFor(p.id);
      const approved = cands.filter((c) => c.stage === 'approved').length;
      const inReview = cands.filter((c) => !['approved', 'declined'].includes(c.stage)).length;
      const pct = Math.min(100, Math.round((approved / p.headcount) * 100));
      const ci = colorIndex(p.category);
      return `<article class="card position-card c-${ci} ${p.id === highlightId ? 'is-highlight' : ''}" id="card-${esc(p.id)}">
        <div class="row between"><span class="badge c-${ci}">${esc(p.category)}</span><span class="small muted">Posted ${esc(timeAgo(p.createdAt))}</span></div>
        <h3>${esc(p.title)}</h3>
        <div class="tags">${tag('globe', 'sky', p.location)}${tag('clock', 'violet', p.schedule)}</div>
        <div class="grid grid-3" style="grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0">
          <div><div class="small muted">Applicants</div><strong>${cands.length}</strong></div>
          <div><div class="small muted">In evaluation</div><strong>${inReview}</strong></div>
          <div><div class="small muted">Shortlisted</div><strong>${approved} / ${esc(p.headcount)}</strong></div>
        </div>
        <div class="progress" title="${approved} of ${esc(p.headcount)} positions filled"><div style="width:${pct}%"></div></div>
        <div class="actions">
          <a class="small" href="candidate.html#apply/${esc(p.id)}" target="_blank" rel="noopener">Open application page ↗</a>
          <a class="btn btn-primary btn-sm" href="#shortlist/${esc(p.id)}">View shortlist${approved ? ` (${approved})` : ''}</a>
        </div>
      </article>`;
    }).join('') : '<div class="empty">No positions yet. <a href="#post">Post your first position</a>.</div>';
    if (highlightId) {
      const card = document.getElementById('card-' + highlightId);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightId = null;
    }
  }

  // ---------- Post a position ----------
  function renderPostForm() {
    $('#view-post').innerHTML = `
      <form class="form card" id="post-form" novalidate>
        <div class="row between"><h2 style="margin:0">Post a new remote role</h2><button type="button" class="btn btn-sm" id="fill-sample">⚡ Fill sample</button></div>
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1"><label for="p-title">Job title *</label><input type="text" id="p-title" required placeholder="e.g. Remote Customer Support Agent"></div>
          <div class="field"><label for="p-category">Category</label><select id="p-category">${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></div>
          <div class="field"><label for="p-location">Remote region *</label><select id="p-location">${window.MOCK.REGIONS.map((r) => `<option>${esc(r)}</option>`).join('')}</select>
            <span class="hint">Where candidates can live and work from.</span></div>
          <div class="field"><label for="p-type">Type</label><select id="p-type"><option>Full time</option><option>Part time</option><option>Contract</option><option>Seasonal</option></select></div>
          <div class="field"><label for="p-headcount">How many people? *</label><input type="number" id="p-headcount" min="1" max="1000" value="10" required></div>
          <div class="field"><label for="p-schedule">Schedule *</label><input type="text" id="p-schedule" required placeholder="e.g. Mon to Fri, 9 am to 5 pm ET"></div>
          <div class="field"><label for="p-pay">Pay range</label><input type="text" id="p-pay" placeholder="e.g. $17 to $19/hr"></div>
        </div>
        <div class="field"><label for="p-reqs">Requirements *</label>
          <textarea id="p-reqs" placeholder="One per line, e.g.&#10;English (fluent)&#10;Customer service&#10;Stable internet (25+ Mbps)"></textarea>
          <span class="hint">The AI compares each applicant against these requirements.</span></div>
        <div class="field"><label for="p-desc">Short description</label><textarea id="p-desc" style="min-height:70px"></textarea></div>
        <div class="field"><label for="p-roleplay">Role play scenario for applicants</label>
          <select id="p-roleplay">${Object.entries(ROLEPLAY_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="form-actions"><a class="btn" href="#positions">Cancel</a><button type="submit" class="btn btn-primary">Publish position</button></div>
      </form>`;

    $('#fill-sample').addEventListener('click', () => {
      const s = SAMPLE_POSITION;
      $('#p-title').value = s.title; $('#p-category').value = s.category; $('#p-location').value = s.location;
      $('#p-type').value = s.type; $('#p-headcount').value = s.headcount; $('#p-schedule').value = s.schedule;
      $('#p-pay').value = s.pay; $('#p-reqs').value = s.requirements.join('\n'); $('#p-desc').value = s.description;
      $('#p-roleplay').value = s.roleplay;
    });

    $('#post-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const requirements = $('#p-reqs').value.split(/\n|,/).map((r) => r.trim()).filter(Boolean);
      const data = {
        clientId,
        title: $('#p-title').value.trim(),
        category: $('#p-category').value,
        location: $('#p-location').value.trim(),
        type: $('#p-type').value,
        headcount: Math.max(1, Number($('#p-headcount').value) || 1),
        schedule: $('#p-schedule').value.trim(),
        pay: $('#p-pay').value.trim(),
        requirements,
        description: $('#p-desc').value.trim(),
        roleplayPrompt: window.MOCK.ROLEPLAY_PROMPTS[$('#p-roleplay').value],
      };
      const missing = [];
      if (!data.title) missing.push('a job title');
      if (!data.location) missing.push('a location');
      if (!data.schedule) missing.push('a schedule');
      if (!requirements.length) missing.push('at least one requirement');
      if (missing.length) { toast('Please add ' + missing.join(', ') + '.'); return; }

      const p = Store.addPosition(data);
      highlightId = p.id;
      toast('Your role is live. People can start applying now.', 'good');
      location.hash = 'positions';
    });
  }

  // ---------- Shortlist ----------
  function showShortlist(positionId) {
    const p = Store.position(positionId);
    if (!p) { location.hash = 'positions'; return; }
    if (p.clientId !== clientId) { clientId = p.clientId; select.value = clientId; }
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
    $('#view-positions').classList.add('hidden');
    $('#view-post').classList.add('hidden');
    const view = $('#view-shortlist');
    view.classList.remove('hidden');

    const cands = Store.candidatesFor(p.id);
    const shortlist = cands.filter((c) => c.stage === 'approved' && c.ai && c.ai.status === 'done')
      .sort((a, b) => b.ai.score - a.ai.score);
    const inReview = cands.filter((c) => !['approved', 'declined'].includes(c.stage)).length;

    view.innerHTML = `
      <a href="#positions" class="small">← All positions</a>
      <div class="row between" style="margin:12px 0 16px">
        <div><h2 style="margin:0">${esc(p.title)}</h2><div class="small muted">${esc(p.location)}, ${esc(p.schedule)}</div></div>
        <div class="row"><span class="badge tone-good">${shortlist.length} approved</span><span class="badge">${inReview} in evaluation</span><span class="badge">Need ${esc(p.headcount)}</span></div>
      </div>
      <div class="stack">${shortlist.length ? shortlist.map((c, i) => shortlistCard(c, i + 1)).join('') :
        `<div class="empty">No approved candidates yet. ${inReview ? `${inReview} applicant${inReview === 1 ? ' is' : 's are'} being evaluated by the recruiting team.` : 'Share the application page to start receiving applicants.'}</div>`}</div>`;
  }

  function shortlistCard(c, rank) {
    const approvedAt = (c.history.slice().reverse().find((h) => h.stage === 'approved') || {}).at;
    return `<article class="card">
      <div class="row" style="align-items:flex-start;gap:16px">
        <div class="row" style="flex:1 1 280px;align-items:flex-start">
          ${avatar(c.name, 44)}
          <div class="grow">
            <div class="row"><span class="badge c-${rank % 5}">#${rank}</span><strong>${esc(c.name)}</strong></div>
            <div class="tags" style="margin-top:8px">${c.location ? tag('pin', 'coral', c.location) : ''}${c.timezone ? tag('clock', 'violet', c.timezone) : ''}${tag('people', 'sun', `${c.experienceYears} yrs experience`)}${tag('globe', 'sky', (c.languages || []).join(' and '))}</div>
            <div class="ai-label" style="margin-top:12px">Quick summary</div>
            <ul class="ai-summary small">${c.ai.summary.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
            <div class="chips" style="margin-top:10px">${(c.ai.matched || []).map((r) => `<span class="chip ok">✓ ${esc(r)}</span>`).join('')}</div>
          </div>
        </div>
        <div style="flex:0 1 220px;min-width:200px" class="stack">
          <div class="row">${scoreRing(c.ai.score, 60)}<div><div class="small muted">Overall score</div><div class="small">Approved ${approvedAt ? esc(fmtDate(approvedAt)) : ''}</div></div></div>
          <div>${scoreBar('CV match', c.ai.breakdown.cv)}${scoreBar('Communication', c.ai.breakdown.communication)}${scoreBar('Role play', c.ai.breakdown.roleplay)}</div>
        </div>
      </div>
    </article>`;
  }

  // Live updates when the admin approves candidates in another tab.
  // The post form is left alone so typing is never interrupted.
  Store.subscribe(() => { if ($('#view-post').classList.contains('hidden')) route(); });
  route();
})();
