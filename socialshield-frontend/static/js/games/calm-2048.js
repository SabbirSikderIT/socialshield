GameKit.register(kit => {
  const COLORS = { 2: '#fde2e4', 4: '#fad2e1', 8: '#e2ece9', 16: '#bee1e6', 32: '#dfe7fd', 64: '#cddafd', 128: '#e8dcff', 256: '#d0bfff',
                   512: '#ffd6a5', 1024: '#fdffb6', 2048: '#caffbf' };
  kit.touch([{ label: '⬅', key: 'ArrowLeft' }, { label: '⬆', key: 'ArrowUp' }, { label: '⬇', key: 'ArrowDown' }, { label: '➡', key: 'ArrowRight' }]);
  let g = Array.from({ length: 4 }, () => Array(4).fill(0)), won = false;
  const board = kit.el('<div class="g2048"></div>');
  kit.root.appendChild(board);
  function add() {
    const e = []; g.forEach((r, y) => r.forEach((v, x) => !v && e.push([y, x])));
    if (e.length) { const [y, x] = kit.pick(e); g[y][x] = Math.random() < .9 ? 2 : 4; }
  }
  function draw() {
    board.innerHTML = g.flat().map(v => `<div class="t2048" style="background:${v ? COLORS[v] || '#b8f2e6' : ''};${v >= 1024 ? 'font-size:1.2rem' : ''}">${v || ''}</div>`).join('');
    kit.setLevel(Math.max(1, Math.log2(Math.max(...g.flat()) || 2) - 1));
  }
  function slide(row) {
    const a = row.filter(Boolean);
    for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; kit.addScore(a[i]); a.splice(i + 1, 1); if (a[i] === 2048) won = true; }
    while (a.length < 4) a.push(0);
    return a;
  }
  const rotate = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
  function move(dir) { // 0 left, 1 up, 2 right, 3 down
    let m = g.map(r => [...r]);
    const turns = { 0: 0, 1: 3, 2: 2, 3: 1 }[dir];
    for (let i = 0; i < turns; i++) m = rotate(m);
    m = m.map(slide);
    for (let i = 0; i < (4 - turns) % 4; i++) m = rotate(m);
    if (JSON.stringify(m) !== JSON.stringify(g)) { g = m; add(); draw(); }
    if (won) { won = false; toast('🎉 2048! Keep going if you like'); }
    const canMove = g.some((r, y) => r.some((v, x) => !v || (x < 3 && v === r[x + 1]) || (y < 3 && v === g[y + 1][x])));
    if (!canMove) kit.over('No more moves', 'Take a breath, then try again 🌿');
  }
  kit.key(e => {
    const d = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowright: 2, d: 2, arrowdown: 3, s: 3 }[e.key.toLowerCase()];
    if (d !== undefined) move(d);
  });
  let sx, sy;
  kit.on(board, 'touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  kit.on(board, 'touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 0) : (dy > 0 ? 3 : 1));
  });
  add(); add(); draw();
});
