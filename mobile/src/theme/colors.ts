export const palette = {
  cream: '#F6EFE2',
  creamSoft: '#FBF5EA',
  creamWarm: '#EFE5D1',
  night: '#1B1A1F',
  nightSoft: '#26242C',
  nightPanel: '#2F2D36',
  lime: '#C8FF5E',
  limeDeep: '#A6E232',
  purple: '#7B5BFF',
  purpleDeep: '#5A3CE6',
  yellow: '#F7D24A',
  yellowDeep: '#E2B71F',
  coral: '#FF7E6B',
  ink: '#141318',
  textPrimary: '#1B1A1F',
  textInverse: '#FBF5EA',
  textMuted: '#5F5A52',
  textMutedDark: '#A09BA7',
  divider: '#E5DDCB',
  dividerDark: '#3A3742',
  success: '#3FB47B',
  warn: '#E2A03F',
  danger: '#D9534F',
} as const;

export type PaletteKey = keyof typeof palette;

export const gradients = {
  limePower: [palette.lime, palette.limeDeep] as const,
  purpleFocus: [palette.purple, palette.purpleDeep] as const,
  yellowEnergy: [palette.yellow, palette.yellowDeep] as const,
  nightPanel: [palette.nightSoft, palette.nightPanel] as const,
  cream: [palette.creamSoft, palette.creamWarm] as const,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardLifted: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
};
