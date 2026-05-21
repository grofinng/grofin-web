interface LogoProps {
  className?: string;
}

// The Esena logo is a standalone mark (badge + wordmark in one image),
// so it's rendered on its own — no separate text alongside it.
export function Logo({ className }: LogoProps) {
  return (
    <img
      src="/Esena-logo.jpeg"
      alt="Esena Africa"
      className={`brand-logo${className ? ` ${className}` : ''}`}
    />
  );
}
