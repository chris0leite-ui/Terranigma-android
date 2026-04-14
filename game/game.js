'use strict'

// ── Tile types ────────────────────────────────────────────────────────────────

const T = {
  GRASS:'GRASS', WALL:'WALL', WATER:'WATER', DOOR:'DOOR', CHEST:'CHEST',
  KEY:'KEY', HEART_CONTAINER:'HEART_CONTAINER', GRASS_TALL:'GRASS_TALL',
  WEAPON_SPEAR:'WEAPON_SPEAR', WEAPON_AXE:'WEAPON_AXE'
}
const PASS = {
  GRASS:true, WALL:false, WATER:true, DOOR:true, CHEST:true,
  KEY:true, HEART_CONTAINER:true, GRASS_TALL:true, WEAPON_SPEAR:true, WEAPON_AXE:true
}
const PASS_ENEMY = {
  GRASS:true, WALL:false, WATER:false, DOOR:true, CHEST:true,
  KEY:false, HEART_CONTAINER:false, GRASS_TALL:true, WEAPON_SPEAR:false, WEAPON_AXE:false
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
    this.hp = hp; this.maxHp = hp; this.dmg = dmg
    this.flash = 0; this.isBoss = isBoss
    this.type = type
    this.status = null; this.statusTurns = 0
    // type-specific fields
    this.shieldDir = null       // shielder: {dx,dy} facing direction
    this.size = null            // splitter: 'big'|'mini'
    this.chargeCooldown = 0     // charger: turns until next charge
  }
}

class Room {
  constructor(w, h) {
    this.w = w; this.h = h
    this.tiles = Array.from({ length: h }, () => Array(w).fill(T.GRASS))
    this.enemies = []
    this.spawnX = 1; this.spawnY = 1
    this.cleared = false
  }
}

// ── Game ──────────────────────────────────────────────────────────────────────

