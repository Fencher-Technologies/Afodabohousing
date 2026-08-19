/**
 * Axis — Design Tokens
 * Single source of truth for colors, spacing, radii, typography, shadows.
 */

export const Colors = {
  // Brand
  primary: "#1A2332",
  primaryDeep: "#15202B",
  primarySoft: "#E8EDF5",
  primaryMuted: "#536A8A",

  gold: "#C9A961",
  goldSoft: "#F5EED9",

  accent: "#D32F2F",
  accentSoft: "#FDE8E8",

  // Semantic
  success: "#2E7D52",
  successSoft: "#E4F4EC",
  warning: "#D97706",
  warningSoft: "#FEF3E2",
  danger: "#C0392B",
  dangerSoft: "#FBEAE8",
  info: "#2D6A9F",
  infoSoft: "#E6F0F8",

  // Neutrals
  bg: "#FAFAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F2F7",
  border: "#E0E4EC",
  borderStrong: "#C4CDD8",

  // Text
  textPrimary: "#0A0F1A",
  textSecondary: "#5A6370",
  textMuted: "#8A9099",
  textOnPrimary: "#FFFFFF",
  textOnGold: "#0A0F1A",

  // Tab bar
  tabActive: "#1A2332",
  tabInactive: "#9AA3AE",

  // Health
  healthGood: "#2E7D52",
  healthWarn: "#D97706",
  healthBad: "#C0392B",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Radii = {
  pill: 999,
  input: 12,
  card: 16,
  modal: 24,
  button: 12,
  sm: 8,
} as const;

export const FontSize = {
  display: 28,
  title: 22,
  h2: 18,
  h3: 16,
  body: 15,
  caption: 13,
  micro: 11,
} as const;

export const FontWeight = {
  bold: "700",
  semibold: "600",
  medium: "500",
  regular: "400",
} as const;

export const Shadows = {
  card: {
    shadowColor: "#1A1F1C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: "#1A1F1C",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  fab: {
    shadowColor: "#1A2332",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "gold" | "accent" | "muted";

export const ToneColors: Record<Tone, { fg: string; bg: string }> = {
  primary: { fg: Colors.primary, bg: Colors.primarySoft },
  success: { fg: Colors.success, bg: Colors.successSoft },
  warning: { fg: Colors.warning, bg: Colors.warningSoft },
  danger: { fg: Colors.danger, bg: Colors.dangerSoft },
  info: { fg: Colors.info, bg: Colors.infoSoft },
  gold: { fg: "#8A6D2F", bg: Colors.goldSoft },
  accent: { fg: Colors.accent, bg: Colors.accentSoft },
  muted: { fg: Colors.textSecondary, bg: Colors.surfaceAlt },
};
