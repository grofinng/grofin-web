import { useEffect } from 'react';

/**
 * For every element marked with the `.glow` class, tracks the mouse position
 * within the element and exposes it as `--mx` / `--my` CSS custom properties.
 * Pair with a `::after` pseudo-element that uses
 * `radial-gradient(... at var(--mx) var(--my), ..., transparent)` to render
 * the follow-cursor glow.
 */
export function useCursorGlow() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.glow'));
    if (!targets.length) return;

    const detach: Array<() => void> = [];

    for (const el of targets) {
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      };
      const onLeave = () => {
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      detach.push(() => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      });
    }

    return () => detach.forEach((d) => d());
  }, []);
}
