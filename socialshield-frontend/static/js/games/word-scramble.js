GameKit.register(kit => {
  const WORDS = [['introvert', 'Someone who recharges alone'], ['solitude', 'Peaceful time alone'], ['blanket', 'Cosy fabric hug'],
    ['library', 'Quiet place full of books'], ['headphones', 'Universal "do not disturb" sign'], ['boundary', 'A limit you set'],
    ['confidence', 'Belief in yourself'], ['breathe', 'In for 4, out for 4'], ['journal', 'Private notebook for thoughts'],
    ['recharge', 'What you do after a party'], ['anxiety', 'Nervous, worried feeling'], ['listener', 'Introvert superpower'],
    ['calm', 'Peaceful and relaxed'], ['cancelled', 'The best kind of plans'], ['teacup', 'Holds chai'], ['kindness', 'Being gentle to others'],
    ['courage', 'Acting despite fear'], ['homebody', 'Loves staying in'], ['meditate', 'Quiet the mind'], ['bookworm', 'Loves reading'],
    ['awkward', 'Uncomfortable social moment'], ['sanctuary', 'Safe peaceful place'], ['plant', 'Green quiet friend'], ['rainfall', 'Soothing sound outside']];
  const list = kit.shuffle(WORDS).slice(0, 10);
  let i = 0, time = 90, hints = 0;
  const box = kit.el(`<div style="text-align:center;padding:1.5rem;width:100%;max-width:560px">
    <p class="muted small" id="ws-prog"></p><div class="big-word my-2" id="ws-word" style="margin:1rem 0"></div>
    <p class="muted mb-2" id="ws-hint"></p>
    <input class="input center" id="ws-in" placeholder="Type your answer" autocomplete="off" style="font-size:1.3rem;max-width:320px">
    <div class="flex mt-2" style="justify-content:center"><button class="btn btn-primary" id="ws-go">Check</button><button class="btn btn-glass" id="ws-skip">Skip</button><button class="btn btn-glass" id="ws-hintbtn">💡 Letter</button></div>
    <p class="fredoka mt-2">⏱ <span id="ws-t">90</span>s</p></div>`);
  kit.root.appendChild(box);
  const $ = s => box.querySelector(s);
  function scramble(w) { let s; do { s = kit.shuffle(w.split('')).join(''); } while (s === w && w.length > 2); return s; }
  function show() {
    if (i >= list.length) return kit.over('All unscrambled! 🔤', 'Your word brain is warm and cosy.');
    const [w, h] = list[i]; hints = 0;
    $('#ws-prog').textContent = `Word ${i + 1} / ${list.length}`;
    $('#ws-word').textContent = scramble(w).toUpperCase();
    $('#ws-hint').textContent = '💭 ' + h;
    $('#ws-in').value = ''; $('#ws-in').focus(); kit.setLevel(i + 1);
  }
  function check() {
    const [w] = list[i];
    if ($('#ws-in').value.trim().toLowerCase() === w) { kit.addScore(w.length * 15 - hints * 10); toast('✅ Correct!'); i++; show(); }
    else { $('#ws-in').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 250); }
  }
  $('#ws-go').addEventListener('click', check);
  $('#ws-in').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  $('#ws-skip').addEventListener('click', () => { toast('It was: ' + list[i][0]); i++; show(); });
  $('#ws-hintbtn').addEventListener('click', () => { hints++; $('#ws-in').value = list[i][0].slice(0, hints); $('#ws-in').focus(); });
  kit.interval(() => { time--; $('#ws-t').textContent = time; if (time <= 0) kit.over("Time's up!", `You solved ${i} words.`); }, 1000);
  show();
});
