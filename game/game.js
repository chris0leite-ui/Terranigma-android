'use strict'

// ── Tile types ────────────────────────────────────────────────────────────────

const T = {
  GRASS:'GRASS', WALL:'WALL', WATER:'WATER', DOOR:'DOOR', CHEST:'CHEST',
  KEY:'KEY', HEART_CONTAINER:'HEART_CONTAINER', GRASS_TALL:'GRASS_TALL',
  WEAPON_SPEAR:'WEAPON_SPEAR', WEAPON_AXE:'WEAPON_AXE',
  MYSTERY_CHEST:'MYSTERY_CHEST', SWITCH:'SWITCH'
}
const PASS = {
  GRASS:true, WALL:false, WATER:true, DOOR:true, CHEST:true,
  KEY:true, HEART_CONTAINER:true, GRASS_TALL:true, WEAPON_SPEAR:true, WEAPON_AXE:true,
  MYSTERY_CHEST:true, SWITCH:true
}
const PASS_ENEMY = {
  GRASS:true, WALL:false, WATER:false, DOOR:true, CHEST:true,
  KEY:false, HEART_CONTAINER:false, GRASS_TALL:true, WEAPON_SPEAR:false, WEAPON_AXE:false,
  MYSTERY_CHEST:false, SWITCH:false
}

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
  constructor(x, y, hp = 3, dmg = 1, isBoss = false, type = 'grunt') {
    this.x = x; this.y = y
    this.hp = hp; this.dmg = dmg
    this.flash = 0; this.isBoss = isBoss
    this.type = type
    this.status = null; this.statusTurns = 0
    this.turnsAlive = 0
  }
}

class Room {
  constructor(w, h) {
    this.w = w; this.h = h
    this.tiles = Array.from({ length: h }, () => Array(w).fill(T.GRASS))
    this.enemies = []
    this.spawnX = 1; this.spawnY = 1
    this.cleared = false
    this.switchWalls = []; this.switchOn = false
  }
}

// ── Game ──────────────────────────────────────────────────────────────────────

class Game {
  constructor(seed = Date.now(), perks = {}) {
    this._rng = makeRng(seed)
    this._perks = perks
    this.px = 0; this.py = 0
    this.hp = 15; this.maxHp = 15
    this.attack = 1
    this.xp = 0; this.xpToNext = 3
    this.level = 1; this.floor = 1
    this.invincible = 0; this.kills = 0
    this.weapon = 'sword'
    this.throwReady = true
    this.combo = 0; this.comboFlash = 0; this.comboBoost = 0
    this.spinCooldown = 0; this.soulsFreed = 0
    this.events = []
    this.hasKey = false
    this.pendingWeapon = null; this.pendingWeaponCursed = false
    this.weaponCursed = false
    this.cursed = 0; this.gold = 0
    if (perks.bonusHp) { this.maxHp += 4; this.hp = this.maxHp }
    if (perks.startLevel2) {
      this.level = 2; this.attack = 2; this.xpToNext = 6
      this.maxHp += 2; this.hp = Math.min(this.hp + 2, this.maxHp)
    }
    this.room = this.generateFloor(this.floor)
    this.px = this.room.spawnX; this.py = this.room.spawnY
  }

  get alive() { return this.hp > 0 }

  // ── Move ───────────────────────────────────────────────────────────────────

