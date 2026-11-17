const SITE_URL = '';
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const localGet = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};
const localSet = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

const apiRequest = async (path, options = {}) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), options.timeout || 1400);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (!response.ok) throw new Error('request_failed');
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
};

const motion = typeof window.anime === 'function' ? window.anime : (options = {}) => {
  const targets = typeof options.targets === 'string' ? $$(options.targets) : (options.targets?.length ? [...options.targets] : [options.targets]);
  targets.filter(Boolean).forEach((node, index) => {
    node.style.opacity = '1';
    node.style.transform = 'translateY(0)';
    if (options.delay) node.style.transitionDelay = `${typeof options.delay === 'function' ? options.delay(index) : options.delay}ms`;
  });
  if (typeof options.complete === 'function') options.complete();
};

function navigateTo(id) {
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function setupNavigation() {
  $$('[data-target]').forEach((button) => button.addEventListener('click', () => navigateTo(button.dataset.target)));
  $$('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => {
    const id = link.getAttribute('href')?.slice(1);
    if (!id || !document.getElementById(id)) return;
    event.preventDefault();
    navigateTo(id);
    history.replaceState(null, '', `#${id}`);
  }));
  document.addEventListener('click', (event) => {
    const target = event.target.closest('.button, .fb-download, .fb-submit');
    if (!target || prefersReducedMotion) return;
    const ripple = document.createElement('span');
    ripple.className = 'tap-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    target.append(ripple);
    window.setTimeout(() => ripple.remove(), 500);
  });
}

function setupSections() {
  const sections = $$('.section[data-section]');
  const dots = $$('.dot-nav button');
  if (prefersReducedMotion) sections.forEach((section) => section.classList.add('is-visible'));
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      const title = $('.reveal-title', entry.target);
      if (title && !prefersReducedMotion && typeof window.anime === 'function') {
        motion({ targets: title, opacity: [0, 1], translateY: [22, 0], duration: 850, easing: 'easeOutCubic' });
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: .18 });
  sections.forEach((section) => revealObserver.observe(section));

  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      dots.forEach((dot) => dot.setAttribute('aria-current', dot.dataset.target === entry.target.id ? 'true' : 'false'));
    });
  }, { threshold: .52 });
  sections.forEach((section) => activeObserver.observe(section));

  let ticking = false;
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    const bar = $('#scroll-progress');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  updateProgress();
}

