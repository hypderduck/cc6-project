import type { SVGProps } from 'react';

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

type P = SVGProps<SVGSVGElement>;

export const MapIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </svg>
);

export const NewsIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z" />
    <path d="M17 9h3v8a2 2 0 0 1-2 2h-1" />
    <path d="M7.5 9h6M7.5 12.5h6M7.5 16h4" />
  </svg>
);

export const ReportIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z" />
    <path d="M12 7v6M9 10h6" />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Z" />
    <path d="M12 6.5v13" />
  </svg>
);

export const PersonIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base} strokeWidth={2.4} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PinIcon = (p: P) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
  </svg>
);

export const ChevronIcon = (p: P) => (
  <svg {...base} width={16} height={16} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
