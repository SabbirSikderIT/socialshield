GameKit.register(kit => {
  const ctx = kit.canvas(720, 440);
  const keys = kit.keysDown();
  kit.touch([{ label: '⬅', key: 'ArrowLeft' }, { label: '⬆', key: 'ArrowUp' }, { label: '⬇', key: 'ArrowDown' }, { label: '➡', key: 'ArrowRight' },
             { label: '📞', key: '1' }, { label: '💪', key: '2' }, { label: '🚪', key: '3' }]);
  const NPC_TYPES = [
    { e: '🗣️', name: 'Over-sharer', speed: 55, dmg: 18 },
    { e: '👹', name: 'Creep', speed: 75, dmg: 30, chase: true },
    { e: '👯', name: 'Group hug', speed: 45, dmg: 22 },
    { e: '🎤', name: 'Karaoke host', speed: 65, dmg: 20 },
    { e: '🤳', name: 'Selfie taker', speed: 60, dmg: 15 },
  ];
  let level, player, npcs, tables, coffees, exit, battery, tools, frozen, shield, msg, msgT;

  function setup() {
    kit.setLevel(level);
    player = { x: 40, y: 400, r: 14 };
    exit = { x: 660, y: 20, w: 44, h: 50 };
    tables = [];
    for (let i = 0; i < 3 + level; i++) {
      const t = { x: kit.rand(90, 580), y: kit.rand(70, 360), w: kit.rand(50, 110), h: kit.rand(30, 60) };
      if (Math.hypot(t.x - 40, t.y - 400) > 90 && t.x + t.w < 640) tables.push(t);
    }
    npcs = [];
    for (let i = 0; i < 2 + level; i++) {
      const t = NPC_TYPES[Math.min(NPC_TYPES.length - 1, kit.randi(0, Math.min(4, level)))];
      npcs.push({ ...t, x: kit.rand(160, 680), y: kit.rand(60, 380), vx: kit.rand(-1, 1), vy: kit.rand(-1, 1), r: 16, cd: 0 });
    }
    coffees = Array.from({ length: 3 }, () => ({ x: kit.rand(80, 640), y: kit.rand(60, 400), got: false }));
    tools = { call: 1, boost: 1, exit: 1 };
    frozen = 0; shield = 0;
    say(`Level ${level}: reach the 🚪!`);
  }
  function say(t) { msg = t; msgT = 2.2; }
  const hitRect = (x, y, r, t) => x + r > t.x && x - r < t.x + t.w && y + r > t.y && y - r < t.y + t.h;

  kit.key(e => {
    if (e.key === '1' && tools.call) { tools.call--; frozen = 3.5; say('📞 Fake call! Everyone politely waits…'); }
    if (e.key === '2' && tools.boost) { tools.boost--; shield = 4; say('💪 Confidence boost! Immune to awkwardness'); }
    if (e.key === '3' && tools.exit) {
      tools.exit--; const dx = exit.x - player.x, dy = exit.y + 25 - player.y, d = Math.hypot(dx, dy);
      player.x += dx / d * Math.min(160, d); player.y += dy / d * Math.min(160, d); say('🚪 Quick exit! Slipped away');
    }
  });

  level = 1; battery = 100; setup();

  kit.loop(dt => {
    // move player
    const sp = 170;
    let mx = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
    let my = (keys['arrowdown'] || keys['s'] ? 1 : 0) - (keys['arrowup'] || keys['w'] ? 1 : 0);
    const nx = Math.max(14, Math.min(706, player.x + mx * sp * dt));
    const ny = Math.max(14, Math.min(426, player.y + my * sp * dt));
    if (!tables.some(t => hitRect(nx, player.y, player.r, t))) player.x = nx;
    if (!tables.some(t => hitRect(player.x, ny, player.r, t))) player.y = ny;

    frozen = Math.max(0, frozen - dt); shield = Math.max(0, shield - dt); msgT -= dt;

    for (const n of npcs) {
      if (!frozen) {
        if (n.chase || Math.random() < 0.01) {
          const dx = player.x - n.x, dy = player.y - n.y, d = Math.hypot(dx, dy) || 1;
          if (n.chase && d < 220) { n.vx = dx / d; n.vy = dy / d; }
          else if (Math.random() < 0.02) { n.vx = kit.rand(-1, 1); n.vy = kit.rand(-1, 1); }
        }
        const s = n.speed * (1 + level * 0.08);
        let x2 = n.x + n.vx * s * dt, y2 = n.y + n.vy * s * dt;
        if (x2 < 16 || x2 > 704 || tables.some(t => hitRect(x2, n.y, n.r, t))) { n.vx *= -1; x2 = n.x; }
        if (y2 < 16 || y2 > 424 || tables.some(t => hitRect(n.x, y2, n.r, t))) { n.vy *= -1; y2 = n.y; }
        n.x = x2; n.y = y2;
      }
      n.cd -= dt;
      if (Math.hypot(n.x - player.x, n.y - player.y) < n.r + player.r && n.cd <= 0) {
        n.cd = 1.2;
        if (!shield) { battery -= n.dmg; say(`${n.e} ${n.name} got you! −${n.dmg}% battery`); }
      }
    }
    for (const c of coffees) if (!c.got && Math.hypot(c.x - player.x, c.y - player.y) < 24) {
      c.got = true; kit.addScore(25); battery = Math.min(100, battery + 8); say('☕ Recharge! +25');
    }
    if (battery <= 0) { draw(); kit.over('Social battery drained 😴', `You made it to level ${level}.`); return false; }
    if (hitRect(player.x, player.y, player.r, exit)) {
      kit.addScore(100 * level + Math.round(battery) + (tools.call + tools.boost + tools.exit) * 20);
      level++;
      if (level > 8) { draw(); kit.over('You escaped every party! 🎉', 'Legendary introvert status unlocked.'); return false; }
      setup();
    }
    draw();
  });

  function draw() {
    ctx.clearRect(0, 0, 720, 440);
    // floor pattern
    for (let x = 0; x < 720; x += 40) for (let y = 0; y < 440; y += 40) {
      ctx.fillStyle = (x + y) / 40 % 2 ? 'rgba(232,220,255,.35)' : 'rgba(255,214,232,.25)'; ctx.fillRect(x, y, 40, 40);
    }
    kit.roundRect(ctx, exit.x, exit.y, exit.w, exit.h, 10, '#b7f5cf'); kit.emoji(ctx, '🚪', exit.x + 22, exit.y + 25, 30);
    tables.forEach(t => { kit.roundRect(ctx, t.x, t.y, t.w, t.h, 12, 'rgba(183,156,224,.55)'); kit.emoji(ctx, '🍰', t.x + t.w / 2, t.y + t.h / 2, 18); });
    coffees.forEach(c => !c.got && kit.emoji(ctx, '☕', c.x, c.y, 22));
    npcs.forEach(n => { kit.emoji(ctx, n.e, n.x, n.y, 30); if (frozen) kit.emoji(ctx, '📞', n.x + 14, n.y - 16, 14); });
    if (shield) { ctx.beginPath(); ctx.arc(player.x, player.y, 24, 0, 7); ctx.fillStyle = 'rgba(132,250,176,.4)'; ctx.fill(); }
    kit.emoji(ctx, '🙂', player.x, player.y, 28);
    // HUD
    kit.roundRect(ctx, 10, 10, 170, 22, 11, 'rgba(255,255,255,.7)');
    kit.roundRect(ctx, 12, 12, 166 * Math.max(0, battery) / 100, 18, 9, battery > 50 ? '#84fab0' : battery > 25 ? '#f6d365' : '#e76f7f');
    kit.text(ctx, `🔋 ${Math.max(0, Math.round(battery))}%`, 20, 21, 13);
    kit.text(ctx, `1📞×${tools.call}  2💪×${tools.boost}  3🚪×${tools.exit}`, 200, 21, 14);
    if (msgT > 0) { kit.roundRect(ctx, 200, 400, 320, 30, 15, 'rgba(61,53,83,.75)'); kit.text(ctx, msg, 360, 415, 14, '#fff', 'center'); }
  }
});
