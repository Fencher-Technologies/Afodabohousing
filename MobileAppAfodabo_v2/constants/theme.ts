/**
 * Axis Housing, Design Tokens
 * Single source of truth for colors, spacing, radii, typography, shadows.
 *
 * Brand palette sampled from the Axis logo:
 *   navy      #161E31 (house body / wordmark, deep variant #0D1322)
 *   red       #D92123 (roofline / "x" accent)
 *   cream     #F7F5F2 (page background)
 */

export const Colors = {
  // Brand
  primary: "#161E31",
  primaryDeep: "#0D1322",
  primarySoft: "#E9EDF4",
  primaryMuted: "#5A6478",

  // Premium (boosts, subscription): a genuine brass that stands apart from
  // the burgundy primary, so revenue features keep their own visual weight.
  gold: "#D92123",
  goldSoft: "#FBE9E9",

  // Secondary action / link colour: a brighter burgundy that still draws the
  // eye next to charcoal body text.
  accent: "#D92123",
  accentSoft: "#FBE9E9",

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
  textPrimary: "#232A31",
  textSecondary: "#5A636B",
  textMuted: "#8A9096",
  textOnPrimary: "#FFFFFF",
  textOnGold: "#FFFFFF",

  // Tab bar
  tabActive: "#161E31",
  tabInactive: "#9AA0A6",

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
  // Retired the capsule look: everything that referenced `pill` now renders
  // as a tidy rounded rectangle instead of a stadium shape.
  pill: 10,
  input: 10,
  card: 12,
  modal: 20,
  button: 10,
  sm: 8,
} as const;

export const FontSize = {
  display: 28,
  title: 22,
  // h1 sits between title and h2. It was referenced by three screens but never
  // defined, so those styles resolved to undefined and fell back to the RN
  // default size.
  h1: 20,
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
    shadowColor: "#232A31",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: "#232A31",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  fab: {
    shadowColor: "#161E31",
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
  gold: { fg: Colors.gold, bg: Colors.goldSoft },
  accent: { fg: Colors.accent, bg: Colors.accentSoft },
  muted: { fg: Colors.textSecondary, bg: Colors.surfaceAlt },
};
