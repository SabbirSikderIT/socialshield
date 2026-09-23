GameKit.register(kit => {
  const W = 12, H = 10, MINES = 16;
  let cells, first = true, opened = 0, dead = false, flags = 0, t0 = Date.now();
  const box = kit.el(`<div style="text-align:center;padding:1rem"><p class="fredoka mb-2">💬 mines: <span id="mt-left">${MINES}</span></p>
    <div class="mine-grid" id="mt-grid" style="grid-template-columns:repeat(${W},auto);justify-content:center"></div></div>`);
  kit.root.appendChild(box);
  const grid = box.querySelector('#mt-grid');
  cells = Array.from({ length: W * H }, (_, i) => ({ i, x: i % W, y: Math.floor(i / W), mine: false, open: false, flag: false, n: 0 }));
  const nb = c => cells.filter(o => Math.abs(o.x - c.x) <= 1 && Math.abs(o.y - c.y) <= 1 && o !== c);
  function plant(safe) {
    const pool = kit.shuffle(cells.filter(c => Math.abs(c.x - safe.x) > 1 || Math.abs(c.y - safe.y) > 1)).slice(0, MINES);
    pool.forEach(c => c.mine = true);
    cells.forEach(c => c.n = nb(c).filter(o => o.mine).length);
  }
  const COLORS = ['', '#7fb7e6', '#74c69d', '#e76f7f', '#8e6bbf', '#f4a259', '#2a9d8f', '#3d3553', '#999'];
  cells.forEach(c => {
    c.el = kit.el('<button class="mcell"></button>');
    c.el.addEventListener('click', () => reveal(c));
    c.el.addEventListener('contextmenu', e => { e.preventDefault(); flag(c); });
    let lp; c.el.addEventListener('touchstart', () => { lp = setTimeout(() => { flag(c); lp = null; }, 450); }, { passive: true });
    c.el.addEventListener('touchend', e => { if (lp) clearTimeout(lp); else e.preventDefault(); });
    grid.appendChild(c.el);
  });
  function flag(c) {
    if (c.open || dead) return;
    c.flag = !c.flag; flags += c.flag ? 1 : -1;
    c.el.textContent = c.flag ? '🚩' : '';
    box.querySelector('#mt-left').textContent = MINES - flags;
  }
  function reveal(c) {
    if (dead || c.open || c.flag) return;
    if (first) { plant(c); first = false; }
    if (c.mine) {
      dead = true;
      cells.filter(m => m.mine).forEach(m => { m.el.textContent = '💬'; m.el.classList.add('boom'); });
      return kit.timeout(() => kit.over('Small talk ambush! 💬', 'Someone asked about the weather for 20 minutes.'), 700);
    }
    const stack = [c];
    while (stack.length) {
      const k = stack.pop();
      if (k.open || k.flag) continue;
      k.open = true; opened++; k.el.classList.add('open');
      k.el.textContent = k.n || ''; k.el.style.color = COLORS[k.n];
      if (!k.n) nb(k).forEach(o => !o.open && !o.mine && stack.push(o));
    }
    kit.setScore(opened * 5);
    if (opened === W * H - MINES) {
      dead = true;
      kit.addScore(Math.max(0, 300 - Math.round((Date.now() - t0) / 1000)) * 3);
      kit.over('Conversation cleared! 🎉', 'You navigated the party without a single awkward chat.');
    }
  }
});
