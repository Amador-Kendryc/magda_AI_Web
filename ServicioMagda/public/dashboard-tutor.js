/* =========================================================
   dashboard-tutor.js — Panel del Tutor MAGDA AI
   ========================================================= */
'use strict';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const AUTH_API  = isLocal ? 'http://localhost:3001' : window.location.origin;
const MAGDA_API = isLocal ? 'http://localhost:3002' : window.location.origin;


const $  = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

/* ── Sesión ── */
function getUser()  { return JSON.parse(localStorage.getItem('magda_user') || 'null'); }
function getToken() { return localStorage.getItem('magda_token'); }

/* ── Fetch helpers ── */
async function apiFetch(base, path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await fetch(base + path, { ...opts, headers });
    const d = await r.json();
    return r.ok ? { data: d, err: null } : { data: null, err: d.error || `Error ${r.status}` };
  } catch { return { data: null, err: 'Sin conexión con el servidor' }; }
}
const authFetch  = (p, o) => apiFetch(AUTH_API,  p, o);
const magdaFetch = (p, o) => apiFetch(MAGDA_API, p, o);

/* ── Toast ── */
const Toast = (() => {
  const wrap = $('toasts');
  const show = (msg, cls, ms = 4000) => {
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = `toast ${cls}`; t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); t.addEventListener('transitionend', () => t.remove(), { once: true }); }, ms);
  };
  return { ok: m => show(m,'t-ok'), err: m => show(m,'t-err',5500), info: m => show(m,'t-info') };
})();

/* ── Modal ── */
function openModal(id) { const m=$(id); m?.classList.add('open'); m?.setAttribute('aria-hidden','false'); m?.querySelector('button, [role="listitem"]')?.focus(); }
function closeModal(id) { const m=$(id); m?.classList.remove('open'); m?.setAttribute('aria-hidden','true'); }

/* ── Navegación entre secciones ── */
let invidentes = [];

function showSection(name) {
  document.querySelectorAll('.dash-section').forEach(s => { s.hidden = true; });
  document.querySelectorAll('.dash-nav-btn').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });

  const sec = $(`sec-${name}`);
  const btn = qs(`[data-section="${name}"]`);
  if (sec) { sec.hidden = false; }
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }

  if (name === 'invidentes')    cargarInvidentes();
  if (name === 'evaluaciones')  cargarEvaluaciones();
}

/* ── Cargar invidentes ── */
async function cargarInvidentes() {
  const list = $('invidentes-list');
  if (!list) return;
  list.innerHTML = '<div class="loading-state" role="status"><i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Cargando...</div>';
  if (window.lucide) lucide.createIcons();

  const { data, err } = await magdaFetch('/api/tutores/mis-invidentes');
  if (err) { list.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle" aria-hidden="true"></i><p>${err}</p></div>`; if (window.lucide) lucide.createIcons(); return; }

  invidentes = data;

  if (!data.length) {
    list.innerHTML = `
      <div class="empty-state">
        <i data-lucide="users" aria-hidden="true"></i>
        <p>Aun no tienes personas vinculadas a tu cuenta.</p>
        <button class="btn-primary btn-sm" onclick="showSection('vincular')">
          <i data-lucide="user-plus" aria-hidden="true"></i>
          Vincular invidente
        </button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  list.innerHTML = data.map(u => `
    <article class="inv-card" role="listitem" tabindex="0">
      <div class="inv-card-icon" aria-hidden="true"><i data-lucide="accessibility"></i></div>
      <div class="inv-card-body">
        <strong class="inv-card-name">${u.nombre_completo}</strong>
        <span class="inv-card-email">${u.correo}</span>
        <span class="inv-card-since">Vinculado: ${new Date(u.vinculado_en).toLocaleDateString('es-MX',{dateStyle:'medium'})}</span>
      </div>
      <div class="inv-card-actions">
        <button class="btn-primary btn-sm" onclick="iniciarEvaluacion(${u.id_usuario}, '${u.nombre_completo.replace(/'/g,"\\'")}')">
          <i data-lucide="clipboard-list" aria-hidden="true"></i>
          Evaluar
        </button>
        <button class="btn-ghost btn-sm" onclick="desvincular(${u.id_usuario}, '${u.nombre_completo.replace(/'/g,"\\'")}')">
          <i data-lucide="user-minus" aria-hidden="true"></i>
          Desvincular
        </button>
      </div>
    </article>`).join('');

  if (window.lucide) lucide.createIcons();
}

/* ── Cargar evaluaciones ── */
async function cargarEvaluaciones() {
  const list = $('evaluaciones-list');
  if (!list) return;
  list.innerHTML = '<div class="loading-state" role="status"><i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Cargando...</div>';
  if (window.lucide) lucide.createIcons();

  const { data, err } = await magdaFetch('/api/evaluaciones');
  if (err) { list.innerHTML = `<div class="empty-state"><p>${err}</p></div>`; return; }

  if (!data.length) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="clipboard-list" aria-hidden="true"></i><p>No hay evaluaciones registradas aun.</p></div>`;
    if (window.lucide) lucide.createIcons(); return;
  }

  list.innerHTML = data.map(ev => `
    <details class="eval-item">
      <summary class="eval-summary">
        <span class="eval-name">${ev.invidente_nombre}</span>
        <span class="eval-date">${new Date(ev.fecha_evaluacion).toLocaleDateString('es-MX',{dateStyle:'medium'})}</span>
        <i data-lucide="chevron-down" class="eval-chevron" aria-hidden="true"></i>
      </summary>
      <div class="eval-body">
        <div class="eval-q"><strong>1. Autonomia y asistencia:</strong><p>${ev.p1_autonomia}</p></div>
        <div class="eval-q"><strong>2. Factores ambientales:</strong><p>${ev.p2_factores_ambientales}</p></div>
        <div class="eval-q"><strong>3. Confianza y seguridad:</strong><p>${ev.p3_confianza}</p></div>
        <div class="eval-q"><strong>4. Claridad y latencia:</strong><p>${ev.p4_claridad_latencia}</p></div>
        <div class="eval-q"><strong>5. Viabilidad futura:</strong><p>${ev.p5_viabilidad_futura}</p></div>
      </div>
    </details>`).join('');

  if (window.lucide) lucide.createIcons();
}

