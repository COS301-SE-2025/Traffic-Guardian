import { StyleSheet, Dimensions } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';

const { width, height } = Dimensions.get('window');

export const globalStyles = StyleSheet.create({
navbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(41,41,41,1)",
    paddingVertical: 25,
    borderBottomWidth: 2,
    borderBottomColor: "grey",
  },
  navText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  navTextActive: {
    color: "orange", // active page highlight
    fontWeight: "700",
  },

  //
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
    color : 'orange',
    fontWeight: '600',
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    color : 'white',
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

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusInactive: {
    backgroundColor: colors.error,
  },
  statusWarning: {
    backgroundColor: colors.warning,
  },

  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  badgePrimary: {
    backgroundColor: colors.primary.light,
  },
  badgePrimaryText: {
    color: colors.primary.main,
  },
  badgeSuccess: {
    backgroundColor: colors.success + '20',
  },
  badgeSuccessText: {
    color: colors.success,
  },
  badgeWarning: {
    backgroundColor: colors.warning + '20',
  },
  badgeWarningText: {
    color: colors.warning,
  },
  badgeError: {
    backgroundColor: colors.error + '20',
  },
  badgeErrorText: {
    color: colors.error,
  },

  padding: {
    padding: 16,
  },
  paddingHorizontal: {
    paddingHorizontal: 16,
  },
  paddingVertical: {
    paddingVertical: 16,
  },
  margin: {
    margin: 16,
  },
  marginHorizontal: {
    marginHorizontal: 16,
  },
  marginVertical: {
    marginVertical: 16,
  },

  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  spaceAround: {
    justifyContent: 'space-around',
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  justifyCenter: {
    justifyContent: 'center',
  },
  justifyStart: {
    justifyContent: 'flex-start',
  },
  justifyEnd: {
    justifyContent: 'flex-end',
  },
  flex1: {
    flex: 1,
  },

  fullWidth: {
    width: width,
  },
  fullHeight: {
    height: height,
  },
  halfWidth: {
    width: width * 0.5,
  },
  screenPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border.light,
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: colors.border.light,
  },
  borderAll: {
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    maxHeight: height * 0.8,
  },
  darkModalContent: {
    backgroundColor: colors.surface.dark,
  },

  tabBar: {
    backgroundColor: colors.surface.light,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingBottom: 8,
    paddingTop: 8,
  },
  darkTabBar: {
    backgroundColor: colors.surface.dark,
    borderTopColor: colors.border.dark,
  },

  emergency: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  emergencyText: {
    color: colors.text.light,
    fontWeight: 'bold',
  },
  safeZone: {
    paddingTop: 44, // iOS status bar height
    paddingBottom: 34, // iOS home indicator height
  },
});