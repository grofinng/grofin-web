import { useState } from 'react';

interface Props {
  value?: string | null;
  /** Accessible name for the toggle, e.g. "BVN". */
  label: string;
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

/**
 * Renders a sensitive identifier (BVN, NIN, …) masked by default with an eye
 * button that reveals it. Hidden again whenever the component unmounts.
 */
export function SensitiveValue({ value, label }: Props) {
  const [shown, setShown] = useState(false);
  if (!value) return <span className="mono">—</span>;
  const masked = '•'.repeat(Math.min(value.length, 12));
  return (
    <span className="sensitive">
      <span className={`mono sensitive-value ${shown ? '' : 'masked'}`}>{shown ? value : masked}</span>
      <button
        type="button"
        className="sensitive-toggle"
        aria-pressed={shown}
        aria-label={shown ? `Hide ${label}` : `Show ${label}`}
        title={shown ? `Hide ${label}` : `Show ${label}`}
        onClick={() => setShown((s) => !s)}
      >
        <EyeIcon off={shown} />
      </button>
    </span>
  );
}
