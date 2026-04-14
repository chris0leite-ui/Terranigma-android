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
  g.room.enemies.length = 0; g.hasKey = true
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

test('boss drops heart container on death', () => {
  const g = new Game()
  const boss = new Enemy(6, 4, 1, 2, true)
  g.room.enemies.length = 0; g.room.enemies.push(boss)
  g.room.tiles[4][6] = T.GRASS
  g.px = 5; g.py = 4
  g.move(1, 0)
  expect(g.room.tiles[4][6]).toBe(T.HEART_CONTAINER)
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

// ── Round 4: Enemy varieties ───────────────────────────────────────────────────

test('blocker does not move when player is far', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const b = new Enemy(8, 5, 3, 1, false, 'blocker')
  g.room.enemies.push(b)
  for (let x = 1; x < 11; x++) g.room.tiles[5][x] = T.GRASS
  g.px = 2; g.py = 5
  g.move(1, 0)
  expect(b.x).toBe(8)
  expect(b.y).toBe(5)
})

test('blocker attacks when player moves adjacent', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const b = new Enemy(5, 3, 3, 1, false, 'blocker')
  g.room.enemies.push(b)
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  const before = g.hp
  g.move(1, 0)
  expect(g.hp).toBe(before - 1)
})

test('wanderer moves randomly and does not always chase', () => {
  const g = new Game(1)
  g.room.enemies.length = 0
  const w = new Enemy(8, 8, 3, 1, false, 'wanderer')
  g.room.enemies.push(w)
  g.px = 1; g.py = 1
  const startX = w.x; const startY = w.y
  g.move(1, 0)
  // wanderer at distance > 3 should not land exactly on player
  expect(w.x === g.px && w.y === g.py).toBe(false)
})

test('archer stays at range and attacks player if within 3 tiles', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const a = new Enemy(5, 3, 3, 1, false, 'archer')
  g.room.enemies.push(a)
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  const before = g.hp
  g.move(1, 0)
  expect(g.hp).toBe(before - 1)
})

test('archer does not attack when out of range', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const a = new Enemy(10, 8, 3, 1, false, 'archer')
  g.room.enemies.push(a)
  g.px = 1; g.py = 1
  const before = g.hp
  g.move(1, 0)
  expect(g.hp).toBe(before)
})

test('archer backs away when player is adjacent', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const a = new Enemy(5, 4, 3, 1, false, 'archer')
  g.room.enemies.push(a)
  for (let y = 2; y < 8; y++) for (let x = 3; x < 9; x++) g.room.tiles[y][x] = T.GRASS
  g.px = 4; g.py = 3
  // player moves to (5,3) — no enemy there; archer at (5,4) is dist=1 from player → backs to (5,5)
  g.move(1, 0)
  expect(a.y).toBeGreaterThan(4)
})

// ── Round 5: Status effects ────────────────────────────────────────────────────

test('poisoned enemy takes 1 damage per turn', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(8, 5)
  e.status = 'poisoned'; e.statusTurns = 3
  g.room.enemies.push(e)
  g.px = 1; g.py = 1
  g.move(1, 0)
  expect(e.hp).toBe(2)
})

test('poison ticks down statusTurns', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(8, 5)
  e.status = 'poisoned'; e.statusTurns = 3
  g.room.enemies.push(e)
  g.px = 1; g.py = 1
  g.move(1, 0)
  expect(e.statusTurns).toBe(2)
})

test('stunned enemy does not move', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(8, 5)
  e.status = 'stunned'; e.statusTurns = 2
  g.room.enemies.push(e)
  for (let x = 1; x < 11; x++) g.room.tiles[5][x] = T.GRASS
  g.px = 1; g.py = 5
  g.move(1, 0)
  expect(e.x).toBe(8)
})

test('frozen enemy does not move', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(8, 5)
  e.status = 'frozen'; e.statusTurns = 2
  g.room.enemies.push(e)
  for (let x = 1; x < 11; x++) g.room.tiles[5][x] = T.GRASS
  g.px = 1; g.py = 5
  g.move(1, 0)
  expect(e.x).toBe(8)
})

test('status clears when statusTurns reaches 0', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(8, 5)
  e.status = 'stunned'; e.statusTurns = 1
  g.room.enemies.push(e)
  g.px = 1; g.py = 1
  g.move(1, 0)
  expect(e.status).toBeNull()
})

// ── Round 6: Weapon types ──────────────────────────────────────────────────────

test('spear hits 2 tiles ahead', () => {
  const g = new Game()
  g.weapon = 'spear'
  g.room.enemies.length = 0
  const near = new Enemy(6, 5, 3, 1); const far = new Enemy(7, 5, 3, 1)
  g.room.enemies.push(near, far)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[5][7] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(near.hp).toBe(2)
  expect(far.hp).toBe(2)
})

