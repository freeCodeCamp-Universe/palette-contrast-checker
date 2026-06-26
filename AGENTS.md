The file `/palette-contrast-checker/CLAUDE.md` must be updated as the app status changes so that the infos in it are based on the current status of the app.

# Palette Contrast Checker

Browser-based accessibility tool that evaluates color palettes against WCAG 2.2 contrast standards. Static frontend-only app deployed to freeCodeCamp Universe.

## Tech Stack

- Vanilla JavaScript (ES modules), no framework, no build step
- CSS with custom properties (freeCodeCamp "Command-line Chic" design system)
- Vitest (+ jsdom) for testing
- Deployed manually to freeCodeCamp Universe via the `universe` CLI (no auto-deploy on push)

## Commands

```bash
npm install          # install dev deps (vitest + jsdom)
npm test             # run tests once
npm run test:watch   # watch mode
npx serve .          # local dev server (or just open index.html)
```

## Project Structure

- `js/lib/` — Pure logic: color math, WCAG contrast, parsing, suggestions, export formats. No DOM access, fully testable.
- `js/state/` — Redux-like store (`store.js`), reducer (`actions.js`), localStorage persistence
- `js/ui/` — One module per feature. Each exports `init<Feature>(store)`. Event listeners + state subscriptions.
- `css/` — Modular CSS with design tokens in `variables.css`
- `test/` — Mirrors `js/lib/` and `js/state/`
- `index.html` — Single entry point

## Key Patterns

- **State**: minimal pub/sub store with `getState()`, `dispatch(action)`, `subscribe(listener)`. Action types are `UPPERCASE_SNAKE_CASE`.
- **Pure logic** in `js/lib/` has zero dependencies and no DOM access — always testable in Node.
- **UI modules** get the store injected, attach event listeners in `init()`, subscribe to state changes.
- **Persistence**: localStorage key `'palette-contrast-checker'` with WIP auto-save and crash recovery.
- **No production dependencies**. Vitest is dev-only.

## Design System

freeCodeCamp "Command-line Chic": dark mode, 8px grid, semantic color tokens, Lato + Fira Mono fonts.