class Game {
  constructor(seed = Date.now()) {
    this._rng = makeRng(seed)
    this.px = 0; this.py = 0
    this.hp = 15; this.maxHp = 15
    this.attack = 1
    this.xp = 0; this.xpToNext = 3
    this.level = 1; this.floor = 1
    this.invincible = 0; this.kills = 0
    this.weapon = 'sword'
    this.throwReady = true
    this.combo = 0; this.comboFlash = 0
    this.spinCooldown = 0; this.soulsFreed = 0
    this.events = []
    this.hasKey = false
    this.pendingWeapon = null
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
        return
      }
    }

    this.throwReady = true

    if (this.invincible > 0) { this.invincible--; return }

    for (const e of r.enemies.slice()) {
      this._moveEnemy(e)
    }
    if (this.spinCooldown > 0) this.spinCooldown--
  }

  spin() {
    if (!this.alive || this.spinCooldown > 0 || this.pendingWeapon !== null) return
    const r = this.room
    for (const [ddx, ddy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
      const e = r.enemies.find(o => o.x === this.px + ddx && o.y === this.py + ddy)
      if (e) this._hitEnemy(e, this.attack, 'stunned', 1, ddx, ddy)
    }
    this.spinCooldown = 5
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
    if (!this.alive || !this.throwReady || this.level < 3 || this.pendingWeapon !== null) return
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
    this.pendingWeapon = null
  }

  skipWeapon() {
    this.pendingWeapon = null
  }

  _hitEnemy(e, dmg, status, statusTurns, dx = 0, dy = 0) {
    if (e.type === 'shielder' && e.shieldDir &&
        dx === -e.shieldDir.dx && dy === -e.shieldDir.dy) {
      this.events.push({ type: 'blocked', x: e.x, y: e.y }); return
    }
    const effectiveDmg = dmg + Math.floor(this.combo / 3)
    e.hp -= effectiveDmg; e.flash = 8
    this.events.push({ type: 'dmg', x: e.x, y: e.y, val: -effectiveDmg, who: 'enemy' })
    if (status && !e.status) { e.status = status; e.statusTurns = statusTurns }
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
    if (this.weapon === 'spear') {
      const nx2 = nx + dx; const ny2 = ny + dy
      for (const e of r.enemies.filter(e => (e.x===nx&&e.y===ny)||(e.x===nx2&&e.y===ny2)).slice())
        this._hitEnemy(e, this.attack, 'frozen', 2, dx, dy)
      return
    }
    if (this.weapon === 'axe') {
      const dmg = Math.max(1, Math.floor(this.attack * 0.75))
      const perp = dx !== 0 ? [[nx, ny-1],[nx, ny],[nx, ny+1]] : [[nx-1, ny],[nx, ny],[nx+1, ny]]
      for (const [ex, ey] of perp) {
        const e = r.enemies.find(o => o.x===ex && o.y===ey)
        if (e) this._hitEnemy(e, dmg, 'stunned', 1, dx, dy)
      }
      return
    }
    // sword (default)
    const hit = r.enemies.find(e => e.x===nx && e.y===ny)
    if (hit) this._hitEnemy(hit, this.attack, null, 0, dx, dy)
  }

  _takeDamage(dmg) {
    this.hp = Math.max(this.hp - dmg, 0)
    this.invincible = 6
    this.combo = 0; this.comboFlash = 0
    this.events.push({ type: 'dmg', x: this.px, y: this.py, val: -dmg, who: 'player' })
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
    if (e.type === 'shielder') return this._moveShielder(e)
    if (e.type === 'splitter') return this._moveSplitter(e)
    if (e.type === 'charger')  return this._moveCharger(e)
    if (e.type === 'healer')   return this._moveHealer(e)
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
    if (dist <= 1) this._takeDamage(e.dmg)
  }

  _moveWanderer(e) {
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
    if (dist <= 3) this._takeDamage(e.dmg)
    if (dist < 2) {
      const r = this.room
      const ex = e.x - Math.sign(this.px - e.x)
      const ey = e.y - Math.sign(this.py - e.y)
      if (PASS_ENEMY[r.tiles[ey]?.[ex]] && !r.enemies.some(o => o !== e && o.x === ex && o.y === ey))
        { e.x = ex; e.y = ey }
    }
  }

  _moveShielder(e) {
    // Update shield to face player each turn
    const sdx = Math.sign(this.px - e.x); const sdy = Math.sign(this.py - e.y)
    if (sdx !== 0 && sdy === 0) e.shieldDir = { dx: sdx, dy: 0 }
    else if (sdy !== 0 && sdx === 0) e.shieldDir = { dx: 0, dy: sdy }
    else e.shieldDir = { dx: sdx, dy: 0 } // diagonal: prefer horizontal
    this._chasePlayer(e)
  }

  _moveSplitter(e) {
    if (e.size === 'mini') { this._moveWanderer(e); return }
    this._chasePlayer(e)
  }

  _moveCharger(e) {
    if (e.chargeCooldown > 0) { e.chargeCooldown--; return }
    // Check alignment: same row or column within 5 tiles
    const aligned = (e.y === this.py && Math.abs(this.px - e.x) <= 5) ||
                    (e.x === this.px && Math.abs(this.py - e.y) <= 5)
    if (!aligned) { this._moveWanderer(e); return }
    // Charge: move up to 3 tiles toward player
    const dx = Math.sign(this.px - e.x); const dy = Math.sign(this.py - e.y)
    const r = this.room
    let charged = false
    for (let step = 0; step < 3; step++) {
      const nx = e.x + dx; const ny = e.y + dy
      if (nx === this.px && ny === this.py) { this._takeDamage(e.dmg + 1); charged = true; break }
      if (!PASS_ENEMY[r.tiles[ny]?.[nx]]) break
      if (r.enemies.some(o => o !== e && o.x === nx && o.y === ny)) break
      e.x = nx; e.y = ny; charged = true
    }
    if (charged) e.chargeCooldown = 3
  }

  _moveHealer(e) {
    // Find nearest injured ally within 3 tiles
    const ally = this.room.enemies
      .filter(o => o !== e && o.hp < o.maxHp &&
                   Math.abs(o.x - e.x) + Math.abs(o.y - e.y) <= 3)
      .sort((a, b) => (Math.abs(a.x-e.x)+Math.abs(a.y-e.y)) - (Math.abs(b.x-e.x)+Math.abs(b.y-e.y)))[0]
    if (ally) { ally.hp = Math.min(ally.hp + 1, ally.maxHp); return }
    this._moveWanderer(e)
  }

  _onEnemyKilled(e, x, y) {
    this.kills++
    this.soulsFreed++
    this.combo++; this.comboFlash = 60
    if (e.isBoss) this.room.tiles[y][x] = T.HEART_CONTAINER
    if (e.type === 'splitter' && e.size === 'big') {
      const offsets = [[1,0],[-1,0],[0,1],[0,-1]]
      let spawned = 0
      for (const [ox, oy] of offsets) {
        if (spawned >= 2) break
        const mx = x + ox; const my = y + oy
        if (mx < 0 || mx >= this.room.w || my < 0 || my >= this.room.h) continue
        if (!PASS_ENEMY[this.room.tiles[my][mx]]) continue
        if (this.room.enemies.some(o => o.x === mx && o.y === my)) continue
        if (mx === this.px && my === this.py) continue
        const mini = new Enemy(mx, my, 1, 1, false, 'splitter')
        mini.size = 'mini'
        this.room.enemies.push(mini)
        spawned++
      }
    }
    if (this.room.enemies.length === 0) {
      this.room.cleared = true
      const healed = Math.min(2, this.maxHp - this.hp)
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
    if (!isBossFloor && rng.nextInt(0, 10) < 3) this._placeItem(r, T.CHEST)

    // weapon pickups on specific floors
    const rank = { sword: 1, spear: 2, axe: 3 }
    if (f === 3 && (rank[this.weapon] || 1) < 2) this._placeItem(r, T.WEAPON_SPEAR)
    if (f === 6 && (rank[this.weapon] || 1) < 3) this._placeItem(r, T.WEAPON_AXE)

    // key — always placed, required to advance
    this._placeItem(r, T.KEY)

    if (isBossFloor) {
      this._spawnEnemy(r, new Enemy(0, 0, 10 + f, 2, true))
    } else {
      const n = Math.min(f + 1, 6)
      for (let i = 0; i < n; i++) {
        let e
        if (f >= 8 && rng.nextInt(0, 20) < 3) {
          e = new Enemy(0, 0, 3, 0, false, 'healer'); e.maxHp = 3
        } else if (f >= 6 && rng.nextInt(0, 5) === 0) {
          e = new Enemy(0, 0, 5, 1, false, 'splitter'); e.size = 'big'
        } else if (f >= 5 && rng.nextInt(0, 4) === 0) {
          e = new Enemy(0, 0, 6, 2)
        } else if (f >= 4 && rng.nextInt(0, 5) === 0) {
          e = new Enemy(0, 0, 4, 1, false, 'shielder')
          e.shieldDir = { dx: 0, dy: -1 } // initial facing (updated each turn)
        } else if (f >= 2 && rng.nextInt(0, 4) === 0) {
          e = new Enemy(0, 0, 3, 1, false, 'charger')
        } else if (f >= 3) {
          const t = rng.nextInt(0, 3)
          const type = t === 0 ? 'archer' : t === 1 ? 'wanderer' : 'blocker'
          e = new Enemy(0, 0, 3, 1, false, type)
        } else e = new Enemy(0, 0, f <= 2 ? 2 : 3, 1)
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
