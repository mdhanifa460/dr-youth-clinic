// Curated background themes for the Glass Hero banner template. A closed
// enum rather than a free color picker — every value here has been
// authored with verified light/dark text contrast against its own
// gradient, which an open-ended admin color picker could silently break.
// Shared by GlassHeroBanner.tsx (render) and the admin editor (swatch
// picker) so both read one source of truth.

export type HeroThemeId = 'aurora' | 'gold' | 'ocean' | 'violet' | 'midnight';

export interface HeroTheme {
  id: HeroThemeId;
  label: string;
  isDark: boolean;
  // Applied as inline CSS custom properties on the hero's root element —
  // globals.css's .glass-hero rules consume these vars, so the animated
  // gradient / glow orbs / particle tint are all themeable without any
  // per-theme CSS class duplication.
  vars: {
    '--hero-grad-1': string;
    '--hero-grad-2': string;
    '--hero-grad-3': string;
    '--hero-glow-a': string;
    '--hero-glow-b': string;
    '--hero-particle': string;
    '--hero-text': string;
    '--hero-text-muted': string;
    '--hero-glass-bg': string;
    '--hero-glass-border': string;
    '--hero-accent': string;
    '--hero-accent-text': string;
  };
}

export const HERO_THEMES: HeroTheme[] = [
  {
    id: 'aurora',
    label: 'Aurora (light, signature blue)',
    isDark: false,
    vars: {
      '--hero-grad-1': '#eef5ff',
      '--hero-grad-2': '#f7f2ff',
      '--hero-grad-3': '#e8f3f6',
      '--hero-glow-a': 'rgba(96,165,216,0.35)',
      '--hero-glow-b': 'rgba(197,181,255,0.30)',
      '--hero-particle': 'rgba(11,37,96,0.25)',
      '--hero-text': '#0B2560',
      '--hero-text-muted': 'rgba(11,37,96,0.65)',
      '--hero-glass-bg': 'rgba(255,255,255,0.55)',
      '--hero-glass-border': 'rgba(255,255,255,0.8)',
      '--hero-accent': '#0B2560',
      '--hero-accent-text': '#ffffff',
    },
  },
  {
    id: 'gold',
    label: 'Gold (light, luxury warm)',
    isDark: false,
    vars: {
      '--hero-grad-1': '#fdf8ef',
      '--hero-grad-2': '#fbeed9',
      '--hero-grad-3': '#f5e6f0',
      '--hero-glow-a': 'rgba(245,166,35,0.30)',
      '--hero-glow-b': 'rgba(255,214,165,0.35)',
      '--hero-particle': 'rgba(154,101,15,0.25)',
      '--hero-text': '#3a2a0f',
      '--hero-text-muted': 'rgba(58,42,15,0.65)',
      '--hero-glass-bg': 'rgba(255,255,255,0.55)',
      '--hero-glass-border': 'rgba(255,255,255,0.85)',
      '--hero-accent': '#B8791A',
      '--hero-accent-text': '#ffffff',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean (light, cool calm)',
    isDark: false,
    vars: {
      '--hero-grad-1': '#eafaf6',
      '--hero-grad-2': '#e6f4ff',
      '--hero-grad-3': '#f0f9ff',
      '--hero-glow-a': 'rgba(45,175,190,0.30)',
      '--hero-glow-b': 'rgba(96,165,216,0.30)',
      '--hero-particle': 'rgba(10,90,100,0.22)',
      '--hero-text': '#0b3a3f',
      '--hero-text-muted': 'rgba(11,58,63,0.65)',
      '--hero-glass-bg': 'rgba(255,255,255,0.55)',
      '--hero-glass-border': 'rgba(255,255,255,0.8)',
      '--hero-accent': '#0B7285',
      '--hero-accent-text': '#ffffff',
    },
  },
  {
    id: 'violet',
    label: 'Violet (dark, premium)',
    isDark: true,
    vars: {
      '--hero-grad-1': '#1a1033',
      '--hero-grad-2': '#241145',
      '--hero-grad-3': '#150c2e',
      '--hero-glow-a': 'rgba(147,112,255,0.35)',
      '--hero-glow-b': 'rgba(96,165,216,0.25)',
      '--hero-particle': 'rgba(214,197,255,0.45)',
      '--hero-text': '#f5f3ff',
      '--hero-text-muted': 'rgba(245,243,255,0.72)',
      '--hero-glass-bg': 'rgba(255,255,255,0.08)',
      '--hero-glass-border': 'rgba(255,255,255,0.18)',
      '--hero-accent': '#F5A623',
      '--hero-accent-text': '#1a1033',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight (dark, exclusive)',
    isDark: true,
    vars: {
      '--hero-grad-1': '#0a1224',
      '--hero-grad-2': '#0f1c33',
      '--hero-grad-3': '#08101f',
      '--hero-glow-a': 'rgba(96,165,216,0.30)',
      '--hero-glow-b': 'rgba(245,166,35,0.15)',
      '--hero-particle': 'rgba(200,220,245,0.4)',
      '--hero-text': '#f2f6fc',
      '--hero-text-muted': 'rgba(242,246,252,0.72)',
      '--hero-glass-bg': 'rgba(255,255,255,0.07)',
      '--hero-glass-border': 'rgba(255,255,255,0.16)',
      '--hero-accent': '#F5A623',
      '--hero-accent-text': '#0a1224',
    },
  },
];

export function getHeroTheme(id: string | undefined): HeroTheme {
  return HERO_THEMES.find((t) => t.id === id) || HERO_THEMES[0];
}
