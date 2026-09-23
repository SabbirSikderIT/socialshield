GameKit.register(kit => {
  const ICONS = ['📚', '☕', '🎧', '🐱', '🌙', '🌱', '🧸', '🕯️', '🍵', '🛋️', '🎮', '🌧️'];
  let level = 1;
  function round() {
    kit.clear(); kit.setLevel(level);
    const pairs = Math.min(12, 4 + level * 2);
    const cols = pairs <= 6 ? 4 : 6;
    const deck = kit.shuffle([...ICONS.slice(0, pairs), ...ICONS.slice(0, pairs)]);
    const grid = kit.el(`<div class="mm-grid" style="grid-template-columns:repeat(${cols},auto)"></div>`);
    let open = [], found = 0, moves = 0, lock = false, t0 = Date.now();
    deck.forEach(ic => {
      const c = kit.el(`<div class="mm-card"><span>${ic}</span></div>`);
      c.addEventListener('click', () => {
        if (lock || c.classList.contains('flip') || c.classList.contains('done')) return;
        c.classList.add('flip'); open.push({ c, ic });
        if (open.length === 2) {
          moves++; lock = true;
          const [a, b] = open;
          if (a.ic === b.ic) {
            a.c.classList.add('done'); b.c.classList.add('done'); found++; open = []; lock = false; kit.addScore(50);
            if (found === pairs) {
              const bonus = Math.max(0, pairs * 30 - moves * 10) + Math.max(0, 120 - Math.round((Date.now() - t0) / 1000)) * 2;
              kit.addScore(bonus);
              if (level < 4) { level++; kit.timeout(round, 900); } else kit.timeout(() => kit.over('All matched! 🧠', 'Your memory is cosy and sharp.'), 700);
            }
          } else kit.timeout(() => { a.c.classList.remove('flip'); b.c.classList.remove('flip'); open = []; lock = false; }, 800);
        }
      });
      grid.appendChild(c);
    });
    kit.root.appendChild(grid);
  }
  round();
});