test('spear applies frozen to hit enemy', () => {
  const g = new Game()
  g.weapon = 'spear'
  g.room.enemies.length = 0
  const e = new Enemy(6, 5, 3, 1)
  g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.status).toBe('frozen')
})

test('axe hits adjacent perpendicular tiles', () => {
  const g = new Game()
  g.weapon = 'axe'
  g.room.enemies.length = 0
  const target = new Enemy(6, 5, 3, 1)
  const above  = new Enemy(6, 4, 3, 1)
  const below  = new Enemy(6, 6, 3, 1)
  g.room.enemies.push(target, above, below)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[4][6] = T.GRASS; g.room.tiles[6][6] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(target.hp).toBeLessThan(3)
  expect(above.hp).toBeLessThan(3)
  expect(below.hp).toBeLessThan(3)
})

test('axe applies stunned to hit enemy', () => {
  const g = new Game()
  g.weapon = 'axe'
  g.room.enemies.length = 0
  const e = new Enemy(6, 5, 3, 1)
  g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.status).toBe('stunned')
})

test('game starts with sword weapon', () => {
  const g = new Game()
  expect(g.weapon).toBe('sword')
})

// ── Round 7: Ranged throw ──────────────────────────────────────────────────────

test('throw damages first enemy in line', () => {
  const g = new Game()
  g.level = 3; g.throwReady = true
  g.room.enemies.length = 0
  const e1 = new Enemy(8, 5, 3, 1); const e2 = new Enemy(9, 5, 3, 1)
  g.room.enemies.push(e1, e2)
  for (let x = 1; x < 11; x++) g.room.tiles[5][x] = T.GRASS
  g.px = 5; g.py = 5
  g.throw(1, 0)
  expect(e1.hp).toBe(2)
  expect(e2.hp).toBe(3)
})

test('throw applies poison to hit enemy', () => {
  const g = new Game()
  g.level = 3; g.throwReady = true
  g.room.enemies.length = 0
  const e = new Enemy(8, 5, 3, 1)
  g.room.enemies.push(e)
  for (let x = 1; x < 11; x++) g.room.tiles[5][x] = T.GRASS
  g.px = 5; g.py = 5
  g.throw(1, 0)
  expect(e.status).toBe('poisoned')
})

test('throw requires level 3', () => {
  const g = new Game()
  g.level = 2; g.throwReady = true
  g.room.enemies.length = 0
  const e = new Enemy(8, 5, 3, 1)
  g.room.enemies.push(e)
  g.px = 5; g.py = 5
  g.throw(1, 0)
  expect(e.hp).toBe(3)
})

test('throw sets throwReady false', () => {
  const g = new Game()
  g.level = 3; g.throwReady = true
  g.room.enemies.length = 0
  g.px = 5; g.py = 5
  g.throw(1, 0)
  expect(g.throwReady).toBe(false)
})

test('throwReady recharges after move', () => {
  const g = new Game()
  g.level = 3; g.throwReady = false
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(g.throwReady).toBe(true)
})

// ── Round 8: Combo streak ─────────────────────────────────────────────────────

test('combo starts at 0', () => {
  expect(new Game().combo).toBe(0)
})

test('killing enemy increments combo', () => {
  const g = new Game()
  const e = new Enemy(6, g.py, 1)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5
  g.move(1, 0)
  expect(g.combo).toBe(1)
})

test('combo keeps incrementing on consecutive kills', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.enemies.push(new Enemy(6, 5, 1), new Enemy(6, 4, 1))
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[4][6] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  g.py = 4
  g.move(1, 0)
  expect(g.combo).toBe(2)
})

test('combo resets on taking damage', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.enemies.push(new Enemy(5, 3))
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  g.combo = 5
  g.move(1, 0)
  expect(g.combo).toBe(0)
})

// ── Round 9: Spin attack ───────────────────────────────────────────────────────

test('spin hits all 8 adjacent enemies', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const dirs = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]
  const enemies = dirs.map(([ddx,ddy]) => {
    const e = new Enemy(5+ddx, 5+ddy, 3, 1)
    g.room.tiles[5+ddy][5+ddx] = T.GRASS
    g.room.enemies.push(e)
    return e
  })
  g.px = 5; g.py = 5
  g.spin()
  expect(enemies.every(e => e.hp < 3)).toBe(true)
})

test('spin does not hit enemies 2+ tiles away', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const far = new Enemy(8, 5, 3, 1)
  g.room.enemies.push(far)
  for (let x = 1; x < 11; x++) g.room.tiles[5][x] = T.GRASS
  g.px = 5; g.py = 5
  g.spin()
  expect(far.hp).toBe(3)
})

