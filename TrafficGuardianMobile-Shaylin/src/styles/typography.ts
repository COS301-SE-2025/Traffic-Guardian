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

  