/**
 * NØVA brand + product constants. Single source of truth for copy that
 * appears across metadata, navbar, footer, dashboard and docs.
 */

export const site = {
  name: 'NØVA',
  fullName: 'NØVA — Private Proof Network',
  tagline: 'Prove what matters. Reveal nothing else.',
  description:
    'NØVA lets you prove eligibility, reputation and uniqueness without revealing the information behind the proof. Private credentials, selective proofs and anti-sybil claims, verified on Midnight.',
  url: 'https://nova.xyz',
  links: {
    docs: '/developers',
    dashboard: '/dashboard',
    demo: '/demo',
    grant: '/grant',
    verifier: '/dashboard/requests',
  },
} as const;

export const NAV_LINKS = [
  { href: '/#proof', label: 'How it works' },
  { href: '/#reputation', label: 'Reputation' },
  { href: '/#anti-sybil', label: 'One Person. One Proof.' },
  { href: '/developers', label: 'Developers' },
] as const;

export const DASHBOARD_NAV = [
  { href: '/dashboard', label: 'Overview', icon: 'layout-dashboard' },
  { href: '/dashboard/credentials', label: 'Credentials', icon: 'key-round' },
  { href: '/dashboard/proofs', label: 'Proofs', icon: 'file-check-2' },
  { href: '/dashboard/reputation', label: 'Reputation', icon: 'bar-chart-3' },
  { href: '/dashboard/requests', label: 'Requests', icon: 'inbox' },
  { href: '/dashboard/activity', label: 'Activity', icon: 'activity' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'settings-2' },
] as const;
