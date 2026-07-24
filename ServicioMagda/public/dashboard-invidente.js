/* =========================================================
   dashboard-invidente.js — Panel del Usuario Invidente
   ========================================================= */
'use strict';

const MAGDA_API = 'http://localhost:3002';
const $ = id => document.getElementById(id);

function getUser()  { return JSON.parse(localStorage.getItem('magda_user') || 'null'); }
function getToken() { return localStorage.getItem('magda_token'); }

async function magdaFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await fetch(MAGDA_API + path, { ...opts, headers });
    const d = await r.json();
    return r.ok ? { data: d, err: null } : { data: null, err: d.error || `Error ${r.status}` };
  } catch { return { data: null, err: 'Sin conexion con el servidor' }; }
}

const Toast = (() => {
  const wrap = $('toasts');
  const show = (msg, cls, ms = 4000) => {
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = `toast ${cls}`; t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); t.addEventListener('transitionend', () => t.remove(), {once:true}); }, ms);
  };
  return { ok: m=>show(m,'t-ok'), err: m=>show(m,'t-err',5500), info: m=>show(m,'t-info') };
})();

/* ── Navegación ── */
function showSection(name) {
  document.querySelectorAll('.dash-section').forEach(s => { s.hidden = true; });
  document.querySelectorAll('.dash-nav-btn').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });

  const sec = $(`sec-${name}`);
  const btn = document.querySelector(`[data-section="${name}"]`);
  if (sec) { sec.hidden = false; sec.focus?.(); }
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }

  if (name === 'perfil')    cargarPerfil();
  if (name === 'tutores')   cargarTutores();
  if (name === 'historial') cargarHistorial();
}

/* ── Perfil ── */
async function cargarPerfil() {
  const el = $('perfil-content');
  if (!el) return;
  el.innerHTML = '<div class="loading-state" role="status"><i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Cargando perfil...</div>';
  if (window.lucide) lucide.createIcons();

  const { data, err } = await magdaFetch('/api/usuarios/perfil');
  if (err) { el.innerHTML = `<div class="empty-state"><p>${err}</p></div>`; return; }

  el.innerHTML = `
    <dl class="profile-dl">
      <div class="profile-field">
        <dt><i data-lucide="user" aria-hidden="true"></i> Nombre</dt>
        <dd>${data.nombre_completo}</dd>
      </div>
      <div class="profile-field">
        <dt><i data-lucide="mail" aria-hidden="true"></i> Correo</dt>
        <dd>${data.correo}</dd>
      </div>
      <div class="profile-field">
        <dt><i data-lucide="shield" aria-hidden="true"></i> Rol</dt>
        <dd>${data.nombre_rol}</dd>
      </div>
      <div class="profile-field">
        <dt><i data-lucide="calendar" aria-hidden="true"></i> Miembro desde</dt>
        <dd>${new Date(data.creado_en).toLocaleDateString('es-MX', { dateStyle: 'long' })}</dd>
      </div>
      <div class="profile-field">
        <dt><i data-lucide="activity" aria-hidden="true"></i> Estado de cuenta</dt>
        <dd>${data.activo ? 'Activa' : 'Inactiva'}</dd>
      </div>
    </dl>`;
  if (window.lucide) lucide.createIcons();
}

/* ── Tutores asignados ── */
async function cargarTutores() {
  const el = $('tutores-content');
  if (!el) return;
  el.innerHTML = '<div class="loading-state" role="status"><i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Cargando tutores...</div>';
  if (window.lucide) lucide.createIcons();

  const { data, err } = await magdaFetch('/api/tutores/mi-tutor');
  if (err) {
    el.innerHTML = `<div class="empty-state"><i data-lucide="user-check" aria-hidden="true"></i><p>No se encontraron tutores asignados. Pide a tu tutor que te vincule desde su panel.</p></div>`;
    if (window.lucide) lucide.createIcons(); return;
  }

  if (!data.length) {
    el.innerHTML = `<div class="empty-state"><i data-lucide="user-check" aria-hidden="true"></i><p>Aun no tienes tutores asignados.</p></div>`;
    if (window.lucide) lucide.createIcons(); return;
  }

  el.innerHTML = `
    <ul class="tutor-list" role="list" aria-label="Lista de tutores asignados">
      ${data.map(t => `
        <li class="tutor-item" role="listitem">
          <div class="tutor-item-icon" aria-hidden="true"><i data-lucide="user-check"></i></div>
          <div>
            <strong>${t.nombre_tutor}</strong>
            <span>${t.correo_tutor}</span>
            <time datetime="${t.vinculado_en}">Vinculado: ${new Date(t.vinculado_en).toLocaleDateString('es-MX',{dateStyle:'medium'})}</time>
          </div>
        </li>`).join('')}
    </ul>`;
  if (window.lucide) lucide.createIcons();
}

/* ── Historial de accesos ── */
async function cargarHistorial() {
  const el = $('historial-content');
  if (!el) return;
  el.innerHTML = '<div class="loading-state" role="status"><i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Cargando historial...</div>';
  if (window.lucide) lucide.createIcons();

  const { data, err } = await magdaFetch('/api/historial?limite=20');
  if (err) { el.innerHTML = `<div class="empty-state"><p>${err}</p></div>`; return; }

  if (!data.length) {
    el.innerHTML = `<div class="empty-state"><i data-lucide="history" aria-hidden="true"></i><p>Sin registros de acceso aun.</p></div>`;
    if (window.lucide) lucide.createIcons(); return;
  }

  el.innerHTML = `
    <div class="table-wrap" role="region" aria-label="Tabla de historial de accesos" tabindex="0">
      <table class="data-table">
        <caption class="sr-only">Historial de accesos a tu cuenta MAGDA AI</caption>
        <thead>
          <tr>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Dispositivo</th>
            <th scope="col">Direccion IP</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td><time datetime="${r.fecha_ingreso}">${new Date(r.fecha_ingreso).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</time></td>
              <td>${r.dispositivo || '—'}</td>
              <td><code>${r.direccion_ip || '—'}</code></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  if (window.lucide) lucide.createIcons();
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  const user = getUser();
  if (!user || !getToken()) { window.location.href = 'index.html'; return; }

  const rol = (user.nombre_rol || '').toLowerCase();
  if (rol !== 'invidente' && rol !== 'usuario') {
    window.location.href = 'dashboard-tutor.html'; return;
  }

  /* Mostrar nombre en header */
  const info = $('dash-user-info');
  if (info) info.innerHTML = `<span class="dash-username"><i data-lucide="user" aria-hidden="true"></i>${user.nombre_completo?.split(' ')[0]}</span>`;
  if (window.lucide) lucide.createIcons();

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

  /* Foco inicial — importante para lectores de pantalla */
  const live = $('sr-live');
  if (live) live.textContent = `Panel cargado. Bienvenido, ${user.nombre_completo}. Usa Tab para navegar.`;

  showSection('perfil');
});
