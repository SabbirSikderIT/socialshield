GameKit.register(kit => {
  const LINES = ["I have to feed my cat, she gets really dramatic.", "My social battery just hit one percent.",
    "I promised my mom I would be home for dinner.", "I have an early class tomorrow morning.",
    "The plumber is coming and I need to be home.", "My plants need their goodnight story.",
    "I need to go home and stare at a wall for a while.", "Sorry, I have to take this call.",
    "I think I left the stove on, gotta check!", "My ride just arrived, it was lovely to meet you."];
  const lines = kit.shuffle(LINES).slice(0, 5);
  let i = 0, typedChars = 0, errors = 0, start = null;
  const box = kit.el(`<div style="width:100%;max-width:640px;padding:1.5rem">
    <p class="muted small mb-1" id="et-prog"></p><div class="typer-text" id="et-text"></div>
    <input class="input mt-2" id="et-in" autocomplete="off" spellcheck="false" placeholder="Start typing to begin…">
    <div class="flex between mt-2 fredoka"><span>⚡ <b id="et-wpm">0</b> WPM</span><span>🎯 <b id="et-acc">100</b>%</span></div></div>`);
  kit.root.appendChild(box);
  const $ = s => box.querySelector(s);
  function render() {
    const target = lines[i], typed = $('#et-in').value;
    $('#et-text').innerHTML = target.split('').map((ch, k) => {
      const cls = k < typed.length ? (typed[k] === ch ? 'ok' : 'bad') : k === typed.length ? 'cur' : '';
      return `<span class="${cls}">${escapeHtml(ch)}</span>`;
    }).join('');
    $('#et-prog').textContent = `Excuse ${i + 1} / ${lines.length}`;
  }
  function stats() {
    const mins = (performance.now() - start) / 60000;
    const wpm = Math.round((typedChars / 5) / Math.max(mins, 1 / 60));
    const acc = Math.max(0, Math.round(100 * (1 - errors / Math.max(1, typedChars + errors))));
    $('#et-wpm').textContent = wpm; $('#et-acc').textContent = acc;
    return { wpm, acc };
  }
  let prevLen = 0;
  $('#et-in').addEventListener('input', () => {
    if (!start) start = performance.now();
    const v = $('#et-in').value, target = lines[i];
    if (v.length > prevLen && v[v.length - 1] !== target[v.length - 1]) errors++;
    prevLen = v.length;
    render();
    if (v === target) {
      typedChars += target.length; i++; $('#et-in').value = ''; prevLen = 0; kit.setLevel(i + 1);
      const s = stats(); kit.setScore(s.wpm * s.acc / 10);
      if (i >= lines.length) { $('#et-in').disabled = true; kit.over('Excuses delivered! ⌨️', `${s.wpm} WPM at ${s.acc}% accuracy`); return; }
      render();
    }
  });
  render(); $('#et-in').focus();
});
