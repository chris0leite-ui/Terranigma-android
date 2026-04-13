'use strict'

// ── Tile types ────────────────────────────────────────────────────────────────

const T = { GRASS:'GRASS', WALL:'WALL', WATER:'WATER', DOOR:'DOOR', CHEST:'CHEST' }
const PASS = { GRASS:true, WALL:false, WATER:true, DOOR:true, CHEST:true }
const PASS_ENEMY = { GRASS:true, WALL:false, WATER:false, DOOR:true, CHEST:true }

// ── Seeded RNG (mulberry32) ───────────────────────────────────────────────────

function makeRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0
  function next() {
    s += 0x6d2b79f5; s = Math.imul(s ^ s >>> 15, s | 1)
    s ^= s + Math.imul(s ^ s >>> 7, s | 61)
    return ((s ^ s >>> 14) >>> 0) / 0x100000000
  }
  return {
    nextInt(lo, hi) { return lo + Math.floor(next() * (hi - lo)) },
    nextBoolean()   { return next() < 0.5 }
  }
}

// ── Data classes ──────────────────────────────────────────────────────────────

class Enemy {
  constructor(x, y, hp = 3, dmg = 1, isBoss = false) {
    this.x = x; this.y = y
    this.hp = hp; this.dmg = dmg
    this.flash = 0; this.isBoss = isBoss
  }
}

class Room {
  constructor(w, h) {
    this.w = w; this.h = h
    this.tiles = Array.from({ length: h }, () => Array(w).fill(T.GRASS))
    this.enemies = []
    this.spawnX = 1; this.spawnY = 1
  }
}

// ── Game ──────────────────────────────────────────────────────────────────────

class Game {
  constructor(seed = Date.now()) {
    this._rng = makeRng(seed)
    this.px = 0; this.py = 0
    this.hp = 10; this.maxHp = 10
    this.attack = 1
    this.xp = 0; this.xpToNext = 3
    this.level = 1; this.floor = 1
    this.invincible = 0; this.kills = 0
    this.room = this.generateFloor(this.floor)
    this.px = this.room.spawnX; this.py = this.room.spawnY
  }

  get alive() { return this.hp > 0 }

  // ── Move ───────────────────────────────────────────────────────────────────

  move(dx, dy) {
    if (!this.alive) return
    const nx = this.px + dx; const ny = this.py + dy
    const r = this.room
    if (nx < 0 || nx >= r.w || ny < 0 || ny >= r.h) return
    if (!PASS[r.tiles[ny][nx]]) return

    const hit = r.enemies.find(e => e.x === nx && e.y === ny)
    if (hit) {
      hit.hp -= this.attack; hit.flash = 8
      if (hit.hp <= 0) {
        r.enemies.splice(r.enemies.indexOf(hit), 1)
        this._onEnemyKilled(hit, nx, ny)
      }
      return
    }

    this.px = nx; this.py = ny

    const tile = r.tiles[ny][nx]
    if (tile === T.DOOR) {
      this.floor++
      this.room = this.generateFloor(this.floor)
      this.px = this.room.spawnX; this.py = this.room.spawnY
      return
    }
    if (tile === T.CHEST) {
      this.hp = Math.min(this.hp + 3, this.maxHp)
      r.tiles[ny][nx] = T.GRASS
    }
    if (tile === T.WATER) this.hp = Math.max(this.hp - 1, 0)

    if (this.invincible > 0) { this.invincible--; return }

    for (const e of r.enemies.slice()) {
      this._moveEnemy(e)
    }
  }

  _takeDamage(dmg) {
    this.hp = Math.max(this.hp - dmg, 0)
    this.invincible = 4
  }

  _moveEnemy(e) {
    const r = this.room
    const ex = e.x + Math.sign(this.px - e.x)
    const ey = e.y + Math.sign(this.py - e.y)
    if (ex === this.px && ey === this.py) {
      this.hp = Math.max(this.hp - e.dmg, 0)
      this.invincible = 4
    } else if (PASS_ENEMY[r.tiles[ey][ex]] && !r.enemies.some(o => o !== e && o.x === ex && o.y === ey)) {
      e.x = ex; e.y = ey
    }
  }

  _onEnemyKilled(e, x, y) {
    this.kills++
    if (e.isBoss) this.room.tiles[y][x] = T.CHEST
    this.xp++
    if (this.xp >= this.xpToNext) this._levelUp()
  }

  _levelUp() {
    this.level++; this.xp = 0; this.xpToNext = this.level * 3
    this.attack++; this.maxHp += 2
    this.hp = Math.min(this.hp + 2, this.maxHp)
  }

  // ── Dungeon generation ─────────────────────────────────────────────────────

  generateFloor(f) {
    const w = 12; const h = 10
    const r = new Room(w, h)
    const rng = this._rng

    for (let x = 0; x < w; x++) { r.tiles[0][x] = T.WALL; r.tiles[h-1][x] = T.WALL }
    for (let y = 0; y < h; y++) { r.tiles[y][0] = T.WALL; r.tiles[y][w-1] = T.WALL }

    r.tiles[h-1][Math.floor(w/2)] = T.DOOR
    r.spawnX = Math.floor(w/2); r.spawnY = 2

    const nWalls = rng.nextInt(3, 7)
    for (let i = 0; i < nWalls; i++) {
      const wx = rng.nextInt(2, w-2); const wy = rng.nextInt(3, h-2)
      if (r.tiles[wy][wx] === T.GRASS) r.tiles[wy][wx] = T.WALL
    }

    if (rng.nextBoolean()) {
      const wy = rng.nextInt(4, h-3); const wx = rng.nextInt(2, w-5)
      for (let i = 0; i <= 2; i++) if (r.tiles[wy][wx+i] === T.GRASS) r.tiles[wy][wx+i] = T.WATER
    }

    const isBossFloor = f % 5 === 0
    if (!isBossFloor && rng.nextInt(0, 10) < 3) this._placeItem(r, T.CHEST)

    if (isBossFloor) {
      this._spawnEnemy(r, new Enemy(0, 0, 10 + f, 2, true))
    } else {
      const n = Math.min(f + 1, 6)
      for (let i = 0; i < n; i++) {
        const e = (f >= 5 && rng.nextInt(0, 4) === 0)
          ? new Enemy(0, 0, 6, 2)
          : new Enemy(0, 0, 3, 1)
        this._spawnEnemy(r, e)
      }
    }
    return r
  }

  _placeItem(r, t) {
    for (let i = 0; i < 25; i++) {
      const x = this._rng.nextInt(2, r.w-2); const y = this._rng.nextInt(3, r.h-2)
      if (r.tiles[y][x] === T.GRASS && !(x === r.spawnX && y === r.spawnY)) {
        r.tiles[y][x] = t; return
      }
    }
  }

  _spawnEnemy(r, e) {
    for (let i = 0; i < 30; i++) {
      const x = this._rng.nextInt(1, r.w-1); const y = this._rng.nextInt(4, r.h-2)
      if (r.tiles[y][x] === T.GRASS && !r.enemies.some(o => o.x === x && o.y === y)) {
        e.x = x; e.y = y; r.enemies.push(e); return
      }
    }
  }
}

// ── Export (Node/Jest) or global (browser) ────────────────────────────────────

if (typeof module !== 'undefined') module.exports = { T, PASS, Game, Enemy, Room }