  move(dx, dy) {
    if (!this.alive || this.pendingWeapon !== null) return
    const nx = this.px + dx; const ny = this.py + dy
    const r = this.room
    if (nx < 0 || nx >= r.w || ny < 0 || ny >= r.h) return
    if (!PASS[r.tiles[ny][nx]]) return

    if (r.tiles[ny][nx] === T.DOOR && !this.hasKey) {
      this.events.push({ type: 'locked' })
      return
    }
    if (r.tiles[ny][nx] === T.DOOR && this.hasKey && r.enemies.length > 0) {
      this.gold += r.enemies.length
    }

    if (r.enemies.some(e => e.x === nx && e.y === ny)) {
      this._doAttack(nx, ny, dx, dy)
      return
    }

    this.px = nx; this.py = ny

    const tile = r.tiles[ny][nx]
    if (tile === T.DOOR) {
      this.hasKey = false
      this.floor++
      this.room = this.generateFloor(this.floor)
      this.px = this.room.spawnX; this.py = this.room.spawnY
      return
    }
    if (tile === T.CHEST) {
      this.hp = Math.min(this.hp + 3, this.maxHp)
      r.tiles[ny][nx] = T.GRASS
    }
    if (tile === T.MYSTERY_CHEST) {
      const roll = this._rng.nextInt(0, 3)
      if (roll === 0) { this.hp = Math.min(this.hp + 3, this.maxHp) }
      else if (roll === 1) { this.xp += 3; if (this.xp >= this.xpToNext) this._levelUp() }
      else { this.cursed = 5 }
      r.tiles[ny][nx] = T.GRASS
    }
    if (tile === T.SWITCH) this._toggleSwitch()
    if (tile === T.WATER) this.hp = Math.max(this.hp - 1, 0)
    if (tile === T.KEY) {
      this.hasKey = true
      r.tiles[ny][nx] = T.GRASS
    }
    if (tile === T.HEART_CONTAINER) {
      this.maxHp += 4; this.hp = Math.min(this.hp + 4, this.maxHp)
      r.tiles[ny][nx] = T.GRASS
    }
    if (tile === T.WEAPON_SPEAR || tile === T.WEAPON_AXE) {
      const w = tile === T.WEAPON_SPEAR ? 'spear' : 'axe'
      r.tiles[ny][nx] = T.GRASS
      const rank = { sword: 1, spear: 2, axe: 3 }
      if (rank[w] > rank[this.weapon]) {
        this.pendingWeapon = w
        const designated = { spear: 3, axe: 6 }
        this.pendingWeaponCursed = this.floor !== designated[w]
        return
      }
    }

    this.throwReady = true

    if (this.invincible > 0) { this.invincible--; return }

    for (const e of r.enemies.slice()) {
      this._moveEnemy(e)
    }
    if (this.spinCooldown > 0) this.spinCooldown--
    if (this.comboBoost > 0) this.comboBoost--
    if (this.cursed > 0) this.cursed--
  }

