/* Admin dashboard: KPIs, kanban pipeline, AI screening of new applicants and candidate decisions. */
(function () {
  const { $, $$, esc, fmtDate, timeAgo, avatar, stageLabel, stageBadge, scoreTone, scoreRing, scoreBar, toast, openDrawer } = window.UI;
  const STAGE_IDS = window.MOCK.STAGES.map((s) => s.id);
  const DAY = 24 * 60 * 60 * 1000;

  let view = 'overview';
  let openId = null; // candidate shown in the detail drawer

  // ---------- Routing ----------
  function route() {
    view = location.hash.replace('#', '') === 'pipeline' ? 'pipeline' : 'overview';
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === view)));
    $('#view-overview').classList.toggle('hidden', view !== 'overview');
    $('#view-pipeline').classList.toggle('hidden', view !== 'pipeline');
    render();
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => { location.hash = t.dataset.view; }));
  window.addEventListener('hashchange', route);

  function render() {
    const fresh = Store.candidates().filter((c) => c.isNew).length;
    $('#new-count').textContent = fresh;
    $('#new-count').classList.toggle('zero', !fresh);
    if (view === 'overview') renderOverview(); else renderPipeline();
    if (openId) renderDetail();
  }

  // ---------- AI screening of new applications ----------
  const running = new Map(); // candidateId -> startedAt

  function processPending() {
    Store.candidates()
      .filter((c) => c.ai && c.ai.status === 'pending' && !running.has(c.id))
      .forEach((c) => {
        running.set(c.id, Date.now());
        toast(`${c.name} just applied. Reviewing now…`);
        AI.analyze(c, Store.position(c.positionId)).then((result) => {
          running.delete(c.id);
          const fresh = Store.candidate(c.id);
          if (!fresh || (fresh.ai && fresh.ai.status === 'done')) return;
          Store.updateCandidate(c.id, { ai: result });
          if (fresh.stage === 'applied') Store.moveStage(c.id, 'screened');
          toast(`${c.name} scored ${result.score}/100. Recommended: ${result.recommendation}`, 'good');
        }).catch(() => {
          running.delete(c.id);
          toast(`AI analysis failed for ${c.name}. It will retry on reload.`);
        });
      });
    if (running.size) startTicker();
  }

  // While analyses run, update progress bars in place (no full re-render, no flicker).
  let ticker = null;
  function startTicker() {
    if (ticker) return;
    ticker = setInterval(() => {
      if (!running.size) { clearInterval(ticker); ticker = null; return; }
      running.forEach((startedAt, id) => {
        const pct = progressOf(startedAt);
        $$(`[data-progress="${id}"]`).forEach((el) => { el.style.width = pct + '%'; });
        $$(`[data-progress-text="${id}"]`).forEach((el) => { el.textContent = pct + '%'; });
        const steps = $(`[data-steps="${id}"]`);
        if (steps) steps.innerHTML = stepsHtml(pct);
      });
    }, 250);
  }
  function progressOf(startedAt) {
    return Math.min(99, Math.round(((Date.now() - startedAt) / window.APP_CONFIG.aiProcessingMs) * 100));
  }
  function stepsHtml(pct) {
    const n = AI.STEPS.length;
    const active = Math.min(n - 1, Math.floor((pct / 100) * n));
    return AI.STEPS.map((s, i) => i < active
      ? `<li class="done"><span class="check-icon">✓</span>${s}</li>`
      : i === active ? `<li class="active"><span class="spinner"></span>${s}…</li>`
      : `<li><span class="pending-icon"></span>${s}</li>`).join('');
  }

  // ---------- Overview ----------
  function stats() {
    const cs = Store.candidates();
    const byStage = Object.fromEntries(STAGE_IDS.map((s) => [s, 0]));
    cs.forEach((c) => { byStage[c.stage] = (byStage[c.stage] || 0) + 1; });
    const decided = byStage.approved + byStage.declined;
    const hires = cs.filter((c) => c.stage === 'approved').map((c) => {
      const at = c.history.find((h) => h.stage === 'approved');
      return at ? (at.at - c.appliedAt) / DAY : null;
    }).filter((d) => d !== null);
    const scored = cs.filter((c) => c.ai && c.ai.status === 'done');
    const weekAgo = Date.now() - 7 * DAY;
    return {
      total: cs.length,
      thisWeek: cs.filter((c) => c.appliedAt >= weekAgo).length,
      byStage,
      approvalRate: decided ? Math.round((byStage.approved / decided) * 100) : 0,
      decided,
      timeToHire: hires.length ? (hires.reduce((a, b) => a + b, 0) / hires.length).toFixed(1) : 'N/A',
      avgScore: scored.length ? Math.round(scored.reduce((s, c) => s + c.ai.score, 0) / scored.length) : 0,
      openPositions: Store.positions().filter((p) => p.status === 'open').length,
    };
  }

  function renderOverview() {
    const s = stats();
    const max = Math.max(...Object.values(s.byStage), 1);
    const recent = Store.candidates().slice().sort((a, b) => b.appliedAt - a.appliedAt).slice(0, 6);
    $('#view-overview').innerHTML = `
      <div class="grid grid-4">
        <div class="card kpi k-violet"><span class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg></span><div class="label">Applications</div><div class="value">${s.total}</div><div class="delta">${s.thisWeek} new this week</div></div>
        <div class="card kpi k-mint"><span class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><div class="label">Approval rate</div><div class="value">${s.approvalRate}%</div><div class="delta">out of ${s.decided} decisions</div></div>
        <div class="card kpi k-coral"><span class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><div class="label">Time to hire</div><div class="value">${s.timeToHire}<span class="small muted"> days</span></div><div class="delta">on average, apply to approved</div></div>
        <div class="card kpi k-sun"><span class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg></span><div class="label">Average score</div><div class="value">${s.avgScore}</div><div class="delta">across ${s.openPositions} open roles</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-title"><h3>Where everyone is</h3><a class="small" href="#pipeline">Open the board</a></div>
          <div class="capsules">${STAGE_IDS.map((id) => `<div class="capsule s-${id}">
            <div class="track"><div class="fill" style="height:${Math.max(18, (s.byStage[id] / max) * 100)}%">${s.byStage[id]}</div></div>
            <span class="cap-label">${esc(stageLabel(id))}</span></div>`).join('')}</div>
          <div class="legend"><span class="muted">Total applicants</span><span style="margin-left:auto">${s.total}</span></div>
        </div>
        <div class="card">
          <div class="card-title"><h3>Just applied</h3></div>
          <div class="stack" style="--gap:8px">${recent.map((c) => `<button type="button" class="k-card" data-open="${esc(c.id)}">
            ${avatar(c.name)}<span><span class="name">${esc(c.name)}</span><br><span class="sub">${esc((Store.position(c.positionId) || {}).title || '')}, ${esc(timeAgo(c.appliedAt))}</span></span>
            ${miniScore(c)}</button>`).join('')}</div>
        </div>
      </div>`;
  }

  function miniScore(c) {
    if (!c.ai || c.ai.status !== 'done') {
      const started = running.get(c.id);
      return `<span class="analyzing"><span class="spinner"></span><span data-progress-text="${esc(c.id)}">${started ? progressOf(started) + '%' : 'Queued'}</span></span>`;
    }
    return `<span class="mini-score tone-${scoreTone(c.ai.score)}">${c.ai.score}</span>`;
  }

  // ---------- Pipeline (kanban) ----------
  function fillPositionFilter() {
    const sel = $('#k-position'); const keep = sel.value;
    sel.length = 1;
    Store.positions().forEach((p) => sel.add(new Option(p.title, p.id)));
    sel.value = keep;
  }

  function renderPipeline() {
    fillPositionFilter();
    const q = $('#k-search').value.trim().toLowerCase();
    const posId = $('#k-position').value;
    const stages = posId ? Store.position(posId).stages : STAGE_IDS;
    const cs = Store.candidates().filter((c) => (!posId || c.positionId === posId) && (!q || c.name.toLowerCase().includes(q)));

    $('#kanban').innerHTML = stages.map((stage) => {
      const list = cs.filter((c) => c.stage === stage)
        .sort((a, b) => (b.isNew - a.isNew) || ((b.ai && b.ai.score) || 0) - ((a.ai && a.ai.score) || 0));
      return `<div class="kanban-col" data-stage="${stage}">
        <div class="kanban-head"><span>${esc(stageLabel(stage))}</span><span class="count">${list.length}</span></div>
        <div class="kanban-list">${list.map((c) => cardHtml(c, !posId)).join('') || '<div class="small muted" style="padding:8px">No candidates</div>'}</div>
      </div>`;
    }).join('');
  }

  function cardHtml(c, showPosition) {
    const p = Store.position(c.positionId);
    const started = running.get(c.id);
    return `<button type="button" class="k-card ${c.isNew ? 'is-new' : ''}" data-open="${esc(c.id)}" draggable="true">
      ${avatar(c.name, 32)}
      <span><span class="name">${esc(c.name)}</span>${c.isNew ? ' <span class="badge new">New</span>' : ''}<br>
      <span class="sub">${showPosition && p ? esc(p.title) : esc(timeAgo(c.appliedAt))}</span>
      ${started ? `<div class="progress" style="margin-top:6px"><div data-progress="${esc(c.id)}" style="width:${progressOf(started)}%"></div></div>` : ''}</span>
      ${miniScore(c)}
    </button>`;
  }

  ['#k-search', '#k-position'].forEach((sel) => $(sel).addEventListener('input', renderPipeline));

  // Drag and drop between columns.
  let dragId = null;
  const kanban = $('#kanban');
  kanban.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-open]');
    if (!card) return;
    dragId = card.dataset.open;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  kanban.addEventListener('dragover', (e) => {
    const col = e.target.closest('.kanban-col');
    if (!col || !dragId) return;
    e.preventDefault();
    $$('.kanban-col.drag-over').forEach((c) => c !== col && c.classList.remove('drag-over'));
    col.classList.add('drag-over');
  });
  kanban.addEventListener('dragleave', (e) => {
    const col = e.target.closest('.kanban-col');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });
  kanban.addEventListener('drop', (e) => {
    const col = e.target.closest('.kanban-col');
    if (!col || !dragId) return;
    e.preventDefault();
    col.classList.remove('drag-over');
    const id = dragId; dragId = null;
    decide(id, col.dataset.stage);
  });
  kanban.addEventListener('dragend', () => { dragId = null; $$('.kanban-col.drag-over').forEach((c) => c.classList.remove('drag-over')); });

  // ---------- Candidate detail ----------
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) { showDetail(opener.dataset.open); return; }
    const action = e.target.closest('[data-move]');
    if (action && openId) decide(openId, action.dataset.move);
  });

  function showDetail(id) {
    openDrawer('', () => { openId = null; });
    openId = id;
    const c = Store.candidate(id);
    if (c && c.isNew) Store.updateCandidate(id, { isNew: false }); // re-renders (detail included) via subscribe
    else renderDetail();
  }

  function renderDetail() {
    const body = $('.drawer-body');
    const c = Store.candidate(openId);
    if (!body || !c) return;
    const p = Store.position(c.positionId) || { title: 'Position closed', stages: STAGE_IDS, requirements: [] };
    const done = c.ai && c.ai.status === 'done';
    const terminal = c.stage === 'approved' || c.stage === 'declined';
    const flow = p.stages.filter((s) => s !== 'approved' && s !== 'declined');
    const next = flow[flow.indexOf(c.stage) + 1];

    body.innerHTML = `
      <div class="detail-head">${avatar(c.name, 52)}
        <div><h2>${esc(c.name)}</h2><div class="small muted">${esc(p.title)}<br>Applied ${esc(timeAgo(c.appliedAt))} via ${esc(c.source.toLowerCase())}</div>
        <div style="margin-top:6px">${stageBadge(c.stage)}</div></div></div>

      <div class="card">${done ? aiResultHtml(c) : aiRunningHtml(c)}</div>

      <div class="card">
        <div class="card-title"><h3>Voice note</h3>${c.voiceNote ? `<span class="small muted">🎧 ${esc(c.voiceNote.fileName)}${c.voiceNote.duration ? ` (${c.voiceNote.duration}s)` : ''}</span>` : ''}</div>
        ${!c.voiceNote ? '<p class="muted small" style="margin:0">No voice note submitted.</p>'
          : done ? `<div class="ai-label">Transcript (simulated)</div><p class="transcript" style="margin-top:6px">“${esc(c.ai.transcript)}”</p>`
          : '<p class="muted small" style="margin:0">Transcribing…</p>'}
      </div>

      <div class="card">
        <h3>Role play</h3>
        <p class="small muted" style="margin-bottom:6px">${esc(p.roleplayPrompt || '')}</p>
        <p style="margin:0">${c.roleplayAnswer ? esc(c.roleplayAnswer) : '<span class="muted">No answer provided.</span>'}</p>
      </div>

      <div class="card">
        <h3>Profile</h3>
        <dl class="kv">
          <dt>Email</dt><dd>${esc(c.email)}</dd>
          <dt>Phone</dt><dd>${esc(c.phone || 'Not shared')}</dd>
          <dt>Works from</dt><dd>${esc(c.location || 'Not shared')}</dd>
          <dt>Time zone</dt><dd>${esc(c.timezone || 'Not shared')}</dd>
          <dt>Experience</dt><dd>${esc(c.experienceYears)} years</dd>
          <dt>English</dt><dd>${esc(c.englishLevel || 'Not shared')}</dd>
          <dt>Languages</dt><dd>${esc((c.languages || []).join(', ') || 'Not shared')}</dd>
          <dt>Availability</dt><dd>${esc(c.availability || 'Not shared')}</dd>
          <dt>CV</dt><dd>📄 ${esc(c.cvFile || 'Not shared')}</dd>
        </dl>
      </div>

      <div class="card">
        <h3>History</h3>
        <ul class="ai-summary small">${c.history.map((h) => `<li><strong>${esc(stageLabel(h.stage))}</strong>, ${esc(fmtDate(h.at))}</li>`).join('')}</ul>
      </div>

      <div class="decision-bar">
        ${terminal
          ? `<button type="button" class="btn" data-move="${flow[flow.length - 1] || 'screened'}">Reopen</button>`
          : `<button type="button" class="btn btn-danger" data-move="declined" ${done ? '' : 'disabled'}>Decline</button>
             ${next ? `<button type="button" class="btn" data-move="${next}" ${done ? '' : 'disabled'}>Move to ${esc(stageLabel(next))}</button>` : ''}
             <button type="button" class="btn btn-good" data-move="approved" ${done ? '' : 'disabled'}>✓ Approve</button>`}
      </div>`;
  }

  function aiRunningHtml(c) {
    const started = running.get(c.id);
    const pct = started ? progressOf(started) : 0;
    return `<div class="card-title"><h3>Reviewing this application</h3><span class="analyzing"><span class="spinner"></span><span data-progress-text="${esc(c.id)}">${pct}%</span></span></div>
      <div class="progress" style="margin-bottom:14px"><div data-progress="${esc(c.id)}" style="width:${pct}%"></div></div>
      <ul class="ai-steps" data-steps="${esc(c.id)}">${stepsHtml(pct)}</ul>`;
  }

  function aiResultHtml(c) {
    const a = c.ai;
    const tone = a.recommendation === 'Advance' ? 'good' : a.recommendation === 'Review' ? 'ok' : 'low';
    return `<div class="row" style="gap:16px;align-items:flex-start">
        ${scoreRing(a.score, 84)}
        <div class="grow" style="min-width:220px">
          <div class="row between"><span class="ai-label">Quick summary</span><span class="badge tone-${tone}">Recommendation: ${esc(a.recommendation)}</span></div>
          <ul class="ai-summary" style="margin-top:6px">${a.summary.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        </div>
      </div>
      <div style="margin-top:16px">${scoreBar('CV match', a.breakdown.cv)}${scoreBar('Language & communication', a.breakdown.communication)}${scoreBar('Role play', a.breakdown.roleplay)}</div>
      <div class="chips" style="margin-top:14px">${(a.matched || []).map((r) => `<span class="chip ok">✓ ${esc(r)}</span>`).join('')}${(a.missing || []).map((r) => `<span class="chip miss">✗ ${esc(r)}</span>`).join('')}</div>`;
  }

  function decide(id, stage) {
    const c = Store.candidate(id);
    if (!c || c.stage === stage) return;
    if (!c.ai || c.ai.status !== 'done') { toast('Give it a second, the review is almost done.'); return; }
    Store.moveStage(id, stage);
    if (stage === 'approved') toast(`${c.name} is approved and now on the client's shortlist 🎉`, 'good');
    else if (stage === 'declined') toast(`${c.name} was declined. We'll keep them in mind for other roles.`);
    else toast(`${c.name} moved to ${stageLabel(stage)}.`);
  }

  // Any change (this tab or another one) refreshes the view and picks up new applications.
  Store.subscribe(() => { render(); processPending(); });

  route();
  processPending();
  if (running.size) render(); // show progress immediately on first paint
})();
