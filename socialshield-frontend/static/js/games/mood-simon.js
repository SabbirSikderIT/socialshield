GameKit.register(kit => {
  const PADS = [{ c: '#ff8fab', e: '😊', f: 330 }, { c: '#74c69d', e: '😌', f: 392 }, { c: '#7fb7e6', e: '🥱', f: 440 }, { c: '#f6d365', e: '🤩', f: 523 }];
  const box = kit.el(`<div style="text-align:center;padding:1rem"><p class="fredoka mb-2" id="sm-msg">Watch carefully…</p><div class="simon-grid" id="sm-grid" style="justify-content:center"></div></div>`);
  kit.root.appendChild(box);
  const grid = box.querySelector('#sm-grid');
  const actx = new (window.AudioContext || window.webkitAudioContext)();
  const beep = f => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.15, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + .35); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .36); };
  let seq = [], idx = 0, input = false;
  const pads = PADS.map((p, i) => {
    const b = kit.el(`<button class="simon-pad" style="background:${p.c};color:${p.c}">${p.e}</button>`);
    b.addEventListener('click', () => {
      if (!input) return;
      flash(i);
      if (i !== seq[idx]) { input = false; box.querySelector('#sm-msg').textContent = 'Oops!'; kit.timeout(() => kit.over('Sequence broken', `You remembered ${seq.length - 1} moods in a row.`), 500); return; }
      idx++;
      if (idx === seq.length) { input = false; kit.addScore(seq.length * 10); kit.timeout(nextRound, 700); }
    });
    grid.appendChild(b); return b;
  });
  function flash(i) { pads[i].classList.add('lit'); beep(PADS[i].f); kit.timeout(() => pads[i].classList.remove('lit'), 300); }
  function nextRound() {
    seq.push(kit.randi(0, 3)); idx = 0; kit.setLevel(seq.length);
    box.querySelector('#sm-msg').textContent = 'Watch carefully…';
    const gap = Math.max(300, 650 - seq.length * 25);
    seq.forEach((v, k) => kit.timeout(() => flash(v), 500 + k * gap));
    kit.timeout(() => { input = true; box.querySelector('#sm-msg').textContent = 'Your turn!'; }, 500 + seq.length * gap);
  }
  nextRound();
});
