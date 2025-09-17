import { StyleSheet, Dimensions } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';

const { width, height } = Dimensions.get('window');

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  darkContainer: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.light,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  header: {
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.light,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 4,
  },

  loadingText: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 10,
  },
  successText: {
    ...typography.body,
    color: colors.success,
    textAlign: 'center',
    marginVertical: 10,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    textAlign: 'center',
    marginVertical: 10,
  },

  card: {
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: colors.surface.dark,
    borderColor: colors.border.dark,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },

  primaryButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.light,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary.main,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: colors.surface.disabled,
    opacity: 0.6,
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.light,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...typography.body,
    color: colors.text.primary,
    marginVertical: 8,
  },
  darkInput: {
    borderColor: colors.border.dark,
    backgroundColor: colors.surface.dark,
    color: colors.text.light,
  },
  inputFocused: {
    borderColor: colors.primary.main,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: 4,
  },

  listContainer: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  listItemSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  listItemAction: {
    marginLeft: 12,
  },

  