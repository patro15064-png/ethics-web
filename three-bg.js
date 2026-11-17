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
      // 320k on desktop, 160k on mobile for rich vibrant hero galaxy
      const particleTarget = isMobile ? 160000 : 320000;

      const sim = new window.Galaxy1Simulation(container, {
        particles: particleTarget,
        theme: 'cybersafe',
        exposure: 1.0,
        brightness: 0.92,
        sparkle: 0.65,
        size: 1.0,
        cameraDistance: 6.0,
        cameraAngle: 36.0,
        cameraHeight: 23.0,
        transparentBackground: true
      });

      if (sim && sim.canvas) {
        sim.canvas.style.zIndex = '0';
        sim.canvas.style.opacity = '0.75';
        sim.canvas.style.pointerEvents = 'none';
      }
    } catch (e) {
      console.warn('Galaxy 1 hero init failed, falling back to 2D canvas', e);
      if (oldCanvas) oldCanvas.style.display = 'block';
    }
  });
})();
