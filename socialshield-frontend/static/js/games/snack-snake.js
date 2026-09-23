GameKit.register(kit => {
  const C = 24, COLS = 30, ROWS = 18;
  const ctx = kit.canvas(COLS * C, ROWS * C);
  kit.touch([{ label: '⬅', key: 'ArrowLeft' }, { label: '⬆', key: 'ArrowUp' }, { label: '⬇', key: 'ArrowDown' }, { label: '➡', key: 'ArrowRight' }]);
  const SNACKS = ['🍩', '🥟', '🍕', '🧁', '🍪', '🍫', '🥤', '🍿'];
  let snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }], dir = { x: 1, y: 0 }, next = dir, food, people = [], acc = 0, step = 0.13;
  const free = () => { let c; do { c = { x: kit.randi(0, COLS - 1), y: kit.randi(0, ROWS - 1) }; } while (snake.some(s => s.x === c.x && s.y === c.y) || people.some(p => p.x === c.x && p.y === c.y)); return c; };
  food = { ...free(), e: kit.pick(SNACKS) };
  kit.key(e => {
    const k = e.key.toLowerCase();
    const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
    if (m && (m[0] !== -dir.x || m[1] !== -dir.y)) next = { x: m[0], y: m[1] };
  });
  let sx, sy;
  kit.on(kit.cv, 'touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  kit.on(kit.cv, 'touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    const m = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    if (m[0] !== -dir.x || m[1] !== -dir.y) next = { x: m[0], y: m[1] };
  });
  kit.loop(dt => {
    acc += dt;
    if (acc >= step) {
      acc = 0; dir = next;
      const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || snake.some(s => s.x === h.x && s.y === h.y) || people.some(p => p.x === h.x && p.y === h.y)) {
        draw(); kit.over('Oops, social collision!', `You collected ${snake.length - 3} snacks.`); return false;
      }
      snake.unshift(h);
      if (h.x === food.x && h.y === food.y) {
        kit.addScore(10 * kit.level); food = { ...free(), e: kit.pick(SNACKS) };
        if ((snake.length - 3) % 5 === 0) { kit.setLevel(kit.level + 1); step = Math.max(0.06, step - 0.012); people.push(free()); }
      } else snake.pop();
    }
    draw();
  });
  function draw() {
    ctx.clearRect(0, 0, COLS * C, ROWS * C);
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2) { ctx.fillStyle = 'rgba(232,220,255,.35)'; ctx.fillRect(x * C, y * C, C, C); }
    people.forEach(p => kit.emoji(ctx, '🧍', p.x * C + C / 2, p.y * C + C / 2, 20));
    kit.emoji(ctx, food.e, food.x * C + C / 2, food.y * C + C / 2, 20);
    snake.forEach((s, i) => kit.roundRect(ctx, s.x * C + 2, s.y * C + 2, C - 4, C - 4, 8, i ? `hsl(${270 - i * 4},70%,${75 - Math.min(20, i)}%)` : '#8e6bbf'));
    kit.emoji(ctx, '👀', snake[0].x * C + C / 2, snake[0].y * C + C / 2, 14);
  }
});
