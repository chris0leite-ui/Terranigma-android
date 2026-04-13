'use strict'
const { T, Game, Enemy } = require('./game')

// ── Foundational ─────────────────────────────────────────────────────────────

test('player starts at spawn', () => {
  const g = new Game()
  expect(g.px).toBe(g.room.spawnX)
  expect(g.py).toBe(g.room.spawnY)
})

test('wall blocks movement', () => {
  const g = new Game()
  g.px = 1; g.py = 1
  g.move(-1, 0)
  expect(g.px).toBe(1)
})

test('player moves on passable tile', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.px = g.room.spawnX - 1; g.py = g.room.spawnY
  const startX = g.px
  g.move(1, 0)
  expect(g.px).toBe(startX + 1)
})

test('water is passable', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.px = 5; g.py = 4
  g.room.tiles[4][6] = T.WATER
  g.move(1, 0)
  expect(g.px).toBe(6)
})

test('water deals 1 damage when stepped on', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.px = 5; g.py = 4
  g.room.tiles[4][6] = T.WATER
  const before = g.hp
  g.move(1, 0)
  expect(g.hp).toBe(before - 1)
})

test('attacking enemy reduces its hp', () => {
  const g = new Game()
  const e = new Enemy(6, 5)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.hp).toBe(2)
})

test('enemy removed when hp reaches zero', () => {
  const g = new Game()
  const e = new Enemy(6, 5, 1)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(g.room.enemies.length).toBe(0)
})

test('player takes damage when enemy intercepts', () => {
  const g = new Game()
  g.room.enemies.length = 0; g.room.enemies.push(new Enemy(5, 3))
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  const before = g.hp
  g.move(1, 0)
  expect(g.hp).toBe(before - 1)
})

test('hp never goes below zero', () => {
  const g = new Game()
  g.room.enemies.length = 0; g.room.enemies.push(new Enemy(5, 3))
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  for (let i = 0; i < 20; i++) { g.invincible = 0; g.move(1, 0); g.px = 3 }
  expect(g.hp).toBeGreaterThanOrEqual(0)
})

test('alive is false at zero hp', () => {
  const g = new Game(); g.hp = 0
  expect(g.alive).toBe(false)
})

test('alive is true above zero hp', () => {
  expect(new Game().alive).toBe(true)
})

test('invincibility frames block damage', () => {
  const g = new Game()
  g.room.enemies.length = 0; g.room.enemies.push(new Enemy(5, 3))
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  g.move(1, 0)
  const hpAfter = g.hp; g.px = 3
  g.move(1, 0)
  expect(g.hp).toBe(hpAfter)
})

// ── Round 1: Procedural dungeon + floor counter ───────────────────────────────

test('floor starts at 1', () => {
  expect(new Game().floor).toBe(1)
})

test('entering door increments floor', () => {
  const g = new Game()
  g.px = Math.floor(g.room.w / 2); g.py = g.room.h - 2
  g.room.enemies.length = 0
  g.move(0, 1)
  expect(g.floor).toBe(2)
})

test('every floor has border walls', () => {
  const g = new Game(); const r = g.room
  for (let x = 0; x < r.w; x++) expect(r.tiles[0][x]).toBe(T.WALL)
  for (let y = 0; y < r.h; y++) {
    expect(r.tiles[y][0]).toBe(T.WALL)
    expect(r.tiles[y][r.w - 1]).toBe(T.WALL)
  }
  for (let x = 0; x < r.w; x++)
    if (r.tiles[r.h - 1][x] !== T.DOOR) expect(r.tiles[r.h - 1][x]).toBe(T.WALL)
})

test('every floor has a door', () => {
  const g = new Game(); const r = g.room
  let found = false
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++)
    if (r.tiles[y][x] === T.DOOR) found = true
  expect(found).toBe(true)
})

test('deeper floors spawn more enemies', () => {
  const g = new Game(42)
  const r1 = g.generateFloor(1)
  const r4 = g.generateFloor(4)
  expect(r4.enemies.length).toBeGreaterThan(r1.enemies.length)
})

// ── Round 2: Level up + chest ─────────────────────────────────────────────────

test('killing enemy grants xp', () => {
  const g = new Game()
  const e = new Enemy(6, g.py, 1)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5
  const before = g.xp
  g.move(1, 0)
  expect(g.xp).toBe(before + 1)
})

test('level up increases attack and maxHp', () => {
  const g = new Game()
  g.xp = g.xpToNext - 1
  const e = new Enemy(6, g.py, 1)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5
  const prevAtk = g.attack; const prevMax = g.maxHp
  g.move(1, 0)
  expect(g.attack).toBe(prevAtk + 1)
  expect(g.maxHp).toBe(prevMax + 2)
})

test('chest heals player', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.hp = 5; g.px = 5; g.py = 3
  g.room.tiles[3][6] = T.CHEST
  g.move(1, 0)
  expect(g.hp).toBeGreaterThan(5)
})

test('chest becomes grass after use', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.px = 5; g.py = 3
  g.room.tiles[3][6] = T.CHEST
  g.move(1, 0)
  expect(g.room.tiles[3][6]).toBe(T.GRASS)
})

test('chest does not overheal', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.hp = g.maxHp; g.px = 5; g.py = 3
  g.room.tiles[3][6] = T.CHEST
  g.move(1, 0)
  expect(g.hp).toBe(g.maxHp)
})

// ── Round 3: Boss + enemy variety ─────────────────────────────────────────────

test('brute deals 2 damage', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.enemies.push(new Enemy(5, 3, 6, 2))
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  const before = g.hp
  g.move(1, 0)
  expect(g.hp).toBe(before - 2)
})

test('boss spawns on floor 5', () => {
  const g = new Game(42)
  const r5 = g.generateFloor(5)
  expect(r5.enemies.some(e => e.isBoss)).toBe(true)
})

test('boss drops chest on death', () => {
  const g = new Game()
  const boss = new Enemy(6, 4, 1, 2, true)
  g.room.enemies.length = 0; g.room.enemies.push(boss)
  g.room.tiles[4][6] = T.GRASS
  g.px = 5; g.py = 4
  g.move(1, 0)
  expect(g.room.tiles[4][6]).toBe(T.CHEST)
})

test('player attack scales with level', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(6, g.py, 5)
  g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5; g.attack = 2
  g.move(1, 0)
  expect(e.hp).toBe(3)
})
