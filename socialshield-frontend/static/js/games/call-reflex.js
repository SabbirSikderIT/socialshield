GameKit.register(kit => {
  const box = kit.el('<div class="reflex-box"></div>');
  kit.root.appendChild(box);
  const TOTAL = 5;
  let round = 0, state = 'wait', t0 = 0, times = [], token = 0;

  function next() {
    round++; kit.setLevel(round);
    state = 'wait';
    const my = ++token;
    box.style.background = 'linear-gradient(135deg,#e8dcff,#ffd6e8)';
    box.innerHTML = `<div><div style="font-size:4rem">🗣️</div>Someone is over-sharing…<br><small class="muted">Wait for the phone to ring (${round}/${TOTAL})</small></div>`;
    kit.timeout(() => {
      if (my !== token || state !== 'wait') return; // round was cancelled by an early click
      state = 'ring'; t0 = performance.now();
      box.style.background = 'linear-gradient(135deg,#84fab0,#8fd3f4)';
      box.innerHTML = '<div><div style="font-size:5rem">📞</div>RING RING! CLICK NOW!</div>';
      if (navigator.vibrate) navigator.vibrate(200);
    }, kit.rand(1200, 4000));
  }

  kit.on(box, 'pointerdown', () => {
    if (state === 'wait') {
      state = 'early'; token++; round--;
      box.style.background = 'linear-gradient(135deg,#ff9a9e,#fecfef)';
      box.innerHTML = '<div><div style="font-size:4rem">😅</div>Too early! They noticed you faking it.<br><small>Tap to try again</small></div>';
    } else if (state === 'early') {
      next();
    } else if (state === 'ring') {
      const ms = Math.round(performance.now() - t0);
      times.push(ms);
      kit.addScore(Math.max(10, 600 - ms));
      state = 'done';
      box.innerHTML = `<div><div style="font-size:4rem">${ms < 300 ? '⚡' : ms < 500 ? '😎' : '🐢'}</div>${ms} ms<br><small>${round < TOTAL ? 'Tap for next round' : ''}</small></div>`;
      if (round >= TOTAL) kit.timeout(() => kit.over('Escaped!', `Average reaction: ${Math.round(times.reduce((a, b) => a + b) / times.length)} ms`), 900);
    } else if (state === 'done' && round < TOTAL) {
      next();
    }
  });
  next();
});
