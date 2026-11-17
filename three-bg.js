/* Galaxy 1 Hero Background Integration
   Runs the Galaxy 1 GPU particle simulation in the background of the hero section,
   perfectly blended with the CyberSafe HUD theme. */

(() => {
  'use strict';

  const container = document.getElementById('hero');
  const oldCanvas = document.getElementById('particle-canvas');
  if (!container) return;

  function waitForDeps(callback, maxWait = 15000) {
    if (window.THREE && window.Galaxy1Simulation) { callback(); return; }
    const start = Date.now();
    const check = () => {
      if (window.THREE && window.Galaxy1Simulation) callback();
      else if (Date.now() - start < maxWait) requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }

  waitForDeps(() => {
    try {
      if (oldCanvas) {
        oldCanvas.style.display = 'none';
        oldCanvas.dataset.inactive = 'true';
      }

      const isMobile = window.innerWidth < 768;
      // 350k on desktop, 180k on mobile for hero overlay
      const particleTarget = isMobile ? 180000 : 350000;

      const sim = new window.Galaxy1Simulation(container, {
        particles: particleTarget,
        theme: 'cybersafe',
        exposure: 1.25,
        cameraDistance: 5.8,
        cameraAngle: 35.1,
        cameraHeight: 22.0
      });

      if (sim && sim.canvas) {
        sim.canvas.style.zIndex = '-1';
        sim.canvas.style.opacity = '0.92';
        sim.canvas.style.pointerEvents = 'none';
      }
    } catch (e) {
      console.warn('Galaxy 1 hero init failed, falling back to 2D canvas', e);
      if (oldCanvas) oldCanvas.style.display = 'block';
    }
  });
})();
