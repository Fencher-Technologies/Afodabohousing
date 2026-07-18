/**
 * Afodabo Housing — Design Tokens
 * Single source of truth for colors, spacing, radii, typography, shadows.
 */

export const Colors = {
  // Brand
  primary: "#236048",
  primaryDeep: "#1B4A38",
  primarySoft: "#E8F0EC",
  primaryMuted: "#5A8B73",

  gold: "#C9A961",
  goldSoft: "#F5EED9",

  accent: "#D4783C",
  accentSoft: "#F5E6DC",

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
  bg: "#F7F5F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F2EFEA",
  border: "#E5E1DA",
  borderStrong: "#D2CCC2",

  // Text
  textPrimary: "#1A1F1C",
  textSecondary: "#5A635E",
  textMuted: "#8A9089",
  textOnPrimary: "#FFFFFF",
  textOnGold: "#1A1F1C",

  // Tab bar
  tabActive: "#236048",
  tabInactive: "#9AA39E",

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
    shadowColor: "#236048",
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