  spin() {
    if (!this.alive || this.spinCooldown > 0 || this.pendingWeapon !== null) return
    const r = this.room
    for (const [ddx, ddy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
      const e = r.enemies.find(o => o.x === this.px + ddx && o.y === this.py + ddy)
      if (e) this._hitEnemy(e, this.attack, 'stunned', 1, ddx, ddy)
    }
    this.spinCooldown = this._perks.fasterSpin ? 3 : 5
  }

  attackDir(dx, dy) {
    if (!this.alive || this.pendingWeapon !== null) return
    const nx = this.px + dx; const ny = this.py + dy
    if (nx < 0 || nx >= this.room.w || ny < 0 || ny >= this.room.h) return
    const r = this.room
    if (r.tiles[ny][nx] === T.GRASS_TALL && !r.enemies.some(e => e.x === nx && e.y === ny)) {
      r.tiles[ny][nx] = T.GRASS
      if (this._rng.nextInt(0, 5) === 0) {
        const healed = Math.min(1, this.maxHp - this.hp)
        if (healed > 0) {
          this.hp += healed
          this.events.push({ type: 'heal', x: nx, y: ny, val: healed })
        }
      }
      this.events.push({ type: 'cut', x: nx, y: ny })
      return
    }
    this._doAttack(nx, ny, dx, dy)
  }

  throw(dx, dy) {
    if (!this.alive || !this.throwReady || (this.level < 3 && !this._perks.throwFromStart) || this.pendingWeapon !== null) return
    this.throwReady = false
    const r = this.room
    let cx = this.px + dx; let cy = this.py + dy
    while (cx >= 0 && cx < r.w && cy >= 0 && cy < r.h) {
      const e = r.enemies.find(o => o.x === cx && o.y === cy)
      if (e) { this._hitEnemy(e, this.attack, 'poisoned', 3, dx, dy); break }
      if (!PASS[r.tiles[cy][cx]]) break
      cx += dx; cy += dy
    }
  }

  equipWeapon() {
    if (!this.pendingWeapon) return
    this.weapon = this.pendingWeapon
    this.weaponCursed = this.pendingWeaponCursed
    this.pendingWeapon = null; this.pendingWeaponCursed = false
  }

  skipWeapon() {
    this.pendingWeapon = null; this.pendingWeaponCursed = false
  }

  _hitEnemy(e, dmg, status, statusTurns, dx = 0, dy = 0) {
    let effectiveDmg = dmg + Math.floor(this.combo / 3)
    if (this.comboBoost > 0) effectiveDmg *= 2
    e.hp -= effectiveDmg; e.flash = 8
    this.events.push({ type: 'dmg', x: e.x, y: e.y, val: -effectiveDmg, who: 'enemy' })
    if (!e.status && this.combo >= 5) { e.status = 'stunned'; e.statusTurns = 1 }
    else if (status && !e.status) { e.status = status; e.statusTurns = statusTurns }
    if (e.hp <= 0) {
      this.room.enemies.splice(this.room.enemies.indexOf(e), 1)
      this._onEnemyKilled(e, e.x, e.y)
    } else if (dx !== 0 || dy !== 0) {
      this._knockback(e, dx, dy)
    }
  }

  _knockback(e, dx, dy) {
    const nx = e.x + dx; const ny = e.y + dy
    const r = this.room
    if (nx < 0 || nx >= r.w || ny < 0 || ny >= r.h) return
    if (!PASS_ENEMY[r.tiles[ny][nx]]) return
    if (r.enemies.some(o => o !== e && o.x === nx && o.y === ny)) return
    if (nx === this.px && ny === this.py) return
    e.x = nx; e.y = ny
  }

  _doAttack(nx, ny, dx, dy) {
    const r = this.room
    const atk = this.cursed > 0 ? Math.max(1, Math.floor(this.attack / 2)) : this.attack
    if (this.weapon === 'spear') {
      const nx2 = nx + dx; const ny2 = ny + dy
      for (const e of r.enemies.filter(e => (e.x===nx&&e.y===ny)||(e.x===nx2&&e.y===ny2)).slice())
        this._hitEnemy(e, atk, 'frozen', 2, dx, dy)
      if (this.weaponCursed) {
        const bx = this.px - dx; const by = this.py - dy
        if (bx >= 0 && bx < r.w && by >= 0 && by < r.h && PASS[r.tiles[by][bx]])
          { this.px = bx; this.py = by }
      }
      return
    }
    if (this.weapon === 'axe') {
      const dmg = Math.max(1, Math.floor(atk * 0.75))
      const perp = dx !== 0 ? [[nx, ny-1],[nx, ny],[nx, ny+1]] : [[nx-1, ny],[nx, ny],[nx+1, ny]]
      for (const [ex, ey] of perp) {
        const e = r.enemies.find(o => o.x===ex && o.y===ey)
        if (e) this._hitEnemy(e, dmg, 'stunned', 1, dx, dy)
      }
      if (this.weaponCursed) this.hp = Math.max(this.hp - 1, 0)
      return
    }
    // sword (default)
    const hit = r.enemies.find(e => e.x===nx && e.y===ny)
    if (hit) this._hitEnemy(hit, atk, null, 0, dx, dy)
  }

  _takeDamage(dmg) {
    this.hp = Math.max(this.hp - dmg, 0)
    this.invincible = 3
    this.combo = 0; this.comboFlash = 0; this.comboBoost = 0
    this.events.push({ type: 'dmg', x: this.px, y: this.py, val: -dmg, who: 'player' })
  }

  _toggleSwitch() {
    const r = this.room
    r.switchOn = !r.switchOn
    for (const {x, y} of r.switchWalls)
      r.tiles[y][x] = r.switchOn ? T.GRASS : T.WALL
  }

  _hasLoS(x1, y1, x2, y2) {
    if (x1 !== x2 && y1 !== y2) return false
    const r = this.room
    if (x1 === x2) {
      const minY = Math.min(y1, y2); const maxY = Math.max(y1, y2)
      for (let y = minY + 1; y < maxY; y++)
        if (r.tiles[y][x1] === T.WALL) return false
    } else {
      const minX = Math.min(x1, x2); const maxX = Math.max(x1, x2)
      for (let x = minX + 1; x < maxX; x++)
        if (r.tiles[y1][x] === T.WALL) return false
    }
    return true
  }

  _moveEnemy(e) {
    if (e.status === 'poisoned') {
      e.hp = Math.max(e.hp - 1, 0)
      if (e.hp <= 0) { this.room.enemies.splice(this.room.enemies.indexOf(e), 1); this._onEnemyKilled(e, e.x, e.y) }
    }
    if (e.status) {
      e.statusTurns--
      if (e.statusTurns <= 0) { e.status = null; e.statusTurns = 0 }
      if (e.status === 'stunned' || e.status === 'frozen') return
    }
    if (e.type === 'blocker')  return this._moveBlocker(e)
    if (e.type === 'wanderer') return this._moveWanderer(e)
    if (e.type === 'archer')   return this._moveArcher(e)
    if (e.type === 'charger')  return this._moveCharger(e)
    this._chasePlayer(e)
  }

  _chasePlayer(e) {
    const r = this.room
    const ex = e.x + Math.sign(this.px - e.x)
    const ey = e.y + Math.sign(this.py - e.y)
    if (ex === this.px && ey === this.py) {
      this._takeDamage(e.dmg)
    } else if (PASS_ENEMY[r.tiles[ey][ex]] && !r.enemies.some(o => o !== e && o.x === ex && o.y === ey)) {
      e.x = ex; e.y = ey
    }
  }

  _moveBlocker(e) {
    const dist = Math.abs(this.px - e.x) + Math.abs(this.py - e.y)
    if (dist <= 1) {
      this._takeDamage(e.dmg)
      const r = this.room
      const bx = this.px + Math.sign(this.px - e.x)
      const by = this.py + Math.sign(this.py - e.y)
      if (bx >= 0 && bx < r.w && by >= 0 && by < r.h && PASS[r.tiles[by][bx]])
        { this.px = bx; this.py = by }
    }
  }

  _moveWanderer(e) {
    e.turnsAlive++
    if (e.turnsAlive >= 8 && this.room.enemies.length < 6) {
      const clone = new Enemy(0, 0, e.hp, e.dmg, false, 'wanderer')
      this._spawnEnemy(this.room, clone)
      e.turnsAlive = 0
    }
    const dist = Math.abs(this.px - e.x) + Math.abs(this.py - e.y)
    if (dist <= 3) { this._chasePlayer(e); return }
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
    const [dx, dy] = dirs[this._rng.nextInt(0, 4)]
    const nx = e.x + dx; const ny = e.y + dy
    const r = this.room
    if (PASS_ENEMY[r.tiles[ny]?.[nx]] && !r.enemies.some(o => o !== e && o.x === nx && o.y === ny))
      { e.x = nx; e.y = ny }
  }

  _moveArcher(e) {
    const dist = Math.abs(this.px - e.x) + Math.abs(this.py - e.y)
    if (dist > 3) { this._chasePlayer(e); return }
    if (dist <= 3 && this._hasLoS(e.x, e.y, this.px, this.py)) this._takeDamage(e.dmg)
    if (dist < 2) {
      const r = this.room
      const ex = e.x - Math.sign(this.px - e.x)
      const ey = e.y - Math.sign(this.py - e.y)
      if (PASS_ENEMY[r.tiles[ey]?.[ex]] && !r.enemies.some(o => o !== e && o.x === ex && o.y === ey))
        { e.x = ex; e.y = ey }
    }
  }

  _moveCharger(e) {
    for (let i = 0; i < 2; i++) {
      const ex = e.x + Math.sign(this.px - e.x)
      const ey = e.y + Math.sign(this.py - e.y)
      if (ex === this.px && ey === this.py) { this._takeDamage(e.dmg); return }
      const r = this.room
      if (PASS_ENEMY[r.tiles[ey][ex]] && !r.enemies.some(o => o !== e && o.x === ex && o.y === ey))
        { e.x = ex; e.y = ey } else break
    }
  }

  _onEnemyKilled(e, x, y) {
    this.kills++
    this.soulsFreed++
    this.combo++; this.comboFlash = 60
    if (this.combo >= 10) this.comboBoost = 3
    if (e.isBoss) this.room.tiles[y][x] = T.HEART_CONTAINER
    if (this.room.enemies.length === 0) {
      this.room.cleared = true
      const healed = Math.min(1, this.maxHp - this.hp)
      if (healed > 0) {
        this.hp += healed
        this.events.push({ type: 'heal', x: this.px, y: this.py, val: healed })
      }
    }
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

    // tall grass patches
    const nGrass = rng.nextInt(2, 5)
    for (let i = 0; i < nGrass; i++) {
      const gx = rng.nextInt(2, w-2); const gy = rng.nextInt(3, h-2)
      if (r.tiles[gy][gx] === T.GRASS) r.tiles[gy][gx] = T.GRASS_TALL
    }

    const isBossFloor = f % 5 === 0
    if (!isBossFloor && rng.nextInt(0, 10) < 3) this._placeItem(r, T.MYSTERY_CHEST)

    // weapon pickups on specific floors
    const rank = { sword: 1, spear: 2, axe: 3 }
    if (f === 3 && (rank[this.weapon] || 1) < 2) this._placeItem(r, T.WEAPON_SPEAR)
    if (f === 6 && (rank[this.weapon] || 1) < 3) this._placeItem(r, T.WEAPON_AXE)

    // random cursed weapon drops (~20% chance on non-boss, non-designated floors)
    if (!isBossFloor && f !== 3 && f !== 6 && rng.nextInt(0, 5) === 0) {
      this._placeItem(r, rng.nextBoolean() ? T.WEAPON_SPEAR : T.WEAPON_AXE)
    }

    // switch puzzle (~33% chance on non-boss floors)
    if (!isBossFloor && rng.nextInt(0, 3) === 0) {
      this._placeItem(r, T.SWITCH)
      const nSw = rng.nextInt(2, 4)
      for (let i = 0; i < nSw; i++) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const sx = rng.nextInt(2, w-2); const sy = rng.nextInt(3, h-2)
          if (r.tiles[sy][sx] === T.GRASS) {
            r.tiles[sy][sx] = T.WALL; r.switchWalls.push({ x: sx, y: sy }); break
          }
        }
      }
    }

    // key — always placed, required to advance
    this._placeItem(r, T.KEY)

    const baseHp = 2 + Math.floor(f / 3)
    const baseDmg = 1 + Math.floor(f / 4)
    if (isBossFloor) {
      this._spawnEnemy(r, new Enemy(0, 0, 10 + f * 2, baseDmg + 1, true))
    } else {
      const n = Math.min(f + 2, 9)
      for (let i = 0; i < n; i++) {
        let e
        if (f >= 3) {
          const t = rng.nextInt(0, 4)
          const type = t === 0 ? 'archer' : t === 1 ? 'wanderer' : t === 2 ? 'blocker' : 'charger'
          e = new Enemy(0, 0, baseHp, baseDmg, false, type)
        } else e = new Enemy(0, 0, baseHp, baseDmg)
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

if (typeof module !== 'undefined') module.exports = { T, PASS, PASS_ENEMY, Game, Enemy, Room }
