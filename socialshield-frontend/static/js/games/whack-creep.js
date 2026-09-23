GameKit.register(kit => {
  let t = 30, holes = [];
  const wrap = kit.el(`<div style="text-align:center;padding:1rem">
      <p class="fredoka mb-2" style="font-size:1.3rem">⏱ <span id="wc-t">30</span>s</p>
      <div id="wc-grid" style="display:grid;grid-template-columns:repeat(3,110px);gap:14px;justify-content:center"></div></div>`);
  kit.root.appendChild(wrap);
  const grid = wrap.querySelector('#wc-grid');
  for (let i = 0; i < 9; i++) {
    const h = kit.el(`<button style="width:110px;height:110px;border-radius:50%;border:0;cursor:pointer;font-size:3.2rem;background:radial-gradient(circle at 50% 70%,#6b5a8e,#b79ce0);box-shadow:inset 0 -10px 20px rgba(0,0,0,.25);transition:transform .1s"></button>`);
    h.addEventListener('pointerdown', () => {
      if (!h.dataset.who) return;
      if (h.dataset.who === 'creep') { kit.addScore(10 + kit.level * 2); h.textContent = '💥'; }
      else if (h.dataset.who === 'gold') { kit.addScore(40); h.textContent = '✨'; }
      else { kit.addScore(-20); h.textContent = '😿'; toast("Don't bonk the kitty!"); }
      h.dataset.who = ''; h.style.transform = 'scale(.9)';
      kit.timeout(() => { h.textContent = ''; h.style.transform = ''; }, 250);
    });
    holes.push(h); grid.appendChild(h);
  }
  kit.interval(() => {
    t--; wrap.querySelector('#wc-t').textContent = t;
    kit.setLevel(1 + Math.floor((30 - t) / 8));
    if (t <= 0) kit.over("Time's up!", 'The party is creep-free, thanks to you 🔨');
  }, 1000);
  const pop = () => {
    const empty = holes.filter(h => !h.dataset.who);
    if (!empty.length) return;
    const h = kit.pick(empty);
    const r = Math.random();
    h.dataset.who = r < .72 ? 'creep' : r < .9 ? 'cat' : 'gold';
    h.textContent = { creep: kit.pick(['👹', '🦹', '🤡', '👺']), cat: '🐱', gold: '🌟' }[h.dataset.who];
    kit.timeout(() => { if (h.dataset.who) { h.dataset.who = ''; h.textContent = ''; } }, Math.max(450, 1100 - kit.level * 150));
    kit.timeout(pop, Math.max(280, 750 - kit.level * 110));
  };
  pop();
});
