/* Landing page: live numbers and a small preview built from the demo data. */
(function () {
  const { $, esc, avatar, scoreRing, stageBadge } = window.UI;
  const positions = Store.positions().filter((p) => p.status === 'open');
  const candidates = Store.candidates();
  const scored = candidates.filter((c) => c.ai && c.ai.status === 'done');
  const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.ai.score, 0) / scored.length) : 0;

  $('[data-stat="positions"]').textContent = positions.length;
  $('[data-stat="candidates"]').textContent = candidates.length;
  $('[data-stat="score"]').textContent = avg;

  const top = scored.slice().sort((a, b) => b.ai.score - a.ai.score).slice(0, 3);
  $('#hero-preview').innerHTML = top.map((c) => {
    const p = Store.position(c.positionId);
    return `<div class="card"><div class="preview-row">${avatar(c.name)}
      <div class="grow"><strong>${esc(c.name)}</strong><div class="small muted">${esc(p ? p.title : '')}</div></div>
      ${stageBadge(c.stage)} ${scoreRing(c.ai.score, 46)}</div>
      <p class="small muted" style="margin:10px 0 0">${esc(c.ai.summary[0])}</p></div>`;
  }).join('');
})();
