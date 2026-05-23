import { useEffect } from 'react';

/**
 * Watches for `.reveal` elements in the DOM and toggles `.in-view` as they
 * scroll into the viewport. Pair with the `.reveal` / `.reveal.in-view`
 * styles in theme.css.
 *
 * Pass a `key` (e.g. an async-loaded array) so the observer re-scans the
 * DOM when content renders later.
 */
export function useScrollReveal(key?: unknown) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in-view'));
      return;
    }
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          // Toggle on every entry/exit so the animation replays every time
          // the user scrolls the element back into view — both up and down.
          e.target.classList.toggle('in-view', e.isIntersecting);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [key]);
}
