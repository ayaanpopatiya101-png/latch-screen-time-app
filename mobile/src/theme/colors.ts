// Forest + gold + sand palette. Key names retained (lime/purple/night) for
// backwards-compatibility with components that import them by name; only the
// hex values are remapped so the mobile prototype matches the web app's look.
export const palette = {
  cream: '#FAF0D7',
  creamSoft: '#FFF7E8',
  creamWarm: '#F3E4C2',
  night: '#0F3329',
  nightSoft: '#174C3C',
  nightPanel: '#245B45',
  // "lime" is now leaf green for positive / reward actions
  lime: '#5BBE7D',
  limeDeep: '#3F9D5E',
  // "purple" is now a deeper forest accent used for focus / locked panels
  purple: '#245B45',
  purpleDeep: '#0F3329',
  // gold / yellow for energy, credits, streaks
  yellow: '#FFD166',
  yellowDeep: '#E9A93A',
  // soft terracotta replaces the old coral so it still reads as alert without
  // clashing with the forest palette
  coral: '#D9534F',
  ink: '#0B2620',
  textPrimary: '#0F3329',
  textInverse: '#FFF7E8',
  textMuted: '#4B5F55',
  textMutedDark: '#A8C5B5',
  divider: '#E8D9B8',
  dividerDark: '#27433A',
  success: '#5BBE7D',
  warn: '#E9A93A',
  danger: '#D9534F',
} as const;

export type PaletteKey = keyof typeof palette;

export const gradients = {
  limePower: [palette.lime, palette.limeDeep] as const,
  purpleFocus: [palette.nightSoft, palette.purpleDeep] as const,
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
