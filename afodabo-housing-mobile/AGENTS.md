<!-- BEGIN:reactnative-agent-rules -->

# This is NOT the React Native you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/react-native/Libraries/` and any framework-specific docs (e.g. Expo SDK docs in `node_modules/expo/`) before writing any code. Heed deprecation notices.

<!-- END:reactnative-agent-rules -->

## Application Building Context

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features and scope.
2. `context/architecture.md` — system structure, boundaries, storage model and invariants.
3. `context/ui-context.md` — theme, colors, typography, screen/component design and conventions.
4. `context/code-standards.md` — implementation rules and conventions.
5. `context/ai-workflow-rules.md` — development workflow, scoping rules and delivery approach.
6. `context/progress-tracker.md` — current phase, completed work, open questions and next steps.

Update `context/progress-tracker.md` after each meaningful implementation change.

If an implementation change affects the architecture, scope, or standards documented in context files, update the relevant file before continuing.
