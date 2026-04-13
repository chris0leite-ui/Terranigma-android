# CLAUDE.md

## Workflow

- **Always red-green TDD**: write failing tests first (commit as "test: red"), then implement (commit as "feat: green")
- **Always create a PR** for each feature/fix branch
- Branch from the active development branch, not main

## Code style

- MVP first — no over-engineering, no speculative abstractions
- Minimal files: prefer editing existing files over creating new ones
- Game logic in `game/game.js` (pure JS, no DOM) — unit-testable with Jest
- Rendering + input in `game/index.html` (HTML5 Canvas)
- Short, dense code — no unnecessary comments or docs

## Constraints

- **Phone-only**: user has no PC. GitHub Pages serves the game; user opens URL in browser
- CI runs `npm test` (Jest) — no Android SDK, no Gradle, no APK
- Never require local Android/Gradle setup

## Token efficiency

- Be concise in responses
- Don't re-read files already known from context
- Don't explain what you're about to do and then do it — just do it
