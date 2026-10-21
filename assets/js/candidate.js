/* Candidate portal: browse positions, apply (CV + voice note + role-play), track applications. */
(function () {
  const { $, $$, esc, fmtDate, timeAgo, stageBadge, tracker, toast } = window.UI;

  const SAMPLE_PEOPLE = [
    { name: 'Alex Rivera', email: 'alex.rivera@example.com', phone: '(555) 410-2231', location: 'San Antonio, TX' },
    { name: 'Jordan Ellis', email: 'jordan.ellis@example.com', phone: '(555) 318-7744', location: 'Miami, FL' },
    { name: 'Sam Delgado', email: 'sam.delgado@example.com', phone: '(555) 602-1189', location: 'Chicago, IL' },
  ];
  const SAMPLE_ANSWER = 'First I would listen carefully and apologize for the trouble, because I understand how frustrating that is. Then I would confirm the details, offer the best solution we have, like a replacement or a refund, and follow up to make sure it was resolved.';

  // ---------- Routing ----------
  function route() {
    const hash = location.hash.replace('#', '');
    if (hash.startsWith('apply/')) return showApply(hash.slice(6));
    showView(hash === 'applications' ? 'applications' : 'positions');
  }
  function showView(view) {
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === view)));
    $('#view-positions').classList.toggle('hidden', view !== 'positions');
    $('#view-applications').classList.toggle('hidden', view !== 'applications');
    $('#view-apply').classList.add('hidden');
    if (view === 'positions') renderPositions();
    if (view === 'applications') renderApplications();
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => { location.hash = t.dataset.view; }));
  window.addEventListener('hashchange', route);

  // ---------- Positions ----------
  function openPositions() { return Store.positions().filter((p) => p.status === 'open'); }

  function fillFilters() {
    const ps = openPositions();
    const opts = (sel, values) => {
      const el = $(sel); const keep = el.value;
      el.length = 1;
      [...new Set(values)].sort().forEach((v) => el.add(new Option(v, v)));
      el.value = keep;
    };
    opts('#f-category', ps.map((p) => p.category));
    opts('#f-location', ps.map((p) => p.location));
    opts('#f-type', ps.map((p) => p.type));
  }

  function renderPositions() {
    fillFilters();
    const q = $('#f-search').value.trim().toLowerCase();
    const cat = $('#f-category').value, loc = $('#f-location').value, type = $('#f-type').value;
    const applied = new Set(Store.myApplications().map((c) => c.positionId));
    const list = openPositions().filter((p) =>
      (!q || (p.title + ' ' + p.requirements.join(' ') + ' ' + p.category).toLowerCase().includes(q)) &&
      (!cat || p.category === cat) && (!loc || p.location === loc) && (!type || p.type === type));

    $('#result-count').textContent = `${list.length} open position${list.length === 1 ? '' : 's'}`;
    $('#positions').innerHTML = list.length ? list.map((p) => {
      const client = Store.client(p.clientId);
      return `<article class="card position-card">
        <div class="row between"><span class="badge">${esc(p.category)}</span>${p.isNew ? '<span class="badge new">New</span>' : `<span class="small muted">${esc(timeAgo(p.createdAt))}</span>`}</div>
        <h3>${esc(p.title)}</h3>
        <div class="small muted">${esc(client ? client.name : '')}</div>
        <div class="meta"><span>📍 ${esc(p.location)}</span><span>🕒 ${esc(p.type)}</span>${p.pay ? `<span>💵 ${esc(p.pay)}</span>` : ''}<span>👥 Hiring ${esc(p.headcount)}</span></div>
        <div class="small muted">${esc(p.schedule)}</div>
        <div class="chips">${p.requirements.slice(0, 4).map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div>
        <div class="actions">${applied.has(p.id)
          ? '<span class="badge tone-good">✓ Applied</span><a class="btn btn-sm" href="#applications">View status</a>'
          : `<span></span><a class="btn btn-primary btn-sm" href="#apply/${esc(p.id)}">Apply now</a>`}</div>
      </article>`;
    }).join('') : '<div class="empty">No positions match your filters.</div>';
  }
  ['#f-search', '#f-category', '#f-location', '#f-type'].forEach((sel) => $(sel).addEventListener('input', renderPositions));

  // ---------- Apply ----------
  let voiceNote = null;   // { fileName, duration, recorded }
  let audioUrl = null;    // in-memory preview only; audio is not persisted in the demo
  let cvFileName = '';
  let recorder = null, recTimer = null;

  function showApply(positionId) {
    const p = Store.position(positionId);
    if (!p) { location.hash = 'positions'; return; }
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
    $('#view-positions').classList.add('hidden');
    $('#view-applications').classList.add('hidden');
    const view = $('#view-apply');
    view.classList.remove('hidden');
    voiceNote = null; cvFileName = ''; audioUrl = null;

    const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    view.innerHTML = `
      <a href="#positions" class="small">← Back to positions</a>
      <div class="card" style="margin-top:12px">
        <div class="row between" style="align-items:flex-start">
          <div><h2 style="margin-bottom:4px">${esc(p.title)}</h2>
            <div class="meta"><span>📍 ${esc(p.location)}</span><span>🕒 ${esc(p.type)} · ${esc(p.schedule)}</span>${p.pay ? `<span>💵 ${esc(p.pay)}</span>` : ''}</div></div>
          <button type="button" class="btn btn-sm" id="fill-sample">⚡ Fill sample</button>
        </div>
        ${p.description ? `<p class="muted" style="margin:12px 0 0">${esc(p.description)}</p>` : ''}
      </div>

      <form class="form card" id="apply-form" novalidate style="margin-top:16px">
        <h3>1. Your details</h3>
        <div class="form-grid">
          <div class="field"><label for="a-name">Full name *</label><input type="text" id="a-name" required autocomplete="name"></div>
          <div class="field"><label for="a-email">Email *</label><input type="email" id="a-email" required autocomplete="email"></div>
          <div class="field"><label for="a-phone">Phone</label><input type="tel" id="a-phone" autocomplete="tel"></div>
          <div class="field"><label for="a-location">City, State</label><input type="text" id="a-location" autocomplete="address-level2"></div>
          <div class="field"><label for="a-exp">Years of relevant experience</label>
            <select id="a-exp">${Array.from({ length: 11 }, (_, i) => `<option value="${i}">${i === 0 ? 'None / entry-level' : i === 10 ? '10+' : i}</option>`).join('')}</select></div>
          <div class="field"><label for="a-english">English level</label>
            <select id="a-english"><option>Native</option><option selected>Fluent</option><option>Conversational</option><option>Basic</option></select></div>
          <div class="field"><label for="a-avail">Availability</label>
            <select id="a-avail"><option>Immediately</option><option>In 1 week</option><option>In 2 weeks</option></select></div>
          <div class="field"><span class="label">Languages</span>
            <div class="check-group"><label class="check"><input type="checkbox" name="lang" value="English" checked> English</label><label class="check"><input type="checkbox" name="lang" value="Spanish"> Spanish</label></div></div>
        </div>

        <div class="field"><span class="label">Which of these requirements do you meet?</span>
          <div class="check-group">${p.requirements.map((r) => `<label class="check"><input type="checkbox" name="req" value="${esc(r)}"> ${esc(r)}</label>`).join('')}</div></div>

        <h3>2. CV</h3>
        <div class="file-drop">
          <label class="btn btn-sm" for="a-cv">Choose file</label>
          <input type="file" id="a-cv" accept=".pdf,.doc,.docx,.txt" class="sr-only">
          <span id="cv-name" class="small muted">PDF or Word. Only the file name is kept in this demo.</span>
        </div>

        <h3>3. Voice note <span class="small muted" style="font-weight:400">(up to 60 seconds)</span></h3>
        <p class="small muted" style="margin:-8px 0 0">Introduce yourself: who you are, your experience and why you want this job.</p>
        <div class="file-drop" style="display:grid;gap:12px">
          <div class="recorder" id="recorder">
            ${canRecord ? '<button type="button" class="btn btn-sm" id="rec-btn">🎙️ Record</button>' : '<span class="small muted">Recording is not supported in this browser.</span>'}
            <span class="small muted">or</span>
            <label class="btn btn-sm" for="a-voice">Upload audio</label>
            <input type="file" id="a-voice" accept="audio/*" class="sr-only">
          </div>
          <div id="voice-status" class="small muted">No voice note yet.</div>
        </div>

        <h3>4. Quick role-play</h3>
        <div class="field"><label for="a-roleplay">${esc(p.roleplayPrompt || 'How would you handle an upset customer?')}</label>
          <textarea id="a-roleplay" placeholder="Write what you would say or do (2–4 sentences)."></textarea></div>

        <label class="check" style="border-radius:var(--radius-sm)"><input type="checkbox" id="a-consent" checked> I agree that my application is reviewed with the help of AI and by a recruiter.</label>

        <div class="form-actions">
          <a class="btn" href="#positions">Cancel</a>
          <button type="submit" class="btn btn-primary">Submit application</button>
        </div>
      </form>`;

    $('#a-cv').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) setCv(f.name);
    });
    $('#a-voice').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      audioUrl = URL.createObjectURL(f);
      voiceNote = { fileName: f.name, duration: 0, recorded: false };
      // Read the real duration when the browser can decode the file.
      const probe = new Audio(audioUrl);
      probe.addEventListener('loadedmetadata', () => {
        if (isFinite(probe.duration)) { voiceNote.duration = Math.round(probe.duration); paintVoice(); }
      });
      paintVoice();
    });
    if (canRecord) $('#rec-btn').addEventListener('click', toggleRecording);
    $('#fill-sample').addEventListener('click', () => fillSample(p));
    $('#apply-form').addEventListener('submit', (e) => { e.preventDefault(); submit(p); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setCv(name) {
    cvFileName = name;
    $('#cv-name').innerHTML = `📄 <strong>${esc(name)}</strong>`;
  }

  function paintVoice() {
    const el = $('#voice-status');
    if (!el) return;
    if (!voiceNote) { el.textContent = 'No voice note yet.'; return; }
    el.innerHTML = `<div class="row">🎧 <strong>${esc(voiceNote.fileName)}</strong>${voiceNote.duration ? `<span class="muted">${voiceNote.duration}s</span>` : ''}
      ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : '<span class="badge">sample</span>'}
      <button type="button" class="link-btn small" id="voice-remove">Remove</button></div>`;
    $('#voice-remove').addEventListener('click', () => { voiceNote = null; audioUrl = null; paintVoice(); });
  }

  async function toggleRecording() {
    const btn = $('#rec-btn');
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      toast('Microphone not available. You can upload an audio file instead.');
      return;
    }
    const chunks = [];
    const started = Date.now();
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      clearInterval(recTimer);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      audioUrl = URL.createObjectURL(blob);
      voiceNote = { fileName: 'voice-note.' + ((recorder.mimeType || '').includes('mp4') ? 'm4a' : 'webm'), duration: Math.max(1, Math.round((Date.now() - started) / 1000)), recorded: true };
      btn.innerHTML = '🎙️ Record again';
      paintVoice();
    };
    recorder.start();
    btn.innerHTML = '<span class="rec-dot"></span> Stop';
    const tick = () => {
      const s = Math.round((Date.now() - started) / 1000);
      $('#voice-status').innerHTML = `<span class="rec-time">Recording… 0:${String(s).padStart(2, '0')}</span> / 1:00`;
      if (s >= 60) recorder.stop();
    };
    tick();
    recTimer = setInterval(tick, 500);
  }

  function fillSample(p) {
    const person = SAMPLE_PEOPLE[Math.floor(Math.random() * SAMPLE_PEOPLE.length)];
    $('#a-name').value = person.name;
    $('#a-email').value = person.email;
    $('#a-phone').value = person.phone;
    $('#a-location').value = person.location;
    $('#a-exp').value = '3';
    $('#a-english').value = 'Fluent';
    $$('input[name="lang"]').forEach((i) => { i.checked = true; });
    $$('input[name="req"]').forEach((i, idx) => { i.checked = idx !== p.requirements.length - 1; });
    $('#a-roleplay').value = SAMPLE_ANSWER;
    setCv(person.name.toLowerCase().replace(' ', '_') + '_resume.pdf');
    if (!voiceNote) { voiceNote = { fileName: 'sample_voice_note.webm', duration: 38, recorded: false }; paintVoice(); }
    toast('Sample data filled. Review and submit.');
  }

  function submit(p) {
    const name = $('#a-name').value.trim();
    const email = $('#a-email').value.trim();
    const errors = [];
    if (!name) errors.push('your name');
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('a valid email');
    if (!cvFileName) errors.push('your CV');
    if (errors.length) { toast('Please add ' + errors.join(', ') + '.'); return; }

    const candidate = Store.addCandidate({
      name, email,
      phone: $('#a-phone').value.trim(),
      location: $('#a-location').value.trim(),
      positionId: p.id,
      experienceYears: Number($('#a-exp').value),
      englishLevel: $('#a-english').value,
      availability: $('#a-avail').value,
      languages: $$('input[name="lang"]:checked').map((i) => i.value),
      skills: $$('input[name="req"]:checked').map((i) => i.value),
      cvFile: cvFileName,
      voiceNote: voiceNote ? { fileName: voiceNote.fileName, duration: voiceNote.duration } : null,
      roleplayAnswer: $('#a-roleplay').value.trim(),
    });

    $('#view-apply').innerHTML = `
      <div class="card stack" style="max-width:720px;margin:0 auto;text-align:center">
        <div style="font-size:2.4rem">✅</div>
        <h2>Application sent!</h2>
        <p class="muted">Thanks, ${esc(name.split(' ')[0])}. Your application for <strong>${esc(p.title)}</strong> is being reviewed.
          You can follow every step here.</p>
        ${tracker(candidate, p.stages)}
        <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#applications">Track my applications</a><a class="btn" href="#positions">See more positions</a></div>
      </div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- My applications ----------
  function renderApplications() {
    const apps = Store.myApplications();
    $('#applications').innerHTML = apps.length ? apps.map((c) => {
      const p = Store.position(c.positionId) || { title: 'Position closed', stages: window.MOCK.STAGES.map((s) => s.id) };
      const last = c.history[c.history.length - 1];
      return `<article class="card stack">
        <div class="row between">
          <div><h3 style="margin:0">${esc(p.title)}</h3><div class="small muted">Applied ${esc(fmtDate(c.appliedAt))} · Last update ${esc(timeAgo(last.at))}</div></div>
          ${stageBadge(c.stage)}
        </div>
        ${tracker(c, p.stages)}
        <p class="small muted" style="margin:0">${statusMessage(c)}</p>
      </article>`;
    }).join('') : `<div class="empty">You haven't applied to any position from this device yet.<br><br><a class="btn btn-primary" href="#positions">Browse open positions</a></div>`;
  }

  function statusMessage(c) {
    return {
      applied: 'We received your application. Our AI-assisted screening is reviewing it now.',
      screened: 'Your profile passed the initial screening. A recruiter will contact you about next steps.',
      roleplay: 'You have been invited to a short role-play exercise. Check your email for the link.',
      interview: 'Interview stage: a recruiter will schedule a call with you.',
      approved: '🎉 Congratulations! You have been approved and shared with the hiring company.',
      declined: 'Thank you for applying. We will keep your profile in our talent pool for future roles.',
    }[c.stage] || '';
  }

  function updateCount() { $('#my-count').textContent = Store.myApplications().length; }

  // Re-render when another tab (e.g. the admin dashboard) changes the data.
  Store.subscribe(() => {
    updateCount();
    if (!$('#view-applications').classList.contains('hidden')) renderApplications();
    if (!$('#view-positions').classList.contains('hidden')) renderPositions();
  });

  updateCount();
  route();
})();
