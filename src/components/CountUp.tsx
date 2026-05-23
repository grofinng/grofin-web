import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  duration?: number;
}

/**
 * Animates the numeric portion of a display string (e.g. "₦5M+", "10,000+",
 * "1,900+") from 0 to its target whenever the element scrolls into view.
 * Prefix (currency symbols) and suffix (M+, +, etc.) are preserved verbatim.
 * Resets to 0 when scrolled out of view so it replays on next entry.
 */
export function CountUp({ value, duration = 1400 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!match) {
      setDisplayed(value);
      return;
    }
    const [, prefix, rawNum, suffix] = match;
    const hadComma = rawNum.includes(',');
    const target = parseFloat(rawNum.replace(/,/g, ''));
    if (!Number.isFinite(target)) {
      setDisplayed(value);
      return;
    }

    const format = (n: number) => {
      const rounded = Math.round(n);
      const formatted = hadComma ? rounded.toLocaleString('en-NG') : String(rounded);
      return `${prefix}${formatted}${suffix}`;
    };

    let raf = 0;
    let startTime = 0;
    let active = false;

    setDisplayed(format(0));

    const step = (t: number) => {
      if (!startTime) startTime = t;
      const progress = Math.min(1, (t - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayed(format(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (active) return;
            active = true;
            startTime = 0;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(step);
          } else if (active) {
            active = false;
            cancelAnimationFrame(raf);
            setDisplayed(format(0));
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return <span ref={ref}>{displayed}</span>;
}
