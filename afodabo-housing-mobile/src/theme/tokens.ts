export const colors = {
  background: '#FBF7F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F4EDE1',
  primary: '#236048',
  primaryForeground: '#FBF7F1',
  accent: '#DA6931',
  accentForeground: '#FFFFFF',
  accentSoft: '#F9E2D6',
  gold: '#F3B818',
  heroText: '#F2E8DD',
  heroOverlay: 'rgba(28, 58, 45, 0.72)',
  primarySoft: '#DDEAE3',
  textPrimary: '#2C241E',
  textSecondary: '#675C53',
  textMuted: '#8A7E75',
  border: '#E6D9C8',
  success: '#2D6A4F',
  warning: '#C98810',
  error: '#B2433F',
  sidebar: '#1F4B39',
  sidebarAccent: '#2E6B50',
  overlay: 'rgba(31, 23, 16, 0.18)',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  pill: 999,
  input: 12,
  card: 20,
  modal: 28,
} as const;

export const shadows = {
  card: {
    shadowColor: '#236048',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#236048',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
} as const;

export const typography = {
  display: 'PlayfairDisplay_700Bold',
  displayMedium: 'PlayfairDisplay_600SemiBold',
  displayStrong: 'PlayfairDisplay_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyStrong: 'Inter_600SemiBold',
} as const;
