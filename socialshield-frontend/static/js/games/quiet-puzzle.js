GameKit.register(kit => {
  const ICONS = ['📚', '☕', '🌱', '🕯️', '🎧', '🐱', '🛋️', '🌙', '🧸', '🍵', '📓', '🖼️', '🧶', '🌧️', '🎨'];
  let tiles, moves = 0, t0 = Date.now();
  const box = kit.el(`<div style="text-align:center;padding:1rem"><p class="fredoka mb-2">Moves: <span id="qp-m">0</span></p>
    <div class="puzzle-grid" id="qp-grid" style="justify-content:center"></div>
    <p class="muted small mt-2">Arrange 1–15 in order. The empty space goes bottom-right.</p></div>`);
  kit.root.appendChild(box);
  const grid = box.querySelector('#qp-grid');
  // shuffle by making random legal moves, so the puzzle is always solvable
  tiles = [...Array(15).keys()].map(i => i + 1).concat(0);
  let empty = 15;
  for (let k = 0; k < 250; k++) {
    const opts = [empty - 4, empty + 4, empty % 4 ? empty - 1 : -1, empty % 4 < 3 ? empty + 1 : -1].filter(i => i >= 0 && i < 16);
    const j = kit.pick(opts); [tiles[empty], tiles[j]] = [tiles[j], tiles[empty]]; empty = j;
  }
  function draw() {
    grid.innerHTML = '';
    tiles.forEach((v, i) => {
      const b = kit.el(`<button class="ptile ${v ? '' : 'empty'}">${v ? `<div style="font-size:1.4rem">${ICONS[v - 1]}</div><small>${v}</small>` : ''}</button>`);
      if (v) b.addEventListener('click', () => move(i));
      grid.appendChild(b);
    });
  }
  function move(i) {
    const e = tiles.indexOf(0);
    const adj = (Math.abs(i - e) === 4) || (Math.abs(i - e) === 1 && Math.floor(i / 4) === Math.floor(e / 4));
    if (!adj) return;
    [tiles[i], tiles[e]] = [tiles[e], tiles[i]];
    moves++; box.querySelector('#qp-m').textContent = moves;
    kit.setLevel(1 + Math.floor(moves / 50));
    draw();
    if (tiles.every((v, k) => v === (k === 15 ? 0 : k + 1))) {
      kit.setScore(Math.max(100, 3000 - moves * 10 - Math.round((Date.now() - t0) / 1000) * 3));
      kit.over('Quiet room restored 🧩', `Solved in ${moves} moves.`);
    }
  }
  kit.key(e => {
    const eI = tiles.indexOf(0);
    const m = { arrowleft: eI + 1, arrowright: eI - 1, arrowup: eI + 4, arrowdown: eI - 4 }[e.key.toLowerCase()];
    if (m !== undefined && m >= 0 && m < 16) move(m);
  });
  draw();
});
