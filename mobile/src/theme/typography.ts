import { Platform, TextStyle } from 'react-native';

const base: TextStyle = {
  fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
};

export const type = {
  display: { ...base, fontSize: 36, fontWeight: '800', letterSpacing: -0.5 } as TextStyle,
  h1: { ...base, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 } as TextStyle,
  h2: { ...base, fontSize: 22, fontWeight: '700', letterSpacing: -0.2 } as TextStyle,
  h3: { ...base, fontSize: 18, fontWeight: '700' } as TextStyle,
  bodyLg: { ...base, fontSize: 17, fontWeight: '500' } as TextStyle,
  body: { ...base, fontSize: 15, fontWeight: '500' } as TextStyle,
  bodySm: { ...base, fontSize: 13, fontWeight: '500' } as TextStyle,
  caption: { ...base, fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' } as TextStyle,
  mono: { ...base, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13 } as TextStyle,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 999,
};
