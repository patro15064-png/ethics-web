/* Tiny transform/opacity-compatible fallback for offline preview. */
(() => {
  if (window.anime) return;
  const resolve = (target) => typeof target === 'string' ? [...document.querySelectorAll(target)] : (target?.length != null ? [...target] : [target]);
  const ease = (name, t) => name === 'easeOutCubic' ? 1 - Math.pow(1 - t, 3) : t;
  window.anime = (options = {}) => {
    const nodes = resolve(options.targets).filter(Boolean);
    const duration = Number(options.duration || 500);
    const delay = Number(options.delay || 0);
    const from = options.opacity?.[0] ?? 0;
    const to = options.opacity?.[1] ?? options.opacity ?? 1;
    const translateFrom = options.translateY?.[0] ?? 14;
    const translateTo = options.translateY?.[1] ?? 0;
    const start = performance.now() + delay;
    const tick = (now) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = ease(options.easing, progress);
      nodes.forEach((node) => {
        node.style.opacity = typeof options.opacity === 'undefined' ? '' : from + (to - from) * eased;
        node.style.transform = `translateY(${translateFrom + (translateTo - translateFrom) * eased}px)`;
      });
      if (progress < 1) requestAnimationFrame(tick);
      else if (typeof options.complete === 'function') options.complete();
    };
    requestAnimationFrame(tick);
    return { pause() {}, play() {} };
  };
  window.anime.stagger = (value, config = {}) => (index) => index * value;
})();
