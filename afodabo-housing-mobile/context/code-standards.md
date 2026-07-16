# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes, do not layer workarounds.
- Do not mix unrelated concerns in one component or hook.
- Respect the system boundaries defined in `architecture.md`.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any` — use explicit interfaces or narrowly scoped types.
- Validate unknown external input at system boundaries before trusting it.
- Use `interface` for object contracts.

## React Native & Expo

- Use functional components and hooks exclusively.
- Optimize performance: Use `useMemo`, `useCallback`, and `React.memo` where appropriate to prevent unnecessary re-renders.
- Use `StyleSheet.create` for styling to ensure styles are sent across the bridge only once.
- Prefer `FlatList` or `SectionList` over `ScrollView` for long lists of data.
- Ensure proper use of `SafeAreaView` for consistent layout across devices with notches.

## Styling

- Use the design tokens defined in `ui-context.md`.
- No hardcoded hex values in component styles; always reference the theme tokens.
- Maintain the border radius scale: `rounded-xl` for small elements, `rounded-2xl` for cards, `rounded-3xl` for modals.
- Follow the spacing scale for margins and padding to ensure visual consistency.

## API & Data

- All API calls must go through the `src/services` layer.
- Use React Query for data fetching, caching, and synchronization.
- Handle loading and error states gracefully in all UI components.
- Validate API responses before passing them to the UI.

## File Organization

- `src/navigation/` — Navigation configuration and role-based stacks.
- `src/screens/` — Top-level screen components.
- `src/components/` — Reusable UI components.
- `src/services/` — API clients and external service integrations.
- `src/hooks/` — Custom hooks for shared logic.
- `src/context/` — Global state providers (Auth, Theme).
- `src/utils/` — Utility functions and constants.
- Name files after the responsibility they contain, using `kebab-case`.

