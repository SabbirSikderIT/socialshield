// Tools page: fake call, excuses, starters, breathing, battery, panic, boundaries, checklist
(() => {
  const D = window.SS_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ---------------- Fake call ---------------- */
  let selectedCall = D.calls[0];
  let callFilter = '';
  const callCats = [...new Set(D.calls.map(c => c.category))];
  $('#call-filter').innerHTML = ['All', ...callCats].map((c, i) =>
    `<button class="chip ${i ? '' : 'active'}" data-cat="${i ? escapeHtml(c) : ''}">${escapeHtml(c)}</button>`).join('');
  $$('#call-filter .chip').forEach(b => b.addEventListener('click', () => {
    $$('#call-filter .chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); callFilter = b.dataset.cat; renderCallers();
  }));
  function renderCallers() {
    $('#caller-grid').innerHTML = D.calls.filter(c => !callFilter || c.category === callFilter).map(c =>
      `<div class="caller ${selectedCall && c.id === selectedCall.id ? 'selected' : ''}" data-id="${c.id}">
        <span class="e">${c.emoji}</span><b>${escapeHtml(c.name)}</b><br><small>${escapeHtml(c.category)} · ${'🔥'.repeat(c.urgency)}</small></div>`).join('');
    $$('.caller').forEach(el => el.addEventListener('click', () => {
      selectedCall = D.calls.find(c => c.id == el.dataset.id); renderCallers();
    }));
  }
  renderCallers();

  let audioCtx, ringTimer, countdownTimer, callTimer, callSecs = 0;
  function ringtone(on) {
    clearInterval(ringTimer);
    if (!on) return;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const burst = () => {
      [0, 0.25].forEach(offset => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(880, audioCtx.currentTime + offset);
        o.frequency.setValueAtTime(660, audioCtx.currentTime + offset + 0.1);
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + offset);
        g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + offset + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + offset + 0.2);
        o.connect(g).connect(audioCtx.destination);
        o.start(audioCtx.currentTime + offset); o.stop(audioCtx.currentTime + offset + 0.22);
      });
      if ($('#call-vibrate').checked && navigator.vibrate) navigator.vibrate([400, 200, 400]);
    };
    burst(); ringTimer = setInterval(burst, 1800);
  }

  function showCall(call) {
    const name = $('#custom-caller').value.trim() || call.name;
    $('#ph-avatar').textContent = call.emoji;
    $('#ph-name').textContent = name;
    $('#ph-status').textContent = 'Incoming call… mobile';
    $('#ph-script').innerHTML = '<b>Read this out loud:</b><br><br>' + escapeHtml(call.script);
    $('#phone').classList.remove('connected');
    $('#phone-overlay').classList.add('show');
    ringtone(true);
  }
  function endCall() {
    ringtone(false); clearInterval(callTimer); speechSynthesis && speechSynthesis.cancel();
    $('#phone-overlay').classList.remove('show');
    toast('Call ended. You escaped gracefully 🕊️');
  }
  $('#ph-accept').addEventListener('click', () => {
    ringtone(false);
    $('#phone').classList.add('connected');
    callSecs = 0;
    callTimer = setInterval(() => {
      callSecs++;
      $('#ph-status').textContent = `${String(Math.floor(callSecs / 60)).padStart(2, '0')}:${String(callSecs % 60).padStart(2, '0')}`;
    }, 1000);
    if ($('#call-voice').checked && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('Hello? Are you there? I really need you to come right now. Please hurry!');
      u.rate = 1.05; u.pitch = 1.1; speechSynthesis.speak(u);
    }
  });
  $('#ph-decline').addEventListener('click', endCall);

  function scheduleCall(delay, call) {
    clearInterval(countdownTimer);
    let left = delay;
    // unlock audio on user gesture so it can ring later
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (left <= 0) { $('#call-countdown').textContent = ''; return showCall(call); }
    const tick = () => {
      $('#call-countdown').textContent = `📳 Ringing in ${left}s… act natural 😌`;
      if (left-- <= 0) { clearInterval(countdownTimer); $('#call-countdown').textContent = ''; showCall(call); }
    };
    tick(); countdownTimer = setInterval(tick, 1000);
    toast('Fake call scheduled. Put your phone face down 🤫');
  }
  $('#start-call').addEventListener('click', () => scheduleCall(+$('#call-delay').value, selectedCall));

  /* ---------------- Exit excuses ---------------- */
  let excuseCat = '';
  $$('#excuse-cats .chip').forEach(b => b.addEventListener('click', () => {
    $$('#excuse-cats .chip').forEach(x => x.classList.remove('active')); b.classList.add('active'); excuseCat = b.dataset.cat;
  }));
  function genExcuse() {
    const pool = D.excuses.filter(e => !excuseCat || e.category === excuseCat);
    const e = pool[Math.floor(Math.random() * pool.length)];
    $('#excuse-text').textContent = '"' + e.text + '"';
    $('#excuse-believe').textContent = 'Believability: ' + '⭐'.repeat(e.believability) + ' · ' + e.category;
  }
  $('#excuse-gen').addEventListener('click', genExcuse);
  $('#excuse-copy').addEventListener('click', () => copyText($('#excuse-text').textContent.replace(/^"|"$/g, '')));

  /* ---------------- Starters ---------------- */
  let starterCat = '';
  function renderStarters() {
    const q = $('#starter-search').value.toLowerCase();
    const list = D.starters.filter(s => (!starterCat || s.category === starterCat) && (!q || s.text.toLowerCase().includes(q)));
    $('#starter-grid').innerHTML = list.map(s => `
      <div class="starter" data-text="${escapeHtml(s.text)}">
        <span class="copy-hint">click to copy</span>
        <q>${escapeHtml(s.text)}</q>
        ${s.follow_up ? `<div class="follow">↪ Follow-up: ${escapeHtml(s.follow_up)}</div>` : ''}
        <div class="flex mt-1"><span class="chip lav">${escapeHtml(s.category)}</span><span class="chip">${s.difficulty}</span></div>
      </div>`).join('') || '<div class="empty"><span class="e">🤔</span>No starters found</div>';
    $$('.starter').forEach(el => el.addEventListener('click', () => copyText(el.dataset.text)));
  }
  $$('#starter-cats .chip').forEach(b => b.addEventListener('click', () => {
    $$('#starter-cats .chip').forEach(x => x.classList.remove('active')); b.classList.add('active');
    starterCat = b.dataset.cat; renderStarters();
  }));
  $('#starter-search').addEventListener('input', renderStarters);
  $('#starter-random').addEventListener('click', () => {
    const pool = D.starters.filter(s => !starterCat || s.category === starterCat);
    const s = pool[Math.floor(Math.random() * pool.length)];
    toast('💬 ' + s.text, 5000);
  });
  renderStarters();

  /* ---------------- Breathing ---------------- */
  let breathing = false, breathTimer, cycles = 0;
  const phases = [['Breathe in…', true], ['Hold…', true], ['Breathe out…', false], ['Hold…', false]];
  function breathe() {
    let i = 0;
    const step = () => {
      const [label, grow] = phases[i % 4];
      $('#breath-circle').textContent = label;
      $('#breath-circle').classList.toggle('grow', grow);
      if (i % 4 === 3) { cycles++; $('#breath-count').textContent = cycles + ' cycle' + (cycles === 1 ? '' : 's'); }
      i++;
    };
    step(); breathTimer = setInterval(step, 4000);
  }
  function toggleBreath(force) {
    breathing = force ?? !breathing;
    clearInterval(breathTimer);
    if (breathing) { breathe(); $('#breath-btn').textContent = '⏸ Pause'; }
    else { $('#breath-circle').textContent = 'Ready?'; $('#breath-circle').classList.remove('grow'); $('#breath-btn').textContent = '▶ Start'; }
  }
  $('#breath-btn').addEventListener('click', () => toggleBreath());

  $('#ground-done').addEventListener('click', () => {
    $$('#ground-steps input').forEach(i => i.value = '');
    toast("Well done. You're here, and you're safe 🌷", 3500);
  });

  /* ---------------- Battery ---------------- */
  const range = $('#batt-range');
  let saveT;
  function renderBattery(save) {
    const v = +range.value;
    const fill = $('#batt-fill');
    fill.style.width = v + '%';
    fill.style.background = v > 60 ? 'linear-gradient(90deg,#84fab0,#8fd3f4)' : v > 30 ? 'linear-gradient(90deg,#f6d365,#fda085)' : 'linear-gradient(90deg,#ff9a9e,#e76f7f)';
    $('#batt-val').textContent = v + '%';
    $('#batt-msg').textContent = v > 80 ? "Fully charged! Maybe say hi to someone? ✨" : v > 60 ? "Good energy. Enjoy yourself 🌿" :
      v > 30 ? "Getting low. Plan a break soon ☕" : v > 10 ? "Low battery. Time to find a quiet corner 💭" : "Critical! Deploy fake call immediately 📞";
    if (save && D.loggedIn) { clearTimeout(saveT); saveT = setTimeout(() => api('/api/battery', { value: v }), 600); }
  }
  range.addEventListener('input', () => renderBattery(true));
  $$('[data-drain]').forEach(b => b.addEventListener('click', () => {
    range.value = Math.max(0, Math.min(100, +range.value - +b.dataset.drain)); renderBattery(true);
  }));
  renderBattery(false);

  /* ---------------- Panic ---------------- */
  $('#panic-btn').addEventListener('click', () => {
    $('#panic-options').hidden = false;
    toast("You're okay. Choose what helps right now 💜", 3000);
  });
  $$('[data-panic]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.panic;
    if (k === 'call') scheduleCall(0, D.calls.find(c => c.urgency >= 5) || D.calls[0]);
    if (k === 'breathe') { location.hash = 'breathe'; toggleBreath(true); }
    if (k === 'excuse') { location.hash = 'excuses'; genExcuse(); }
  }));

  /* ---------------- Boundary builder ---------------- */
  const BD = {
    question: { soft: ["I'd rather keep that private, but thanks for asking!", "Oh, that's a story for another day 😊 How about you?"],
                firm: ["I don't discuss that.", "That's personal, and I'd prefer not to answer."],
                funny: ["That information is classified. Top secret. Government level.", "I'll tell you when I'm 80."] },
    touch: { soft: ["Could you give me a little space? I'm a bit of a personal-bubble person.", "I'm not much of a hugger, but a wave works great! 👋"],
             firm: ["Please don't touch me.", "I need you to step back."],
             funny: ["My personal bubble is currently under renovation. Please keep 1 metre away 🚧"] },
    invite: { soft: ["Thank you so much for thinking of me! I can't make it this time.", "That sounds lovely, but I need a quiet night in."],
              firm: ["No thank you, I'm not going to come.", "I'll pass, but thanks."],
              funny: ["I have a very important appointment with my blanket.", "My social calendar is fully booked… with naps."] },
    talk: { soft: ["It's been so nice chatting! I'm going to go grab some water.", "I don't want to keep you. Let's catch up another time!"],
            firm: ["I need to go now. Take care.", "I'm going to end the conversation here."],
            funny: ["My social battery just beeped. I must return to my charging station 🔋"] },
    photo: { soft: ["I'm a bit camera shy. Mind if I take the photo for you instead?", "I'd rather not be in photos, but I'm happy to hold the phone!"],
             firm: ["No photos of me, please.", "Please don't post pictures of me."],
             funny: ["I'm in witness protection. No photos 🕶️"] },
    favour: { soft: ["I wish I could help, but I don't have the capacity right now.", "I can't this time, but I hope it works out!"],
              firm: ["I can't do that.", "No, I'm not available for that."],
              funny: ["I would, but I've promised my houseplants I'd stay home."] },
  };
  $('#bd-gen').addEventListener('click', () => {
    const list = BD[$('#bd-sit').value][$('#bd-tone').value];
    $('#bd-out').textContent = '"' + list[Math.floor(Math.random() * list.length)] + '"';
  });
  $('#bd-copy').addEventListener('click', () => copyText($('#bd-out').textContent.replace(/^"|"$/g, '')));

  /* ---------------- Checklist ---------------- */
  const boxes = $$('#check-list input');
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('ss-checklist') || '[]'); } catch (e) {}
  boxes.forEach((b, i) => { b.checked = !!saved[i]; b.addEventListener('change', updCheck); });
  function updCheck() {
    const st = boxes.map(b => b.checked);
    try { localStorage.setItem('ss-checklist', JSON.stringify(st)); } catch (e) {}
    const n = st.filter(Boolean).length;
    $('#check-progress').textContent = `${n} / ${boxes.length}`;
    if (n === boxes.length) toast("All set! You're ready. You've got this 🌟", 3500);
  }
  $('#check-progress').textContent = `${boxes.filter(b => b.checked).length} / ${boxes.length}`;
})();
