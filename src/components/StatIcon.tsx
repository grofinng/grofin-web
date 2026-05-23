import { ReactElement } from 'react';
import { StatIcon as StatIconType } from '../types';

interface Props {
  icon: StatIconType;
  size?: number;
}

const PATHS: Record<StatIconType, ReactElement> = {
  chart: (
    <>
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </>
  ),
  box: (
    <>
      <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  trending: (
    <>
      <path d="M3 17 10 10l4 4 7-7" />
      <path d="M14 7h7v7" />
    </>
  ),
  meal: (
    <>
      <path d="M7 2v8a2 2 0 0 0 2 2v10" />
      <path d="M11 2v8" />
      <path d="M7 2v8" />
      <path d="M17 2c-2 0-3 2-3 5 0 2 1 4 3 4v11" />
    </>
  ),
  naira: (
    <>
      <text x="12" y="17" textAnchor="middle" fontSize="14" fontFamily="system-ui" fontWeight="700">₦</text>
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 21c0-2 2-4 5-4s4 1 4 3" />
    </>
  ),
  home: (
    <>
      <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4c-9 0-14 5-14 12 0 2 1 4 2 4 4 0 12-5 12-16Z" />
      <path d="M6 20 14 12" />
    </>
  ),
};

export function StatIcon({ icon, size = 22 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[icon]}
    </svg>
  );
}