test('spin has cooldown after use', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.px = 5; g.py = 5
  g.spin()
  expect(g.spinCooldown).toBeGreaterThan(0)
})

test('spin blocked during cooldown', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(6, 5, 3, 1)
  g.room.tiles[5][6] = T.GRASS
  g.room.enemies.push(e)
  g.px = 5; g.py = 5
  g.spin()
  const hpAfterFirst = e.hp
  g.spin()
  expect(e.hp).toBe(hpAfterFirst)
})

test('spinCooldown decrements on move', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.spin()
  const before = g.spinCooldown
  g.move(1, 0)
  expect(g.spinCooldown).toBe(before - 1)
})

// ── Round 10: Soul liberation ─────────────────────────────────────────────────

test('soulsFreed starts at 0', () => {
  expect(new Game().soulsFreed).toBe(0)
})

test('soulsFreed increments on each kill', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(6, g.py, 1)
  g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5
  g.move(1, 0)
  expect(g.soulsFreed).toBe(1)
})

test('room.cleared set true when last enemy killed', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(6, g.py, 1)
  g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5
  g.move(1, 0)
  expect(g.room.cleared).toBe(true)
})

test('room.cleared false while enemies remain', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.enemies.push(new Enemy(6, g.py, 1), new Enemy(7, g.py, 3))
  g.room.tiles[g.py][6] = T.GRASS; g.room.tiles[g.py][7] = T.GRASS
  g.px = 5
  g.move(1, 0)
  expect(g.room.cleared).toBe(false)
})

// ── Round 11: Knockback ───────────────────────────────────────────────────────

test('melee hit knocks enemy back 1 tile in attack direction', () => {
  const g = new Game()
  const e = new Enemy(6, 5, 10)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[5][7] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.x).toBe(7)
})

test('knockback stops at wall', () => {
  const g = new Game()
  const e = new Enemy(6, 5, 10)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[5][7] = T.WALL
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.x).toBe(6)
})

test('knockback stops when another enemy is in the way', () => {
  const g = new Game()
  const e1 = new Enemy(6, 5, 10); const e2 = new Enemy(7, 5, 10)
  g.room.enemies.length = 0; g.room.enemies.push(e1, e2)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[5][7] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e1.x).toBe(6)
})

// ── Round 12: Combo multiplier ────────────────────────────────────────────────

test('combo below 3 gives no bonus damage', () => {
  const g = new Game()
  g.combo = 2
  const e = new Enemy(6, 5, 10)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[5][7] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.hp).toBe(10 - g.attack)
})

test('combo 3+ adds +1 to damage', () => {
  const g = new Game()
  g.combo = 3
  const e = new Enemy(6, 5, 10)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[5][7] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.hp).toBe(10 - g.attack - 1)
})

test('combo 6+ adds +2 to damage', () => {
  const g = new Game()
  g.combo = 6
  const e = new Enemy(6, 5, 10)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS; g.room.tiles[5][7] = T.GRASS
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(e.hp).toBe(10 - g.attack - 2)
})

// ── Round 13: Dedicated attack (A button) ─────────────────────────────────────

test('attackDir damages enemy in facing direction without moving player', () => {
  const g = new Game()
  const e = new Enemy(6, 5, 3)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.attackDir(1, 0)
  expect(e.hp).toBe(2)
  expect(g.px).toBe(5)
})

test('attackDir does not move player when no enemy present', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.attackDir(1, 0)
  expect(g.px).toBe(5)
  expect(g.py).toBe(5)
})

// ── Round 14: Damage events ───────────────────────────────────────────────────

test('events array exists and starts empty', () => {
  expect(new Game().events).toEqual([])
})

test('_takeDamage pushes player dmg event', () => {
  const g = new Game()
  g.room.enemies.length = 0; g.room.enemies.push(new Enemy(5, 3))
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  g.move(1, 0)
  expect(g.events.some(ev => ev.type === 'dmg' && ev.who === 'player')).toBe(true)
})

test('_hitEnemy pushes enemy dmg event', () => {
  const g = new Game()
  const e = new Enemy(6, 5, 3)
  g.room.enemies.length = 0; g.room.enemies.push(e)
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.attackDir(1, 0)
  expect(g.events.some(ev => ev.type === 'dmg' && ev.who === 'enemy')).toBe(true)
})

// ── Round 15: Extended invincibility ─────────────────────────────────────────

test('invincibility lasts 6 frames after damage', () => {
  const g = new Game()
  g.room.enemies.length = 0; g.room.enemies.push(new Enemy(5, 3))
  g.room.tiles[3][4] = T.GRASS
  g.px = 3; g.py = 3
  g.move(1, 0)
  expect(g.invincible).toBe(6)
})