function setupParticles() {
  const canvas = $('#particle-canvas');
  const hero = $('#hero');
  if (!canvas || !hero || prefersReducedMotion) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  let width = 0; let height = 0; let raf = 0; let active = true; let hidden = document.hidden;
  let particles = [];
  const resize = () => {
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = window.innerWidth < 600 ? 40 : 85;
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: height * (.1 + Math.random() * .85),
      r: 1.0 + Math.random() * 2.0,
      a: .25 + Math.random() * .4,
      vx: -.35 + Math.random() * .7,
      vy: -.25 + Math.random() * .5,
      phase: index * .47
    }));
  };
  const draw = (time = 0) => {
    if (canvas.dataset.inactive === 'true') { raf = 0; return; }
    if (!active || hidden) { raf = 0; return; }
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      particle.x += particle.vx; particle.y += particle.vy;
      if (particle.x < -10) particle.x = width + 10; if (particle.x > width + 10) particle.x = -10;
      if (particle.y < 0) particle.y = height; if (particle.y > height) particle.y = 0;
      const glow = particle.a + Math.sin(time * .0015 + particle.phase) * .15;
      context.beginPath(); context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2); context.fillStyle = `rgba(198,241,53,${Math.max(.05, glow)})`; context.fill();
    });
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i]; const b = particles[j]; const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 140) {
          context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y);
          context.strokeStyle = `rgba(34,211,238,${.16 * (1 - distance / 140)})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }
    }
    raf = requestAnimationFrame(draw);
  };
  const heroObserver = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active && !hidden && !raf) raf = requestAnimationFrame(draw); }, { threshold: .05 });
  heroObserver.observe(hero);
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden && active && !raf) raf = requestAnimationFrame(draw); });
  window.addEventListener('resize', resize, { passive: true });
  resize(); raf = requestAnimationFrame(draw);
}

function setupPhishDemo() {
  const buttons = $$('.phish-hotspot');
  const note = $('#phish-note');
  const result = $('#phish-result');
  const copy = { sender: 'The address is almost familiar, but the extra word and domain are a warning.', urgent: 'A threat with a deadline is trying to replace your judgment with a reflex.', link: 'The button moves you to a page you did not ask for. Do not use it to verify anything.' };
  const found = new Set();
  buttons.forEach((button) => button.addEventListener('click', () => {
    found.add(button.dataset.flag); button.classList.add('is-flagged');
    if (note) note.textContent = copy[button.dataset.flag];
    if (result) result.innerHTML = `<span>${found.size} / 3</span> red flags found`;
  }));
}

function setupTabs() {
  const tabs = $$('.tab-switcher [role="tab"]');
  const panels = $$('.tab-panel');
  const activate = (tab) => {
    tabs.forEach((item) => item.setAttribute('aria-selected', item === tab ? 'true' : 'false'));
    panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.panel === tab.dataset.tab));
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[nextIndex].focus(); activate(tabs[nextIndex]);
    });
  });
}

const quizQuestions = [
  { question: 'A message says your account will be deleted today. What is the safest first move?', options: ['Tap the link before the deadline', 'Pause and verify through the official app or website', 'Reply asking if it is real'], correct: 1, explain: 'Urgency is a common pressure tactic. Use a trusted route instead of the message.' },
  { question: 'Which password habit gives one stolen password the smallest blast radius?', options: ['Reuse one strong password everywhere', 'Use unique passwords stored in a password manager', 'Change only the last character each time'], correct: 1, explain: 'Unique passwords prevent one leak from unlocking unrelated accounts.' },
  { question: 'What is a key clue that a sender address deserves a closer look?', options: ['It contains an unfamiliar domain or extra word', 'It uses a logo in the message', 'It says “hello”'], correct: 0, explain: 'The visible name can be copied. The underlying address is a stronger clue.' },
  { question: 'You clicked something suspicious and entered a password. What comes next?', options: ['Wait to see what happens', 'Change the affected credential and secure reused passwords', 'Delete the browser history only'], correct: 1, explain: 'Act quickly: change credentials, enable extra protection, and notify the service.' },
  { question: 'Which sentence is the useful rule of thumb from this exhibition?', options: ['Fast clicks are safer clicks', 'Legitimate organizations will not threaten account deletion over an unprompted SMS link', 'Only experts get targeted'], correct: 1, explain: 'A pause gives you room to verify the request on your own terms.' }
];

function setupQuiz() {
  const content = $('#quiz-content'); const progress = $('#quiz-progress'); const feedback = $('#quiz-feedback'); const next = $('#quiz-next');
  if (!content || !progress || !next) return;
  const state = { index: 0, score: 0, answered: false, saved: false };
  const render = () => {
    const item = quizQuestions[state.index]; state.answered = false;
    progress.textContent = `${String(state.index + 1).padStart(2, '0')} / 05`;
    next.textContent = state.index === quizQuestions.length - 1 ? 'See final score →' : 'Next question →';
    if (feedback) feedback.textContent = '';
    content.innerHTML = `<p class="quiz-question">${item.question}</p><div class="quiz-options">${item.options.map((option, index) => `<button type="button" class="quiz-option" data-answer="${index}">${option}</button>`).join('')}</div>`;
    $$('.quiz-option', content).forEach((button) => button.addEventListener('click', () => {
      if (state.answered) return;
      state.answered = true;
      const answer = Number(button.dataset.answer); const correct = answer === item.correct;
      if (correct) state.score += 1;
      $$('.quiz-option', content).forEach((option, optionIndex) => { option.disabled = true; if (optionIndex === item.correct) option.classList.add('is-correct'); else if (optionIndex === answer) option.classList.add('is-wrong'); });
      if (feedback) feedback.textContent = correct ? `Correct. ${item.explain}` : `Not quite. ${item.explain}`;
    }));
  };
  const finish = async () => {
    if (!state.answered) { if (feedback) feedback.textContent = 'Choose an answer first.'; return; }
    content.innerHTML = `<div class="quiz-finish"><span class="eyebrow">FINAL READOUT</span><p class="quiz-question">You scored <strong>${state.score} / 5</strong>.</p><p>${state.score >= 4 ? 'Your instinct is to pause and verify. Keep making that pause visible.' : 'The good news: every question is a practice rep. Slow the moment down, then verify.'}</p></div>`;
    next.textContent = 'Restart quiz →';
    if (feedback) feedback.textContent = 'Score saved when the exhibition backend is available.';
    if (!state.saved) { state.saved = true; try { await apiRequest('api/quiz', { method: 'POST', body: JSON.stringify({ score: state.score }) }); } catch { const saved = localGet('cybersafe-local-quiz', 0); localSet('cybersafe-local-quiz', saved + 1); } }
    state.index = quizQuestions.length;
  };
  next.addEventListener('click', () => {
    if (state.index >= quizQuestions.length) { state.index = 0; state.score = 0; state.saved = false; render(); return; }
    if (!state.answered) { if (feedback) feedback.textContent = 'Choose an answer first.'; return; }
    if (state.index === quizQuestions.length - 1) finish(); else { state.index += 1; render(); }
  });
  render();
}

async function setupStats() {
  const visitLabel = $('#visit-count'); const pledgeLabel = $('#pledge-count');
  let stats = { ...localGet('cybersafe-local-stats', { visits: 0, pledges: 0 }) };
  try { stats = { ...stats, ...(await apiRequest('api/stats')) }; } catch {}
  if (!sessionStorage.getItem('cybersafe-visited')) {
    sessionStorage.setItem('cybersafe-visited', '1'); stats.visits = Number(stats.visits || 0) + 1;
    try { stats = { ...stats, ...(await apiRequest('api/visit', { method: 'POST', body: '{}' })) }; } catch { localSet('cybersafe-local-stats', stats); }
  }
  if (visitLabel) visitLabel.textContent = `${Number(stats.visits || 0).toLocaleString()} briefings started`;
  if (pledgeLabel) pledgeLabel.textContent = `${Number(stats.pledges || 0).toLocaleString()} people have pledged`;
  const pledge = $('#pledge-button');
  pledge?.addEventListener('click', async () => {
    pledge.disabled = true; pledge.textContent = 'Pledge received ✓'; stats.pledges = Number(stats.pledges || 0) + 1;
    if (pledgeLabel) pledgeLabel.textContent = `${Number(stats.pledges).toLocaleString()} people have pledged`;
    try { const response = await apiRequest('api/pledge', { method: 'POST', body: '{}' }); if (response?.pledges != null && pledgeLabel) pledgeLabel.textContent = `${Number(response.pledges).toLocaleString()} people have pledged`; } catch { localSet('cybersafe-local-stats', stats); }
  });
}

function qrFallback(container, url) {
  container.innerHTML = `<div class="fb-qr-fallback" title="${url.replace(/"/g, '&quot;')}"><span>⌁</span><small>QR library unavailable</small><small>Use the link beside this code.</small></div>`;
}

