// Floating "Shelly" chatbot, shown on every page
(() => {
  const root = document.getElementById('chatbot');
  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat-panel');
  const body = document.getElementById('chat-body');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const status = document.getElementById('chat-status');
  const suggest = document.getElementById('chat-suggest');
  const STORE = 'ss-chat-log';

  // Tiny, safe markdown: **bold**, *italic*, `code`, links, /paths and newlines
  function md(text) {
    let h = escapeHtml(text).replace(/^[ 	]*[*-] +/gm, '• ');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/(^|[\s(>])(\/(?:events|tools|resources|games|dashboard|login|register|forgot-password|about|faq|contact|privacy|terms)(?:[\/#][\w\-\/#]*)?)(?![\w\-\/#]*<\/a>)/g, '$1<a href="$2">$2</a>');
    return h.replace(/\n/g, '<br>');
  }

  function add(role, text, save = true) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = role === 'bot' ? md(text) : escapeHtml(text);
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    if (save) {
      try {
        const log = JSON.parse(sessionStorage.getItem(STORE) || '[]');
        log.push([role, text]);
        sessionStorage.setItem(STORE, JSON.stringify(log.slice(-40)));
      } catch (e) {}
    }
  }

  try { JSON.parse(sessionStorage.getItem(STORE) || '[]').forEach(([r, t]) => add(r, t, false)); } catch (e) {}

  function toggle(open) {
    const isOpen = open ?? panel.hidden;
    panel.hidden = !isOpen;
    root.classList.toggle('open', isOpen);
    if (isOpen) { input.focus(); body.scrollTop = body.scrollHeight; }
  }
  fab.addEventListener('click', () => toggle());
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });

  async function send(text) {
    text = text.trim();
    if (!text) return;
    add('user', text);
    input.value = '';
    suggest.style.display = 'none';
    const typing = document.createElement('div');
    typing.className = 'msg bot typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    status.textContent = 'Shelly is typing…';
    try {
      const res = await api('/api/chat', { message: text });
      typing.remove();
      add('bot', res.reply || res.error || 'Hmm, something went quiet. Try again?');
      status.textContent = res.source === 'gemini' ? 'Your quiet companion · Gemini' : 'Your quiet companion · offline mode';
    } catch (e) {
      typing.remove();
      add('bot', "I couldn't reach the server 🌧️ Please check your connection and try again.");
      status.textContent = 'Connection issue';
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  suggest.querySelectorAll('button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  document.getElementById('chat-reset').addEventListener('click', async () => {
    await api('/api/chat/reset', {});
    try { sessionStorage.removeItem(STORE); } catch (e) {}
    body.querySelectorAll('.msg').forEach((m, i) => i && m.remove());
    suggest.style.display = '';
  });

  // Let other scripts open the bot with a question: window.askShelly('...')
  window.askShelly = q => { toggle(true); send(q); };
})();
