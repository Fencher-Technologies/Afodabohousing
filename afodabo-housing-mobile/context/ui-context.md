# UI Context

## Theme

Organic modern with the same visual identity as the web app. The interface should feel warm, polished, and trustworthy, using earthy Ugandan-inspired tones, serif-led headings, rounded surfaces, and subtle depth.

The mobile app should feel like Afodabo Housing immediately, even though layouts and navigation are adapted for native use.

## Colors

All components must use tokens from the shared theme module. No screen should hardcode hex values directly.

These values should match the web app palette closely.

| Role | Token | Value |
| --- | --- | --- |
| App background | `background` | `#FBF7F1` |
| Primary surface | `surface` | `#FFFFFF` |
| Secondary surface | `surfaceMuted` | `#F4EDE1` |
| Primary brand | `primary` | `#236048` |
| Primary foreground | `primaryForeground` | `#FBF7F1` |
| Accent | `accent` | `#DA6931` |
| Accent foreground | `accentForeground` | `#FFFFFF` |
| Gold | `gold` | `#F3B818` |
| Text strong | `textPrimary` | `#2C241E` |
| Text regular | `textSecondary` | `#675C53` |
| Text muted | `textMuted` | `#8A7E75` |
| Border | `border` | `#E6D9C8` |
| Success | `success` | `#2D6A4F` |
| Warning | `warning` | `#C98810` |
| Error | `error` | `#B2433F` |
| Sidebar / manager shell | `sidebar` | `#1F4B39` |

## Typography

- Display headings should echo the web app's Playfair-style look.
- Body copy should be clean, compact, and highly readable.
- If custom web fonts are not loaded on native, use platform-safe serif and sans-serif fallbacks that preserve the same feeling.

Suggested scale:

- Hero / screen titles: 28 to 34, semibold or bold
- Section titles: 20 to 24, semibold
- Card titles: 16 to 18, semibold
- Body: 14 to 16
- Supporting labels and metadata: 12 to 13

## Shape and Elevation

- Inputs and pills: 12 radius
- Cards: 20 radius
- Sheets and modal surfaces: 24 to 28 radius
- Buttons should feel substantial, not flat
- Shadows should be soft and warm, never harsh blue-gray material defaults

## Mobile Layout Patterns

- Start on an explore feed, not a marketing home page.
- Use large content cards for listings and dashboard summaries.
- Use stacked sections with generous spacing rather than dense desktop-style grids.
- Filters should open in a mobile-friendly sheet or stacked control block.
- Primary actions should stay obvious and reachable with one thumb.
- Role dashboards should use tabs plus stack pushes, not sidebars copied from the web layout.

## Brand Translation Rules

- Preserve the web app's gradients, earthy tones, and serif emphasis.
- Keep the same wording and business context where it supports continuity.
- Simplify chrome and reduce visual noise on small screens.
- Avoid generic mobile SaaS styling that loses the Afodabo character.

## Icons

- Prefer Expo-supported icon sets with a consistent stroke feel.
- Use icon color semantically through theme tokens, not arbitrary colors.

## Required Screen States

Every backend-driven screen should have:

- a loading state
- an empty state
- an error state
- a success/content state

