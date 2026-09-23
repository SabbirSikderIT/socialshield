GameKit.register(kit => {
  const ctx = kit.canvas(720, 440);
  const WORRIES = ['stress', 'worry', 'awkward', 'fear', 'noise', 'crowd', 'doubt', 'rush', 'panic', 'deadline'];
  let bubbles = [], pops = [], t = 60, spawn = 0, breath = 0;
  kit.on(kit.cv, 'pointerdown', e => {
    const p = kit.pos(e);
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r) {
        bubbles.splice(i, 1);
        kit.addScore(b.gold ? 50 : Math.round(60 - b.r));
        pops.push({ x: b.x, y: b.y, r: b.r, a: 1 });
        break;
      }
    }
  });
  kit.loop(dt => {
    t -= dt; spawn -= dt; breath += dt;
    if (spawn <= 0) {
      spawn = kit.rand(0.3, 0.7);
      const r = kit.rand(22, 46);
      bubbles.push({ x: kit.rand(r, 720 - r), y: 470, r, v: kit.rand(40, 90), w: kit.pick(WORRIES), gold: Math.random() < .08, ph: kit.rand(0, 6) });
    }
    bubbles.forEach(b => { b.y -= b.v * dt; b.x += Math.sin(breath * 1.5 + b.ph) * 0.6; });
    bubbles = bubbles.filter(b => b.y > -60);
    pops.forEach(p => { p.r += 60 * dt; p.a -= 2 * dt; });
    pops = pops.filter(p => p.a > 0);

    ctx.clearRect(0, 0, 720, 440);
    // breathing guide ring
    const phase = (breath % 8) / 8, s = phase < .5 ? phase * 2 : 2 - phase * 2;
    ctx.beginPath(); ctx.arc(360, 220, 60 + s * 60, 0, 7); ctx.fillStyle = 'rgba(132,250,176,.18)'; ctx.fill();
    kit.text(ctx, phase < .5 ? 'breathe in…' : 'breathe out…', 360, 220, 18, 'rgba(61,53,83,.35)', 'center');
    bubbles.forEach(b => {
      const g = ctx.createRadialGradient(b.x - b.r / 3, b.y - b.r / 3, 2, b.x, b.y, b.r);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(1, b.gold ? 'rgba(246,211,101,.75)' : 'rgba(161,196,253,.55)');
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
      kit.text(ctx, b.gold ? '✨' : b.w, b.x, b.y, Math.max(11, b.r / 3), '#3d3553', 'center');
    });
    pops.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.strokeStyle = `rgba(183,156,224,${p.a})`; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1; });
    kit.text(ctx, `⏱ ${Math.ceil(t)}s`, 14, 22, 18);
    if (t <= 0) { kit.over('Session complete 💭', 'You popped your worries away. Feel lighter?'); return false; }
  });
});
