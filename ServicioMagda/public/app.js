/* =========================================================
   MAGDA AI × TINGO — app.js v2
   Portal informativo + gestión por roles
   Sin chat. Sin emojis. Lucide icons.
   Auth → ServicioAuth :3001
   Data → ServicioMagda :3002
   ========================================================= */
'use strict';

const AUTH_API  = 'http://localhost:3001';
const MAGDA_API = 'http://localhost:3002';

/* ── Helpers ── */
const $  = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ── Fetch SOA ── */
async function apiFetch(base, path, opts = {}) {
  const token = localStorage.getItem('magda_token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await fetch(base + path, { ...opts, headers });
    const d = await r.json();
    return r.ok ? { data: d, err: null } : { data: null, err: d.error || `Error ${r.status}` };
  } catch {
    return { data: null, err: 'Sin conexión con el servidor' };
  }
}
const authFetch  = (p, o) => apiFetch(AUTH_API,  p, o);
const magdaFetch = (p, o) => apiFetch(MAGDA_API, p, o);

/* ── Toast ── */
const Toast = (() => {
  const wrap = $('toasts');
  const show = (msg, cls, ms = 4000) => {
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.setAttribute('role', 'status');
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, ms);
  };
  return {
    ok:   m => show(m, 't-ok'),
    err:  m => show(m, 't-err', 5500),
    info: m => show(m, 't-info'),
    warn: m => show(m, 't-warn'),
  };
})();

/* ── Scroll ── */
window.addEventListener('scroll', () => {
  qs('.site-header')?.classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

/* ── Smooth scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ── Reveal on scroll ── */
(() => {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } });
  }, { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

/* ── Nav burger ── */
(() => {
  const burger = $('nav-burger');
  const links  = $('nav-links');
  burger?.addEventListener('click', () => {
    const open = links?.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    burger.querySelector('svg')?.setAttribute('data-lucide', open ? 'x' : 'menu');
    if (window.lucide) lucide.createIcons();
  });
  document.querySelectorAll('.nav-link').forEach(l =>
    l.addEventListener('click', () => {
      links?.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');
    })
  );
})();

/* ── Background Canvas ── */
class BgCanvas {
  constructor() {
    this.c = $('bg-canvas'); if (!this.c) return;
    this.ctx = this.c.getContext('2d');
    this.pts = [];
    this.resize();
    this.spawn(50);
    this.loop();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }
  resize() { this.c.width = innerWidth; this.c.height = innerHeight; }
  spawn(n) {
    for (let i = 0; i < n; i++) this.pts.push({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.5 + .5
    });
  }
  loop() {
    const { ctx, c, pts } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
      if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,85,255,.18)'; ctx.fill();
    });
    for (let i = 0; i < pts.length - 1; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.strokeStyle = `rgba(0,85,255,${.04 * (1 - d / 120)})`;
          ctx.lineWidth = .5;
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    requestAnimationFrame(() => this.loop());
  }
}

/* ── Modal helper ── */
function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  m.querySelector('button, input, select')?.focus();
}
function closeModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}

/* Expuesto globalmente para los botones inline del HTML */
window.abrirModal = function(tipo) {
  if (tipo === 'tutor') {
    openModal('auth-modal');
    $('ru-rol') && ($('ru-rol').value = 'tutor');
    // Cambiar al tab de registro si no hay sesión
    if (!localStorage.getItem('magda_token')) switchTab('in');
  } else if (tipo === 'invidente') {
    openModal('auth-modal');
    $('ru-rol') && ($('ru-rol').value = 'invidente');
    if (!localStorage.getItem('magda_token')) switchTab('in');
  } else {
    openModal('auth-modal');
  }
};

/* ── Tabs ── */
function switchTab(which) {
  const isIn = which === 'in';
  $('tab-in')?.classList.toggle('active', isIn);
  $('tab-in')?.setAttribute('aria-selected', String(isIn));
  $('tab-up')?.classList.toggle('active', !isIn);
  $('tab-up')?.setAttribute('aria-selected', String(!isIn));
  if ($('panel-in')) $('panel-in').hidden = !isIn;
  if ($('panel-up')) $('panel-up').hidden = isIn;
}

/* ── Auth ── */
function getUser()  { return JSON.parse(localStorage.getItem('magda_user') || 'null'); }
function getToken() { return localStorage.getItem('magda_token'); }

function saveSession(data) {
  localStorage.setItem('magda_token', data.token);
  localStorage.setItem('magda_user', JSON.stringify(data.usuario));
}
function clearSession() {
  localStorage.removeItem('magda_token');
  localStorage.removeItem('magda_user');
}

