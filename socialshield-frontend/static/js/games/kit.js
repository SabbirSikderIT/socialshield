// Tiny shared engine for the Social Shield mini-games.
// Each game calls GameKit.register(fn) where fn(kit) sets up and starts one round.
const GameKit = (() => {
  const root = document.getElementById('game-root');
  const pad = document.getElementById('touch-pad');
  let gameFn = null, cleanups = [], running = false;

  const kit = {
    root, score: 0, level: 1, slug: window.GAME_SLUG,
    W: 720, H: 440,
    setScore(n) { kit.score = Math.max(0, Math.round(n)); document.getElementById('hud-score').textContent = kit.score; },
    addScore(n) { kit.setScore(kit.score + n); },
    setLevel(n) { kit.level = n; document.getElementById('hud-level').textContent = n; },

    clear() { root.innerHTML = ''; },
    el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; },
    canvas(w = 720, h = 440) {
      kit.W = w; kit.H = h;
      const c = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.aspectRatio = w + '/' + h;
      root.appendChild(c);
      const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
      ctx.font = '16px Quicksand'; ctx.textBaseline = 'middle';
      kit.cv = c; return ctx;
    },
    // convert pointer event to canvas coords
    pos(e) {
      const r = kit.cv.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: (p.clientX - r.left) * kit.W / r.width, y: (p.clientY - r.top) * kit.H / r.height };
    },
    on(target, ev, fn, opts) { target.addEventListener(ev, fn, opts); cleanups.push(() => target.removeEventListener(ev, fn, opts)); },
    key(fn) {
      kit.on(window, 'keydown', e => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && running) e.preventDefault();
        fn(e);
      });
    },
    keysDown() {
      const keys = {};
      kit.on(window, 'keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); });
      kit.on(window, 'keyup', e => { keys[e.key.toLowerCase()] = false; });
      return keys;
    },
    interval(fn, ms) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; },
    timeout(fn, ms) { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); return id; },
    loop(fn) {
      let last = performance.now(), id;
      const f = t => { const dt = Math.min(0.05, (t - last) / 1000); last = t; if (fn(dt) !== false) id = requestAnimationFrame(f); };
      id = requestAnimationFrame(f);
      cleanups.push(() => cancelAnimationFrame(id));
    },
    // touch buttons: [{label:'⬅', key:'ArrowLeft'}]
    touch(buttons) {
      pad.innerHTML = '';
      buttons.forEach(b => {
        const btn = document.createElement('button'); btn.textContent = b.label;
        const down = e => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: b.key })); };
        const up = e => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: b.key })); };
        btn.addEventListener('touchstart', down); btn.addEventListener('touchend', up);
        btn.addEventListener('mousedown', down); btn.addEventListener('mouseup', up);
        pad.appendChild(btn);
      });
    },
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    shuffle: arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    roundRect(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fillStyle = fill; ctx.fill(); },
    emoji(ctx, ch, x, y, size) { ctx.font = size + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, x, y); },
    text(ctx, s, x, y, size = 18, color = '#3d3553', align = 'left') { ctx.font = `600 ${size}px Fredoka, Quicksand, sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); },

    async over(title = 'Game over', msg = '') {
      running = false;
      stopAll();
      const box = kit.el(`<div class="game-over"><span style="font-size:3.5rem">${kit.score > 0 ? '🌟' : '🌧️'}</span>
        <h2>${title}</h2><p class="muted">${msg}</p><p class="fredoka" style="font-size:1.4rem">Score: <b>${kit.score}</b></p>
        <p class="small muted" id="save-msg">Saving…</p>
        <div class="flex"><button class="btn btn-primary" id="again">↺ Play again</button><a class="btn btn-glass" href="/games">All games</a></div></div>`);
      root.appendChild(box);
      box.querySelector('#again').addEventListener('click', start);
      try {
        const r = await api('/api/score', { game: kit.slug, score: kit.score, level: kit.level });
        box.querySelector('#save-msg').textContent = r.saved ? (r.new_best ? '🏆 New personal best!' : `Saved · your best: ${r.best}`) : (r.message || '');
      } catch (e) { box.querySelector('#save-msg').textContent = 'Could not save score.'; }
    },
  };

  function stopAll() { cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = []; }

  function start() {
    stopAll();
    kit.clear(); pad.innerHTML = '';
    kit.setScore(0); kit.setLevel(1);
    running = true;
    gameFn(kit);
  }

  return {
    register(fn) { gameFn = fn; },
    boot() {
      document.getElementById('start-btn').addEventListener('click', start);
      document.getElementById('restart-btn').addEventListener('click', start);
    },
    kit,
  };
})();
