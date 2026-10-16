'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookIcon, MapIcon, NewsIcon, PersonIcon, PinIcon, ReportIcon } from './Icons';

export const TABS = [
  { href: '/', label: 'Map', Icon: MapIcon },
  { href: '/news', label: 'News', Icon: NewsIcon },
  { href: '/report', label: 'Report', Icon: ReportIcon },
  { href: '/guide', label: 'Guide', Icon: BookIcon },
  { href: '/account', label: 'Account', Icon: PersonIcon },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      <div className="brand">
        <span className="brand-mark">
          <PinIcon />
        </span>
        <span className="brand-name">Wildwatch NTU</span>
        <span className="brand-tag">a field notebook for campus wildlife</span>
      </div>
      <ul className="nav-list">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className="nav-item" aria-current={active ? 'page' : undefined}>
                <span className="nav-icon">
                  <Icon />
                </span>
                <span className="nav-label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