// ── Round 16: Room clear heal ─────────────────────────────────────────────────

test('clearing room heals 2 HP', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(6, g.py, 1)
  g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5; g.hp = 5
  g.move(1, 0)
  expect(g.hp).toBe(7)
})

test('room clear heal does not overheal', () => {
  const g = new Game()
  g.room.enemies.length = 0
  const e = new Enemy(6, g.py, 1)
  g.room.enemies.push(e)
  g.room.tiles[g.py][6] = T.GRASS
  g.px = 5; g.hp = g.maxHp
  g.move(1, 0)
  expect(g.hp).toBe(g.maxHp)
})

// ── Round 17: Tall grass ──────────────────────────────────────────────────────

test('GRASS_TALL is passable', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.GRASS_TALL
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(g.px).toBe(6)
})

test('attackDir on GRASS_TALL converts it to GRASS', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.GRASS_TALL
  g.px = 5; g.py = 5
  g.attackDir(1, 0)
  expect(g.room.tiles[5][6]).toBe(T.GRASS)
})

// ── Round 18: Heart container ─────────────────────────────────────────────────

test('HEART_CONTAINER increases maxHp by 4', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.HEART_CONTAINER
  g.px = 5; g.py = 5
  const prevMax = g.maxHp
  g.move(1, 0)
  expect(g.maxHp).toBe(prevMax + 4)
})

test('HEART_CONTAINER heals and becomes GRASS', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.hp = 5
  g.room.tiles[5][6] = T.HEART_CONTAINER
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(g.hp).toBeGreaterThan(5)
  expect(g.room.tiles[5][6]).toBe(T.GRASS)
})

// ── Round 19: Key + locked door ───────────────────────────────────────────────

test('KEY tile is passable', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.KEY
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(g.px).toBe(6)
})

test('stepping on KEY sets hasKey and converts to GRASS', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.KEY
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(g.hasKey).toBe(true)
  expect(g.room.tiles[5][6]).toBe(T.GRASS)
})

test('door without key does not advance floor', () => {
  const g = new Game()
  g.px = Math.floor(g.room.w / 2); g.py = g.room.h - 2
  g.room.enemies.length = 0; g.hasKey = false
  g.move(0, 1)
  expect(g.floor).toBe(1)
})

test('door with key advances floor and resets hasKey', () => {
  const g = new Game()
  g.px = Math.floor(g.room.w / 2); g.py = g.room.h - 2
  g.room.enemies.length = 0; g.hasKey = true
  g.move(0, 1)
  expect(g.floor).toBe(2)
  expect(g.hasKey).toBe(false)
})

test('each generated floor has a key', () => {
  const g = new Game()
  const r = g.generateFloor(1)
  let found = false
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++)
    if (r.tiles[y][x] === T.KEY) found = true
  expect(found).toBe(true)
})

// ── Round 20: Weapon pickups ──────────────────────────────────────────────────

test('WEAPON_SPEAR tile is passable', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.WEAPON_SPEAR
  g.px = 5; g.py = 5
  g.move(1, 0)
  expect(g.px).toBe(6)
})

test('stepping on WEAPON_SPEAR sets pendingWeapon', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.WEAPON_SPEAR
  g.px = 5; g.py = 5; g.weapon = 'sword'
  g.move(1, 0)
  expect(g.pendingWeapon).toBe('spear')
})

test('move blocked while pendingWeapon set', () => {
  const g = new Game()
  g.room.enemies.length = 0
  g.room.tiles[5][6] = T.GRASS
  g.px = 5; g.py = 5
  g.pendingWeapon = 'spear'
  g.move(1, 0)
  expect(g.px).toBe(5)
})

test('equipWeapon sets weapon and clears pendingWeapon', () => {
  const g = new Game()
  g.pendingWeapon = 'spear'; g.weapon = 'sword'
  g.equipWeapon()
  expect(g.weapon).toBe('spear')
  expect(g.pendingWeapon).toBeNull()
})

test('skipWeapon clears pendingWeapon without changing weapon', () => {
  const g = new Game()
  g.pendingWeapon = 'spear'; g.weapon = 'sword'
  g.skipWeapon()
  expect(g.weapon).toBe('sword')
  expect(g.pendingWeapon).toBeNull()
})

test('weapon does not auto-upgrade on floor transition', () => {
  const g = new Game()
  g.floor = 2; g.weapon = 'sword'
  g.px = Math.floor(g.room.w / 2); g.py = g.room.h - 2
  g.room.enemies.length = 0; g.hasKey = true
  g.move(0, 1)
  expect(g.weapon).toBe('sword')
})
