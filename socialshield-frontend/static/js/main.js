// Shared helpers for every page
const CSRF = document.querySelector('meta[name="csrf-token"]').content;

async function api(url, body, method) {
  const opts = { method: method || (body ? 'POST' : 'GET'), headers: { 'X-CSRF-Token': CSRF } };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  return res.json();
}

function toast(text, ms = 2200) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

function copyText(text) {
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
    .then(() => toast('Copied to clipboard 📋'))
    .catch(() => toast(text, 4000));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
  // mobile nav
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  toggle && toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // user dropdown
  const userLi = document.querySelector('.nav-user');
  if (userLi) {
    userLi.querySelector('.user-chip').addEventListener('click', e => { e.stopPropagation(); userLi.classList.toggle('open'); });
    document.addEventListener('click', () => userLi.classList.remove('open'));
  }

  // flashes
  document.querySelectorAll('.flash').forEach(f => {
    f.querySelector('.flash-close').addEventListener('click', () => f.remove());
    if (!f.classList.contains('flash-warning') && !f.classList.contains('flash-error')) setTimeout(() => f.remove(), 7000);
  });

  // reveal on scroll
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // generic tabs: [data-tabs] container with .tab[data-tab] and .tab-panel#id
  document.querySelectorAll('[data-tabs]').forEach(group => {
    const tabs = group.querySelectorAll('.tab');
    const activate = id => {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === id));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === id));
    };
    tabs.forEach(t => t.addEventListener('click', () => { activate(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab); }));
    const hash = location.hash.slice(1);
    if (hash && group.querySelector(`[data-tab="${hash}"]`)) activate(hash);
  });

  // password show/hide + strength meter
  document.querySelectorAll('.pw-toggle').forEach(b => b.addEventListener('click', () => {
    const inp = b.previousElementSibling;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    b.textContent = inp.type === 'password' ? '👁️' : '🙈';
  }));
  document.querySelectorAll('[data-strength]').forEach(inp => {
    const bar = document.querySelector(inp.dataset.strength);
    inp.addEventListener('input', () => {
      const v = inp.value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      bar.style.width = (s * 25) + '%';
    });
  });

  // range value labels
  document.querySelectorAll('input[type=range][data-out]').forEach(r => {
    const out = document.querySelector(r.dataset.out);
    const upd = () => out.textContent = r.value + (r.dataset.suffix || '');
    r.addEventListener('input', upd); upd();
  });

  // animated counters
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = +el.dataset.count; let n = 0; const step = Math.max(1, Math.ceil(target / 40));
    const tick = () => { n = Math.min(target, n + step); el.textContent = n; if (n < target) requestAnimationFrame(tick); };
    tick();
  });

  // modals
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => document.querySelector(b.dataset.open).classList.add('show')));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
    if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('show');
  }));
});
