/* =========================================================
   evaluacion.js — Wizard de encuesta de evaluación de viaje
   5 preguntas, una por pantalla. Guarda en /api/evaluaciones
   ========================================================= */
'use strict';

const MAGDA_API = 'http://localhost:3002';
const $  = id => document.getElementById(id);

function getToken() { return localStorage.getItem('magda_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('magda_user') || 'null'); }

async function magdaFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await fetch(MAGDA_API + path, { ...opts, headers });
    const d = await r.json();
    return r.ok ? { data: d, err: null } : { data: null, err: d.error || `Error ${r.status}` };
  } catch { return { data: null, err: 'Sin conexión con el servidor' }; }
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
  return { ok: m=>show(m,'t-ok'), err: m=>show(m,'t-err',5500) };
})();

/* ── Wizard state ── */
let currentStep = 1;
const TOTAL_STEPS = 5;

function goToStep(n) {
  // Ocultar panel actual
  const prev = $(`step-${currentStep}`);
  if (prev) { prev.classList.remove('active'); prev.hidden = true; }

  // Mostrar nuevo panel
  currentStep = n;
  const curr = $(`step-${currentStep}`);
  if (curr) { curr.hidden = false; curr.classList.add('active'); curr.querySelector('textarea')?.focus(); }

  // Progreso
  const fill = $('progress-fill');
  if (fill) fill.style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;

  // Indicadores de paso
  document.querySelectorAll('.eval-step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.toggle('active',    n === currentStep);
    s.classList.toggle('completed', n < currentStep);
  });

  // Label y aria
  const label = $('nav-label');
  if (label) label.textContent = `Pregunta ${currentStep} de ${TOTAL_STEPS}`;
  const wrap = $('progress-bar-wrap');
  if (wrap) wrap.setAttribute('aria-valuenow', String(currentStep));

  // Botones
  const prev_btn = $('btn-prev');
  const next_btn = $('btn-next');
  const sub_btn  = $('btn-submit');

  if (prev_btn) prev_btn.disabled = currentStep === 1;
  if (next_btn) next_btn.hidden   = currentStep === TOTAL_STEPS;
  if (sub_btn)  sub_btn.hidden    = currentStep !== TOTAL_STEPS;

  if (window.lucide) lucide.createIcons();
}

function validateStep(step) {
  const ta  = $(`p${step}`);
  const err = $(`err-${step}`);
  if (!ta?.value?.trim()) {
    if (err) err.textContent = 'Este campo es obligatorio. Por favor, escribe tu respuesta.';
    ta?.focus();
    return false;
  }
  if (err) err.textContent = '';
  return true;
}

/* ── Leer parámetros URL ── */
function getParams() {
  const sp = new URLSearchParams(window.location.search);
  return {
    invidente_id: sp.get('invidente_id'),
    nombre:       decodeURIComponent(sp.get('nombre') || 'Usuario invidente')
  };
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  /* Verificar sesión */
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = 'index.html'; return;
  }
  if ((user.nombre_rol || '').toLowerCase() !== 'tutor') {
    window.location.href = 'index.html'; return;
  }

  /* Parámetros del invidente */
  const { invidente_id, nombre } = getParams();
  if (!invidente_id) {
    window.location.href = 'dashboard-tutor.html'; return;
  }

  const nombreEl = $('eval-invidente-nombre');
  if (nombreEl) nombreEl.textContent = nombre;

  /* Ir al paso inicial */
  goToStep(1);

  /* Botón siguiente */
  $('btn-next')?.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
  });

  /* Botón anterior */
  $('btn-prev')?.addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  /* Teclado — Enter en textarea avanza (excepto último paso) */
  document.querySelectorAll('.form-textarea').forEach(ta => {
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (currentStep < TOTAL_STEPS) {
          $('btn-next')?.click();
        } else {
          $('btn-submit')?.click();
        }
      }
    });
  });

  /* Submit final */
  $('eval-form')?.addEventListener('submit', async e => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    const btn = $('btn-submit');
    if (btn) btn.textContent = 'Guardando...';

    const body = {
      invidente_id: parseInt(invidente_id),
      p1_autonomia:           $('p1')?.value?.trim(),
      p2_factores_ambientales: $('p2')?.value?.trim(),
      p3_confianza:            $('p3')?.value?.trim(),
      p4_claridad_latencia:    $('p4')?.value?.trim(),
      p5_viabilidad_futura:    $('p5')?.value?.trim()
    };

    const { data, err } = await magdaFetch('/api/evaluaciones', {
      method: 'POST', body: JSON.stringify(body)
    });

    if (btn) btn.textContent = 'Enviar evaluacion';

    if (err) { Toast.err(err); return; }

    /* Mostrar estado de éxito */
    $('eval-form').hidden   = true;
    $('eval-context').hidden = true;
    $('progress-bar-wrap').hidden = true;
    $('eval-success').hidden = false;

    const live = $('sr-live');
    if (live) live.textContent = `Evaluacion guardada correctamente. ID: ${data.id_evaluacion}`;

    if (window.lucide) lucide.createIcons();
  });
});
