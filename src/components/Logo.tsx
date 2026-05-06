interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  variant?: 'default' | 'inverse';
}

export function Logo({ size = 32, withWordmark = true, variant = 'default' }: LogoProps) {
  const ink = variant === 'inverse' ? '#ffffff' : '#0f3a25';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {/* <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="GroFin logo"
      >
        <defs>
          <linearGradient id="gfGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={green} />
            <stop offset="100%" stopColor="#36a967" />
          </linearGradient>
        </defs>
        <path
          d="M44 14a18 18 0 1 0 6 28v-12H34v6h10v3a12 12 0 1 1-3-19z"
          fill="url(#gfGrad)"
        />
        <path
          d="M48 8c-6 4-9 10-9 16 6-1 10-5 12-10 1-2 1-4-3-6z"
          fill={leaf}
        />
        <rect x="22" y="40" width="4" height="10" rx="1" fill={silver} />
        <rect x="29" y="36" width="4" height="14" rx="1" fill={silver} />
        <rect x="36" y="32" width="4" height="18" rx="1" fill={silver} />
      </svg> */}


      <img src="/grofin-logo.jpeg" alt="GroFin logo" width={size} height={size} />
      {withWordmark && (
        <span style={{ fontWeight: 700, fontSize: size * 0.6, color: ink, letterSpacing: '-0.02em' }}>
          GroFin
        </span>
      )}
    </span>
  );
}
