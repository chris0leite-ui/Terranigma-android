# CLAUDE.md

## Workflow

- **Always red-green TDD**: write failing tests first (commit as "test: red"), then implement (commit as "feat: green")
- **Always create a PR** for each feature/fix branch
- Branch from the active development branch, not main

## Code style

- MVP first — no over-engineering, no speculative abstractions
- Minimal files: prefer editing existing files over creating new ones
- Pure Kotlin game logic (no Android imports) so it stays unit-testable with plain JUnit
- Short, dense code — no unnecessary comments or docs

## Constraints

- **Phone-only**: user has no PC. CI (GitHub Actions) builds the APK; user downloads and installs it
- Never require local gradle/Android Studio setup in instructions

## Token efficiency

- Be concise in responses
- Don't re-read files already known from context
- Don't explain what you're about to do and then do it — just do it