/* ── Iniciar evaluación ── */
window.iniciarEvaluacion = function(id, nombre) {
  // Redirigir al formulario de encuesta con parámetros
  window.location.href = `evaluacion.html?invidente_id=${id}&nombre=${encodeURIComponent(nombre)}`;
};

/* ── Desvincular ── */
window.desvincular = async function(id, nombre) {
  if (!confirm(`Desvincular a ${nombre} de tu panel? Esta accion puede revertirse vinculando nuevamente.`)) return;
  const { data, err } = await magdaFetch(`/api/tutores/desvincular/${id}`, { method: 'DELETE' });
  if (err) { Toast.err(err); return; }
  Toast.ok(data.mensaje);
  cargarInvidentes();
};

/* ── Vincular por correo ── */
$('vincular-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const correo = $('vin-correo')?.value?.trim();
  const err = $('vin-err'); const ok = $('vin-ok');
  if (err) err.textContent = ''; if (ok) ok.textContent = '';
  if (!correo) { if (err) err.textContent = 'Ingresa el correo del invidente'; return; }

  const { data, err: e2 } = await magdaFetch('/api/tutores/vincular', {
    method: 'POST', body: JSON.stringify({ correo_invidente: correo })
  });
  if (e2) { if (err) err.textContent = e2; return; }
  if (ok) ok.textContent = data.mensaje;
  if ($('vin-correo')) $('vin-correo').value = '';
  Toast.ok(data.mensaje);
});

/* ── Registrar invidente nuevo ── */
$('reg-inv-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = $('ri-nombre')?.value?.trim();
  const correo = $('ri-correo')?.value?.trim();
  const pass   = $('ri-pass')?.value;
  const err = $('ri-err'); const ok = $('ri-ok');
  if (err) err.textContent = ''; if (ok) ok.textContent = '';

  const { data, err: e2 } = await authFetch('/api/auth/register-invidente', {
    method: 'POST',
    body: JSON.stringify({ nombre_completo: nombre, correo, contrasena: pass })
  });
  if (e2) { if (err) err.textContent = e2; return; }
  if (ok) ok.textContent = data.mensaje;
  e.target.reset();
  Toast.ok(data.mensaje);
});

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  /* Verificar sesión */
  const user = getUser();
  if (!user || !getToken()) { Toast.err('Debes iniciar sesion'); setTimeout(() => window.location.href = 'index.html', 1500); return; }
  if ((user.nombre_rol || '').toLowerCase() !== 'tutor') {
    Toast.err('Acceso solo para tutores'); setTimeout(() => window.location.href = 'index.html', 1500); return;
  }

  /* Info usuario en header */
  const info = $('dash-user-info');
  if (info) info.innerHTML = `<span class="dash-username"><i data-lucide="user" aria-hidden="true"></i>${user.nombre_completo?.split(' ')[0]}</span>`;

  /* Logout */
  $('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('magda_token');
    localStorage.removeItem('magda_user');
    window.location.href = 'index.html';
  });

  /* Navegación sidebar */
  document.querySelectorAll('.dash-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  /* Botón nueva evaluación */
  $('btn-nueva-eval')?.addEventListener('click', () => {
    if (!invidentes.length) {
      Toast.info('Primero vincula al menos una persona invidente');
      showSection('vincular'); return;
    }
    /* Poblar modal de selección */
    const list = $('modal-inv-list');
    if (list) {
      list.innerHTML = invidentes.map(u => `
        <div role="listitem">
          <button class="inv-select-btn" onclick="iniciarEvaluacion(${u.id_usuario},'${u.nombre_completo.replace(/'/g,"\\'")}');closeModalGlobal('modal-eval-select');">
            <i data-lucide="accessibility" aria-hidden="true"></i>
            <span>${u.nombre_completo}</span>
            <span class="inv-select-email">${u.correo}</span>
          </button>
        </div>`).join('');
      if (window.lucide) lucide.createIcons();
    }
    openModal('modal-eval-select');
  });

  $('close-eval-select')?.addEventListener('click', () => closeModal('modal-eval-select'));
  $('modal-eval-select')?.addEventListener('click', e => { if (e.target === $('modal-eval-select')) closeModal('modal-eval-select'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal('modal-eval-select'); });

  window.closeModalGlobal = closeModal;

  if (window.lucide) lucide.createIcons();

  /* Cargar sección inicial */
  showSection('invidentes');
});

function openModal(id) { const m=$(id); m?.classList.add('open'); m?.setAttribute('aria-hidden','false'); }
function closeModal(id) { const m=$(id); m?.classList.remove('open'); m?.setAttribute('aria-hidden','true'); }
