import { useEffect } from 'react';

/**
 * Translates elements marked with `data-parallax` based on scroll position.
 * The attribute's numeric value (e.g. data-parallax="0.15") sets the rate —
 * 0 = static, 1 = same speed as scroll (in the opposite direction), negative
 * values move with the scroll.
 *
 * The element's own static transform is preserved via the `--px-y` CSS
 * variable; the element's CSS should include
 * `transform: translateY(var(--px-y, 0));`.
 */
export function useParallax() {
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-parallax]')
    );
    if (!targets.length) return;

    let raf = 0;
    const update = () => {
      const vh = window.innerHeight;
      const sy = window.scrollY;
      for (const el of targets) {
        const rate = parseFloat(el.dataset.parallax || '0.15');
        const rect = el.getBoundingClientRect();
        const elemMid = rect.top + sy + rect.height / 2;
        const viewportMid = sy + vh / 2;
        const delta = (viewportMid - elemMid) * rate;
        el.style.setProperty('--px-y', `${delta.toFixed(1)}px`);
      }
      raf = 0;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
