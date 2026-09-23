GameKit.register(kit => {
  const ctx = kit.canvas(720, 440);
  const keys = kit.keysDown();
  kit.touch([{ label: '⬅', key: 'ArrowLeft' }, { label: '➡', key: 'ArrowRight' }]);
  const Q = ['When are you getting married?', 'Why are you so quiet?', 'How much do you earn?', 'Did you gain weight?',
    'Smile more!', 'Come dance!', 'Say something funny!', "Why don't you have friends?", 'Group photo!', 'Karaoke time!',
    'Still single?', 'What are your results?', 'Hug me!', 'Speech! Speech!', 'You look tired'];
  const player = { x: 360, w: 60 };
  let items = [], t = 0, lives = 3, spawn = 0, inv = 0;
  kit.on(kit.cv, 'pointermove', e => { player.x = kit.pos(e).x; });

  kit.loop(dt => {
    t += dt; spawn -= dt; inv = Math.max(0, inv - dt);
    const speed = 110 + t * 6;
    if ((keys['arrowleft'] || keys['a'])) player.x -= 380 * dt;
    if ((keys['arrowright'] || keys['d'])) player.x += 380 * dt;
    player.x = Math.max(30, Math.min(690, player.x));
    if (spawn <= 0) {
      spawn = Math.max(0.35, 1.1 - t * 0.015);
      const good = Math.random() < 0.15;
      ctx.font = '600 14px Fredoka';
      const text = good ? '' : kit.pick(Q);
      const w = good ? 34 : ctx.measureText(text).width + 24;
      items.push({ x: kit.rand(w / 2 + 5, 715 - w / 2), y: -20, w, text, good, v: speed * kit.rand(0.8, 1.2) });
    }
    items.forEach(i => i.y += i.v * dt);
    for (const i of items) {
      if (i.y > 390 && i.y < 425 && Math.abs(i.x - player.x) < i.w / 2 + 22) {
        i.dead = true;
        if (i.good) { kit.addScore(50); lives = Math.min(5, lives + (Math.random() < .3 ? 1 : 0)); }
        else if (!inv) { lives--; inv = 1; }
      }
      if (i.y > 460) { i.dead = true; if (!i.good) kit.addScore(10); }
    }
    items = items.filter(i => !i.dead);
    kit.setLevel(1 + Math.floor(t / 15));
    ctx.clearRect(0, 0, 720, 440);
    items.forEach(i => {
      if (i.good) kit.emoji(ctx, '☕', i.x, i.y, 28);
      else { kit.roundRect(ctx, i.x - i.w / 2, i.y - 14, i.w, 28, 14, 'rgba(255,143,171,.85)'); kit.text(ctx, i.text, i.x, i.y, 14, '#fff', 'center'); }
    });
    ctx.globalAlpha = inv && Math.floor(inv * 10) % 2 ? .4 : 1;
    kit.emoji(ctx, '🙈', player.x, 410, 42);
    ctx.globalAlpha = 1;
    kit.text(ctx, '💜'.repeat(lives), 14, 22, 18);
    if (lives <= 0) { kit.over('Too many awkward questions!', `You survived ${Math.round(t)} seconds.`); return false; }
  });
});
