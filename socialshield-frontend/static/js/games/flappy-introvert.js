GameKit.register(kit => {
  const ctx = kit.canvas(720, 440);
  const bird = { x: 150, y: 200, vy: 0 };
  let pipes = [], t = 0, spawn = 0, started = false, passed = 0;
  const CROWD = ['🧍', '🕺', '💃', '🧑‍🤝‍🧑', '🗣️', '🤳'];
  const flap = () => { started = true; bird.vy = -330; };
  kit.key(e => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') flap(); });
  kit.on(kit.cv, 'pointerdown', flap);
  kit.loop(dt => {
    t += dt;
    if (started) {
      bird.vy += 950 * dt; bird.y += bird.vy * dt;
      spawn -= dt;
      const gap = Math.max(120, 175 - passed * 2);
      if (spawn <= 0) { spawn = 1.55; const top = kit.rand(50, 440 - gap - 50); pipes.push({ x: 760, top, gap, seed: Math.random() }); }
      const speed = 170 + passed * 3;
      pipes.forEach(p => p.x -= speed * dt);
      pipes = pipes.filter(p => p.x > -80);
      for (const p of pipes) {
        if (!p.done && p.x + 30 < bird.x) { p.done = true; passed++; kit.addScore(10); kit.setLevel(1 + Math.floor(passed / 10)); }
        if (bird.x + 16 > p.x - 30 && bird.x - 16 < p.x + 30 && (bird.y - 14 < p.top || bird.y + 14 > p.top + p.gap)) { draw(); kit.over('Bumped into the crowd!', `You slipped past ${passed} groups.`); return false; }
      }
      if (bird.y > 430 || bird.y < -20) { draw(); kit.over('Oops!', `You slipped past ${passed} groups.`); return false; }
    } else bird.y = 200 + Math.sin(t * 3) * 10;
    draw();
  });
  function draw() {
    ctx.clearRect(0, 0, 720, 440);
    pipes.forEach(p => {
      kit.roundRect(ctx, p.x - 30, 0, 60, p.top, 14, 'rgba(255,143,171,.55)');
      kit.roundRect(ctx, p.x - 30, p.top + p.gap, 60, 440 - p.top - p.gap, 14, 'rgba(255,143,171,.55)');
      for (let y = p.top - 22; y > 0; y -= 40) kit.emoji(ctx, CROWD[Math.floor(p.seed * 10 + y) % CROWD.length], p.x, y, 28);
      for (let y = p.top + p.gap + 22; y < 440; y += 40) kit.emoji(ctx, CROWD[Math.floor(p.seed * 10 + y) % CROWD.length], p.x, y, 28);
    });
    ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(Math.max(-.5, Math.min(.8, bird.vy / 600)));
    kit.emoji(ctx, '🐦', 0, 0, 34); ctx.restore();
    if (!started) kit.text(ctx, 'Tap / Space to flap', 360, 300, 22, '#8e6bbf', 'center');
  }
});
