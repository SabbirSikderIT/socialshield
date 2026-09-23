GameKit.register(kit => {
  const QUESTIONS = [
    ["At a party, someone says 'I just got back from Sylhet!' What's a great reply?", ["Cool.", "Oh nice! What was the best part of the trip?", "I hate travelling.", "*nods and walks away*"], 1],
    ["You forgot someone's name right after meeting them. Best move?", ["Avoid them all night", "Call them 'buddy'", "'Sorry, could you tell me your name again?'", "Guess a random name"], 2],
    ["A conversation hits an awkward silence. What do you do?", ["Panic and leave", "Ask an open question about something they mentioned", "Check your phone forever", "Start talking about the weather in detail"], 1],
    ["Someone keeps asking personal questions you don't want to answer.", ["Answer everything", "'I'd rather keep that private. How about you, what brings you here?'", "Lie dramatically", "Cry"], 1],
    ["You want to leave a conversation politely.", ["Just walk away mid-sentence", "'It was great chatting! I'm going to grab some food.'", "Pretend to faint", "Say 'bye' and run"], 1],
    ["Which is an open-ended question?", ["Do you like tea?", "Are you a student?", "What got you into photography?", "Is it hot today?"], 2],
    ["At a networking event, how do you introduce yourself?", ["Hand over your CV immediately", "'Hi, I'm Rafi. I work in design. What brings you here?'", "Stay silent until spoken to", "Talk only about your salary"], 1],
    ["Someone compliments your shirt. Best response?", ["'This old thing? It's ugly.'", "'Thank you! I got it from a local market.'", "Ignore them", "'I know.'"], 1],
    ["You notice someone standing alone looking nervous.", ["Ignore them; they want to be alone", "Walk over and say 'Hi, I don't know anyone here either!'", "Stare at them", "Take a photo"], 1],
    ["What's the FORD method for small talk topics?", ["Food, Oranges, Rice, Dal", "Family, Occupation, Recreation, Dreams", "Friends, Owls, Rain, Dance", "Fun, Opinions, Rules, Debate"], 1],
    ["How much eye contact is comfortable while listening?", ["0%, look at the floor", "About 60–70% with natural breaks", "100%, never blink", "Only look at their shoes"], 1],
    ["A relative asks 'When are you getting married?' at a wedding.", ["Start an argument", "'When the right time comes, In Sha Allah! How's your garden doing?'", "Leave the wedding", "Announce a fake engagement"], 1],
    ["Active listening includes:", ["Planning your reply while they talk", "Paraphrasing what they said", "Interrupting with your story", "Scrolling your phone"], 1],
    ["Someone at the bus stop says 'Traffic is terrible today!'", ["'Yes, it's crazy! Do you take this route every day?'", "Silence", "'Traffic is always terrible, obviously.'", "Move to another bus stop"], 0],
    ["You made an awkward joke that didn't land. Best move?", ["Explain the joke for five minutes", "Smile, say 'Well, that one flopped!' and move on", "Leave the country", "Repeat it louder"], 1],
    ["What's a good sign someone wants to end a conversation?", ["They ask you questions", "Their feet point away and they give short answers", "They laugh a lot", "They lean in"], 1],
  ];
  const qs = kit.shuffle(QUESTIONS).slice(0, 10);
  let i = 0, streak = 0, correct = 0;
  const wrap = kit.el('<div style="width:100%;max-width:620px;padding:1.5rem"></div>');
  kit.root.appendChild(wrap);
  function show() {
    if (i >= qs.length) return kit.over('Quiz complete!', `You got ${correct} of ${qs.length} right 💬`);
    const [q, opts, ans] = qs[i];
    kit.setLevel(i + 1);
    wrap.innerHTML = `<p class="muted small">Question ${i + 1} / ${qs.length} ${streak > 1 ? '· 🔥 streak ' + streak : ''}</p>
      <h3 class="mb-2" style="font-size:1.3rem">${escapeHtml(q)}</h3>` +
      opts.map((o, k) => `<button class="quiz-opt" data-k="${k}">${escapeHtml(o)}</button>`).join('');
    wrap.querySelectorAll('.quiz-opt').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k;
      wrap.querySelectorAll('.quiz-opt').forEach(x => x.disabled = true);
      wrap.querySelectorAll('.quiz-opt')[ans].classList.add('right');
      if (k === ans) { correct++; streak++; kit.addScore(100 + streak * 10); } else { streak = 0; b.classList.add('wrong'); }
      i++; kit.timeout(show, 1200);
    }));
  }
  show();
});
