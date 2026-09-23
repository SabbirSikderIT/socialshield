GameKit.register(kit => {
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const ME = '🌸', AI = '🌙';
  let round = 0, wins = 0;
  const box = kit.el(`<div style="text-align:center;padding:1rem"><p class="fredoka mb-2" id="tt-msg"></p>
    <div class="ttt-grid" id="tt-grid" style="grid-template-columns:repeat(3,auto);justify-content:center"></div>
    <p class="muted small mt-2" id="tt-score"></p></div>`);
  kit.root.appendChild(box);
  const winner = b => { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.every(Boolean) ? 'draw' : null; };
  function minimax(b, player, depth) {
    const w = winner(b);
    if (w === AI) return { s: 10 - depth }; if (w === ME) return { s: depth - 10 }; if (w === 'draw') return { s: 0 };
    let best = { s: player === AI ? -99 : 99 };
    b.forEach((v, i) => {
      if (v) return;
      b[i] = player; const r = minimax(b, player === AI ? ME : AI, depth + 1); b[i] = null;
      if (player === AI ? r.s > best.s : r.s < best.s) best = { s: r.s, i };
    });
    return best;
  }
  function play() {
    round++; kit.setLevel(round);
    const b = Array(9).fill(null);
    const grid = box.querySelector('#tt-grid'); grid.innerHTML = '';
    let busy = false;
    const msg = t => box.querySelector('#tt-msg').textContent = t;
    msg('Your turn 🌸');
    const cells = b.map((_, i) => {
      const c = kit.el('<button class="ttt-cell"></button>');
      c.addEventListener('click', () => {
        if (busy || b[i] || winner(b)) return;
        b[i] = ME; c.textContent = ME;
        if (end()) return;
        busy = true; msg('Thinking… 🌙');
        kit.timeout(() => {
          // the calm AI makes a random move 25% of the time so it's beatable
          const empty = b.map((v, k) => v ? null : k).filter(v => v !== null);
          const k = Math.random() < .25 ? kit.pick(empty) : minimax(b, AI, 0).i;
          b[k] = AI; cells[k].textContent = AI; busy = false;
          if (!end()) msg('Your turn 🌸');
        }, 450);
      });
      grid.appendChild(c); return c;
    });
    function end() {
      const w = winner(b);
      if (!w) return false;
      if (w === ME) { wins++; kit.addScore(100); msg('You win! 🎉'); }
      else if (w === 'draw') { kit.addScore(30); msg("It's a draw 🤝"); }
      else msg('The moon wins this time 🌙');
      box.querySelector('#tt-score').textContent = `Round ${round} / 5 · Wins: ${wins}`;
      kit.timeout(() => round >= 5 ? kit.over('Match over', `You won ${wins} of 5 rounds.`) : play(), 1300);
      return true;
    }
  }
  play();
});
