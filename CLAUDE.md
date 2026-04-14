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

- Responses: max 2 lines. No explanation, no narration. Confirm with filename:line only.
- Never re-read files already in context this session
- Don't explain what you're about to do — just do it
- No preamble, no summary, no sign-off
- Use subagents for any search/exploration task; report file:line only
- `/compact` mid-session when context grows large