function renderQr(container, url, label) {
  if (!container) return;
  try {
    if (typeof window.qrcode !== 'function') throw new Error('qr_unavailable');
    const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
    container.innerHTML = qr.createSvgTag(4, 4, { text: label || 'QR code' });
    const svg = $('svg', container);
    if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label || 'QR code'); }
    container.dataset.qrUrl = url;
  } catch { qrFallback(container, url); }
}

const FEEDBACK_FORM_URL = 'https://www.template.net/share/6afc561b71ea5b37a4cd76bf/guest';

function setupQrs() {
  const websiteUrl = SITE_URL || window.location.origin;
  const feedbackUrl = FEEDBACK_FORM_URL;
  const websiteQr = $('#website-qr'); const feedbackQr = $('#feedback-qr'); const urlLabel = $('#site-url-label');
  if (urlLabel) urlLabel.textContent = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'Current exhibition';
  const draw = () => {
    if (feedbackQr) {
      feedbackQr.innerHTML = '<img src="google-form-qr.png" alt="Online Feedback Form QR Code" style="width:100%;height:auto;display:block;border-radius:4px;">';
      feedbackQr.dataset.qrUrl = feedbackUrl;
    }
    renderQr(websiteQr, websiteUrl, 'Website QR code');
  };
  draw(); window.setTimeout(draw, 900);
  $$('[data-download-qr]').forEach((button) => button.addEventListener('click', () => {
    const targetId = button.dataset.downloadQr;
    const container = document.getElementById(targetId);
    if (!container) return;
    const svg = $('svg', container);
    if (svg) {
      const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>${svg.outerHTML}`], { type: 'image/svg+xml;charset=utf-8' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${targetId}.svg`; link.click(); URL.revokeObjectURL(link.href);
    } else {
      const img = $('img', container);
      if (img) {
        const link = document.createElement('a'); link.href = img.src; link.download = 'google-form-qr.png'; link.click();
      }
    }
  }));
}

function setupFeedback() {
  const form = $('#feedback-native-form'); const formCard = $('#feedback-form'); const thanks = $('#fb-thanks'); const again = $('#fb-again'); const status = $('#fb-form-status');
  if (!form || !thanks) return;
  const required = ['fb-full-name', 'fb-exhibition-rating', 'fb-website-rating', 'fb-vibes-rating'];
  const validate = () => {
    let valid = true;
    required.forEach((id) => { const field = document.getElementById(id); const error = $(`[data-error-for="${id}"]`); if (!field.value.trim()) { valid = false; if (error) error.textContent = 'This field is required.'; field.setAttribute('aria-invalid', 'true'); } else { if (error) error.textContent = ''; field.removeAttribute('aria-invalid'); } });
    return valid;
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!validate()) { if (status) status.textContent = 'Complete the required fields, then send again.'; return; }
    const data = Object.fromEntries(new FormData(form).entries());
    try { await apiRequest('api/feedback', { method: 'POST', body: JSON.stringify(data), timeout: 1800 }); } catch { const responses = localGet('cybersafe-local-feedback', []); responses.push({ ...data, savedAt: new Date().toISOString() }); localSet('cybersafe-local-feedback', responses); }
    form.hidden = true; if (formCard) formCard.classList.add('is-complete'); thanks.hidden = false;
  });
  again?.addEventListener('click', () => { form.reset(); form.hidden = false; thanks.hidden = true; if (formCard) formCard.classList.remove('is-complete'); if (status) status.textContent = ''; });
}

function setupQrOnlyView() { if (new URLSearchParams(window.location.search).get('qr') === '1') document.body.classList.add('qr-only'); }

setupNavigation();
setupSections();
setupParticles();
setupPhishDemo();
setupTabs();
setupQuiz();
setupStats();
setupQrs();
setupFeedback();
setupQrOnlyView();
