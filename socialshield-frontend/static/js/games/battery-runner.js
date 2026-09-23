GameKit.register(kit => {
  const ctx = kit.canvas(720, 440);
  const GROUND = 370;
  const p = { x: 110, y: GROUND, vy: 0, onGround: true };
  let obs = [], bats = [], clouds = [], t = 0, speed = 260, spawn = 1, bspawn = 2, energy = 100, dist = 0;
  const OBST = ['🎉', '🎤', '🎊', '👯', '🎈', '📸'];
  const jump = () => { if (p.onGround) { p.vy = -620; p.onGround = false; } };
  kit.key(e => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') jump(); });
  kit.on(kit.cv, 'pointerdown', jump);
  for (let i = 0; i < 5; i++) clouds.push({ x: kit.rand(0, 720), y: kit.rand(30, 160), s: kit.rand(.2, .5) });

  kit.loop(dt => {
    t += dt; speed += dt * 6; dist += speed * dt; energy -= dt * 4;
    kit.setScore(dist / 10); kit.setLevel(1 + Math.floor(t / 20));
    p.vy += 1700 * dt; p.y += p.vy * dt;
    if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
    spawn -= dt; bspawn -= dt;
    if (spawn <= 0) { spawn = kit.rand(0.9, 1.8) * 260 / speed + 0.35; obs.push({ x: 760, e: kit.pick(OBST), big: Math.random() < .25 }); }
    if (bspawn <= 0) { bspawn = kit.rand(1.5, 3); bats.push({ x: 760, y: kit.pick([GROUND - 10, GROUND - 110, GROUND - 160]) }); }
    obs.forEach(o => o.x -= speed * dt); bats.forEach(b => b.x -= speed * dt); clouds.forEach(c => { c.x -= speed * c.s * dt; if (c.x < -60) c.x = 780; });
    obs = obs.filter(o => o.x > -40); bats = bats.filter(b => b.x > -40 && !b.got);
    for (const o of obs) {
      const h = o.big ? 60 : 36;
      if (Math.abs(o.x - p.x) < (o.big ? 30 : 24) && p.y > GROUND - h + 6) { draw(); kit.over('Party caught you! 🎉', `You ran ${Math.round(dist / 10)} m toward home.`); return false; }
    }
    for (const b of bats) if (Math.abs(b.x - p.x) < 30 && Math.abs(b.y - (p.y - 20)) < 40) { b.got = true; energy = Math.min(100, energy + 25); kit.addScore(30); dist += 300; }
    if (energy <= 0) { draw(); kit.over('Battery empty 😴', 'Remember to recharge between events!'); return false; }
    draw();
  });

  function draw() {
    ctx.clearRect(0, 0, 720, 440);
    clouds.forEach(c => kit.emoji(ctx, '☁️', c.x, c.y, 40));
    kit.emoji(ctx, '🏠', 690, GROUND - 20, 44);
    kit.roundRect(ctx, 0, GROUND + 20, 720, 60, 0, 'rgba(116,198,157,.45)');
    obs.forEach(o => kit.emoji(ctx, o.e, o.x, GROUND - (o.big ? 12 : 2), o.big ? 56 : 36));
    bats.forEach(b => kit.emoji(ctx, '🔋', b.x, b.y, 30));
    kit.emoji(ctx, p.onGround ? '🏃' : '🤸', p.x, p.y - 4, 44);
    kit.roundRect(ctx, 14, 14, 160, 18, 9, 'rgba(255,255,255,.7)');
    kit.roundRect(ctx, 16, 16, 156 * Math.max(0, energy) / 100, 14, 7, energy > 40 ? '#84fab0' : '#e76f7f');
    kit.text(ctx, '🔋 social battery', 184, 23, 13);
  }
});