function updateAuthBtn() {
  const user = getUser();
  const txt  = $('auth-btn-text');
  if (!txt) return;
  if (user) {
    txt.textContent = user.nombre_completo?.split(' ')[0] || 'Mi perfil';
  } else {
    txt.textContent = 'Acceder';
  }
}

/* Redirigir según rol después del login */
function redirigirPorRol(usuario) {
  const rol = (usuario.nombre_rol || '').toLowerCase();
  if (rol === 'tutor') {
    window.location.href = 'dashboard-tutor.html';
  } else if (rol === 'invidente') {
    window.location.href = 'dashboard-invidente.html';
  } else {
    // Usuario general — mostrar perfil básico
    closeModal('auth-modal');
    Toast.ok(`Bienvenido, ${usuario.nombre_completo}`);
  }
}

async function doLogin(correo, contrasena) {
  const err = $('li-err');
  const btn = $('li-btn');
  if (btn) { btn.querySelector('.bst').textContent = 'Entrando...'; btn.querySelector('.bsp').hidden = false; }
  if (err) err.textContent = '';

  const { data, err: e } = await authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena })
  });

  if (btn) { btn.querySelector('.bst').textContent = 'Iniciar Sesión'; btn.querySelector('.bsp').hidden = true; }

  if (e) { if (err) err.textContent = e; return; }

  saveSession(data);
  updateAuthBtn();
  closeModal('auth-modal');
  Toast.ok(data.mensaje);
  loadStats();
  redirigirPorRol(data.usuario);
}

async function doRegister(nombre, correo, contrasena, tipo_rol) {
  const err = $('ru-err');
  const btn = $('ru-btn');
  if (btn) { btn.querySelector('.bst').textContent = 'Creando cuenta...'; btn.querySelector('.bsp').hidden = false; }
  if (err) err.textContent = '';

  const { data, err: e } = await authFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre_completo: nombre, correo, contrasena, tipo_rol })
  });

  if (btn) { btn.querySelector('.bst').textContent = 'Crear Cuenta'; btn.querySelector('.bsp').hidden = true; }

  if (e) { if (err) err.textContent = e; return; }

  saveSession(data);
  updateAuthBtn();
  closeModal('auth-modal');
  Toast.ok(data.mensaje);
  loadStats();
  redirigirPorRol(data.usuario);
}

/* ── Stats ── */
async function loadStats() {
  const ftBadge = $('ft-badge');
  const statTxt = $('status-text');
  const statusIcon = $('status-icon');

  const h = await magdaFetch('/api/health');
  if (h.err) {
    if (ftBadge)   { ftBadge.className = 'footer-status err'; }
    if (statTxt)   statTxt.textContent = 'Sistema no disponible';
    if (statusIcon) statusIcon.setAttribute('data-lucide', 'x-circle');
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (ftBadge)   { ftBadge.className = 'footer-status ok'; }
  if (statTxt)   statTxt.textContent = 'Sistema activo';
  if (statusIcon) statusIcon.setAttribute('data-lucide', 'check-circle');

  const st = await magdaFetch('/api/usuarios/stats');
  if (!st.err) {
    const su = $('stat-users');
    if (su) su.textContent = st.data.usuarios_activos;
  }

  if (window.lucide) lucide.createIcons();
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  /* Lucide icons */
  if (window.lucide) lucide.createIcons();

  /* Canvas fondo */
  new BgCanvas();

  /* Auth button */
  updateAuthBtn();

  /* Si ya hay sesión, redirigir directamente */
  const user = getUser();
  const token = getToken();
  if (user && token) {
    $('auth-btn')?.addEventListener('click', () => redirigirPorRol(user));
  } else {
    $('auth-btn')?.addEventListener('click', () => openModal('auth-modal'));
  }

  /* Cerrar modal */
  $('auth-close')?.addEventListener('click', () => closeModal('auth-modal'));
  $('auth-modal')?.addEventListener('click', e => {
    if (e.target === $('auth-modal')) closeModal('auth-modal');
  });

  /* Tabs */
  $('tab-in')?.addEventListener('click', () => switchTab('in'));
  $('tab-up')?.addEventListener('click', () => switchTab('up'));

  /* Login form */
  $('login-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const c = $('li-e')?.value?.trim();
    const p = $('li-p')?.value;
    if (c && p) doLogin(c, p);
  });

  /* Register form */
  $('reg-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const n    = $('ru-n')?.value?.trim();
    const c    = $('ru-e')?.value?.trim();
    const p    = $('ru-p')?.value;
    const rol  = $('ru-rol')?.value;
    if (!rol) { const err = $('ru-err'); if (err) err.textContent = 'Selecciona un tipo de cuenta'; return; }
    if (n && c && p) doRegister(n, c, p, rol);
  });

  /* ESC cierra modal */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal('auth-modal');
  });

  /* Stats footer */
  loadStats();
});
