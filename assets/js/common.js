/*
 * Shared layout (header, demo banner, footer), theme switching and small UI helpers.
 */
(function () {
  const CFG = window.APP_CONFIG;
  const STAGE_LABELS = Object.fromEntries(window.MOCK.STAGES.map((s) => [s.id, s.label]));

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // ---------- Theme ----------
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'light'; }
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(CFG.themeKey, theme); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }

  // ---------- Layout ----------
  const LOGO = `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M21 11.2a6.5 6.5 0 1 0 0 9.6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;
  const ICON_SUN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_MOON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

  const NAV = [
    { id: 'home', href: 'index.html', label: 'Overview' },
    { id: 'candidate', href: 'candidate.html', label: 'Candidates' },
    { id: 'client', href: 'client.html', label: 'Clients' },
    { id: 'admin', href: 'admin.html', label: 'Admin' },
  ];

  function renderLayout() {
    const page = document.body.dataset.page;
    const pageTitle = document.body.dataset.title;
    document.title = pageTitle ? `${pageTitle} · ${CFG.brand}` : `${CFG.brand} · ${CFG.tagline}`;
    $$('[data-brand]').forEach((el) => { el.textContent = CFG.brand; });

    const banner = document.createElement('div');
    banner.className = 'demo-banner';
    banner.innerHTML = `<span><strong>Prototype</strong> · All companies, people and data are fictional demo data.</span>
      <button type="button" class="link-btn" data-reset>Reset demo data</button>`;

    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `<div class="container header-inner">
        <a class="brand" href="index.html">${LOGO}<span>${esc(CFG.brand)}</span></a>
        <nav class="main-nav" aria-label="Main">
          ${NAV.map((n) => `<a href="${n.href}" ${n.id === page ? 'aria-current="page"' : ''}>${n.label}</a>`).join('')}
        </nav>
        <button type="button" class="icon-btn" data-theme-toggle aria-label="Toggle dark mode"></button>
      </div>`;

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `<div class="container footer-inner">
        <span>Prototype by ${esc(CFG.author)} · ${esc(CFG.authorRole)}</span>
        <span class="muted">Demo data is stored only in your browser.</span>
      </div>`;

    document.body.prepend(header);
    document.body.prepend(banner);
    document.body.append(footer);

    const toggle = $('[data-theme-toggle]');
    const paintToggle = () => { toggle.innerHTML = currentTheme() === 'dark' ? ICON_SUN : ICON_MOON; };
    paintToggle();
    toggle.addEventListener('click', () => { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); paintToggle(); });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-reset]')) return;
      if (!confirm('Reset all demo data? Positions and applications you created will be removed.')) return;
      window.Store.reset();
      location.reload();
    });
  }

  // ---------- Formatting ----------
  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function timeAgo(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 45) return 'just now';
    const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24); if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
    return fmtDate(ts);
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }
  function avatar(name, size) {
    let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `<span class="avatar" style="--h:${h};${size ? `--size:${size}px` : ''}" aria-hidden="true">${esc(initials(name))}</span>`;
  }

  function stageLabel(id) { return STAGE_LABELS[id] || id; }
  function stageBadge(id) { return `<span class="badge stage-${esc(id)}">${esc(stageLabel(id))}</span>`; }

  function scoreTone(score) { return score >= 80 ? 'good' : score >= 65 ? 'ok' : 'low'; }
  function scoreRing(score, size) {
    size = size || 56;
    return `<span class="score-ring tone-${scoreTone(score)}" style="--p:${score};--size:${size}px" role="img" aria-label="AI score ${score} out of 100"><span>${score}</span></span>`;
  }
  function scoreBar(label, value) {
    return `<div class="score-bar"><div class="score-bar-head"><span>${esc(label)}</span><strong>${value}</strong></div>
      <div class="bar-track"><div class="bar-fill tone-${scoreTone(value)}" style="width:${value}%"></div></div></div>`;
  }

  /** Stage tracker for a candidate. `stages` comes from the position configuration. */
  function tracker(candidate, stages) {
    const flow = stages.filter((s) => s !== 'approved' && s !== 'declined');
    const outcome = candidate.stage === 'declined' ? 'declined' : 'approved';
    const steps = flow.concat(outcome);
    const reached = new Set(candidate.history.map((h) => h.stage));
    const currentIdx = steps.indexOf(candidate.stage);
    return `<ol class="tracker">${steps.map((s, i) => {
      const done = reached.has(s) && i < currentIdx;
      const current = i === currentIdx;
      const skipped = !reached.has(s) && i < currentIdx;
      const cls = current ? (s === 'declined' ? 'is-declined' : s === 'approved' ? 'is-done is-final' : 'is-current') : done ? 'is-done' : skipped ? 'is-skipped' : '';
      const at = candidate.history.slice().reverse().find((h) => h.stage === s);
      return `<li class="${cls}"><span class="dot" aria-hidden="true"></span><span class="t-label">${esc(stageLabel(s))}</span>
        <span class="t-date">${at ? esc(fmtDate(at.at)) : skipped ? 'Skipped' : ''}</span></li>`;
    }).join('')}</ol>`;
  }

  // ---------- Feedback ----------
  function toast(message, tone) {
    let host = $('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('aria-live', 'polite'); document.body.append(host); }
    const t = document.createElement('div');
    t.className = 'toast' + (tone ? ' toast-' + tone : '');
    t.textContent = message;
    host.append(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  /** Slide-over panel. Returns the panel body element. */
  function openDrawer(html, onClose) {
    closeDrawer();
    const wrap = document.createElement('div');
    wrap.className = 'drawer-wrap';
    wrap.innerHTML = `<div class="drawer-backdrop" data-close></div>
      <aside class="drawer" role="dialog" aria-modal="true">
        <button type="button" class="icon-btn drawer-close" data-close aria-label="Close">✕</button>
        <div class="drawer-body">${html}</div>
      </aside>`;
    document.body.append(wrap);
    document.body.classList.add('no-scroll');
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawer(); });
    wrap._onClose = onClose;
    requestAnimationFrame(() => wrap.classList.add('open'));
    return $('.drawer-body', wrap);
  }
  function closeDrawer() {
    const wrap = $('.drawer-wrap');
    if (!wrap) return;
    if (wrap._onClose) wrap._onClose();
    wrap.remove();
    document.body.classList.remove('no-scroll');
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  window.UI = {
    $, $$, esc, fmtDate, timeAgo, avatar, initials, stageLabel, stageBadge,
    scoreTone, scoreRing, scoreBar, tracker, toast, openDrawer, closeDrawer, setTheme, currentTheme,
  };

  renderLayout();
})();
