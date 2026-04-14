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

## Project map (`game/game.js`)

| Line | What |
|------|------|
| 5 | `T` tile types, `PASS`, `PASS_ENEMY` |
| 11 | `makeRng(seed)` — mulberry32 RNG |
| 26 | `Enemy` class |
| 36 | `Room` class |
| 48 | `Game` constructor — player state |
| 69 | `move(dx,dy)` — movement + tile effects |
| 108 | `spin()` — AoE attack, cooldown 5 |
| 118 | `attackDir(dx,dy)` |
| 125 | `throw(dx,dy)` — ranged, level≥3 |
| 138 | `_hitEnemy` — damage, status, knockback |
| 160 | `_doAttack` — weapon branching (sword/spear/axe) |
| 182 | `_takeDamage` |
| 188 | `_moveEnemy` — status tick, type dispatch |
| 204 | `_chasePlayer` |
| 215 | `_moveBlocker` |
| 220 | `_moveWanderer` |
| 231 | `_moveArcher` |
| 245 | `_onEnemyKilled` — xp, combo, boss chest |
| 255 | `_levelUp` |
| 263 | `generateFloor(f)` — 12×10, walls/water/enemies |
| 306 | `_placeItem` |
| 315 | `_spawnEnemy` |

## Token efficiency

- Responses: max 2 lines. No explanation, no narration. Confirm with filename:line only.
- Never re-read files already in context this session
- Don't explain what you're about to do — just do it
- No preamble, no summary, no sign-off
- Use subagents for any search/exploration task; report file:line only
- `/compact` mid-session when context grows large
