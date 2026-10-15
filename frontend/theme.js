// Single source of truth for the app's look. 8pt spacing grid, one teal accent.
export const colors = {
  bg: '#F5F3EF',
  card: '#FFFFFF',
  border: '#E7E3DC',
  ink: '#1C1B1F',
  muted: '#6B6862',
  accent: '#0F5C5A',
  accentSoft: '#E3EEEC',
  onAccent: '#FFFFFF',
  onAccentMuted: 'rgba(255,255,255,0.72)',
  activeText: '#15803D',
  activeBg: '#DCFCE7',
  leaveText: '#B45309',
  leaveBg: '#FEF3C7',
  danger: '#B91C1C',
  overlay: 'rgba(28,27,31,0.45)',
};

// Tier tints of the accent, light -> dark. `text` is the readable color on top of `bg`.
export const tierTints = [
  { bg: '#E3EEEC', border: '#CFE2DF', text: '#0F5C5A', track: 'rgba(15,92,90,0.14)', fill: '#7FB0AC' },
  { bg: '#C5DDDA', border: '#B0CFCB', text: '#0B4543', track: 'rgba(11,69,67,0.16)', fill: '#3F8582' },
  { bg: '#0F5C5A', border: '#0F5C5A', text: '#FFFFFF', track: 'rgba(255,255,255,0.25)', fill: '#FFFFFF' },
];

// Muted avatar palette (background, foreground)
export const avatarPalette = [
  ['#E3EEEC', '#0F5C5A'],
  ['#F3E8D8', '#8A5A1F'],
  ['#E7E4F0', '#51477A'],
  ['#F2E1E1', '#8A3B3B'],
  ['#E1EBF2', '#2F5D7C'],
  ['#EAEFD9', '#566B1F'],
];

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { card: 16, control: 12, pill: 999 };

export const type = {
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  section: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.muted,
  },
  body: { fontSize: 15, color: colors.ink },
  number: { fontWeight: '700', fontVariant: ['tabular-nums'] },
};

export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: colors.border,
};
