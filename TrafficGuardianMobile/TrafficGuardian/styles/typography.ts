import { Platform } from 'react-native';

export const typography = {
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
    light: Platform.select({
      ios: 'System',
      android: 'Roboto-Light',
      default: 'System',
    }),
  },

  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: Platform.select({ ios: '700', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },

  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },

  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },

  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
  },

  h5: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Platform.select({ ios: '500', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
  },

  h6: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: Platform.select({ ios: '500', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
  },

  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.select({ ios: '400', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  bodyLarge: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: Platform.select({ ios: '400', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Platform.select({ ios: '400', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: Platform.select({ ios: '400', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: Platform.select({ ios: '500', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
  },

  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Platform.select({ ios: '500', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
  },

  labelLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.select({ ios: '500', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
  },

  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    textAlign: 'center' as const,
  },

  buttonSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    textAlign: 'center' as const,
  },

  buttonLarge: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    textAlign: 'center' as const,
  },

  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: Platform.select({ ios: '500', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    textAlign: 'center' as const,
  },

  input: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.select({ ios: '400', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  navTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
  },

  statValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: Platform.select({ ios: '700', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },

  statValueLarge: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: Platform.select({ ios: '700', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },

  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: Platform.select({ ios: '500', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  time: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },

  date: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Platform.select({ ios: '400', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  emergency: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Platform.select({ ios: '700', android: 'bold' }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },

  code: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Platform.select({ ios: '400', android: 'normal' }),
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  fontWeight: {
    light: Platform.select({ ios: '300', android: 'normal' }),
    normal: Platform.select({ ios: '400', android: 'normal' }),
    medium: Platform.select({ ios: '500', android: 'normal' }),
    semibold: Platform.select({ ios: '600', android: 'bold' }),
    bold: Platform.select({ ios: '700', android: 'bold' }),
    heavy: Platform.select({ ios: '800', android: 'bold' }),
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },

  textAlign: {
    left: 'left' as const,
    center: 'center' as const,
    right: 'right' as const,
    justify: 'justify' as const,
  },

  textDecoration: {
    none: 'none' as const,
    underline: 'underline' as const,
    lineThrough: 'line-through' as const,
  },

  textTransform: {
    none: 'none' as const,
    uppercase: 'uppercase' as const,
    lowercase: 'lowercase' as const,
    capitalize: 'capitalize' as const,
  },
};