package com.terranigma

import kotlin.random.Random

enum class T(val pass: Boolean) {
    GRASS(true), WALL(false), WATER(false), DOOR(true), CHEST(true)
}

data class Enemy(
    var x: Int, var y: Int,
    var hp: Int = 3, var dmg: Int = 1,
    var flash: Int = 0, val isBoss: Boolean = false
)

class Room(val w: Int, val h: Int) {
    val tiles   = Array(h) { Array(w) { T.GRASS } }
    val enemies = mutableListOf<Enemy>()
    var spawnX = 1; var spawnY = 1

    operator fun get(y: Int, x: Int) = tiles[y][x]
    operator fun set(y: Int, x: Int, t: T) { tiles[y][x] = t }
}

class Game(seed: Long = System.currentTimeMillis()) {
    private val rng = Random(seed)

    var px = 0;    var py = 0
    var hp = 10;   var maxHp = 10
    var attack = 1
    var xp = 0;    var xpToNext = 3
    var level = 1; var floor = 1
    var invincible = 0; var kills = 0

    var room = generateFloor(floor)
        private set

    val alive get() = hp > 0

    init { px = room.spawnX; py = room.spawnY }

    // ── Move ─────────────────────────────────────────────────────────────────

    fun move(dx: Int, dy: Int) {
        if (!alive) return
        val nx = px + dx; val ny = py + dy
        val r = room
        if (nx !in 0 until r.w || ny !in 0 until r.h) return
        if (!r[ny, nx].pass) return

        val hit = r.enemies.firstOrNull { it.x == nx && it.y == ny }
        if (hit != null) {
            hit.hp -= attack; hit.flash = 8
            if (hit.hp <= 0) { r.enemies.remove(hit); onEnemyKilled(hit, nx, ny) }
            return
        }

        px = nx; py = ny

        when (r[ny, nx]) {
            T.DOOR  -> { floor++; room = generateFloor(floor); px = room.spawnX; py = room.spawnY; return }
            T.CHEST -> { hp = minOf(hp + 3, maxHp); r[ny, nx] = T.GRASS }
            else    -> {}
        }

        if (invincible > 0) { invincible--; return }

        for (e in r.enemies.toList()) {
            val ex = e.x + (px - e.x).coerceIn(-1, 1)
            val ey = e.y + (py - e.y).coerceIn(-1, 1)
            when {
                ex == px && ey == py -> { hp = (hp - e.dmg).coerceAtLeast(0); invincible = 4 }
                r[ey, ex].pass && r.enemies.none { it.x == ex && it.y == ey } -> { e.x = ex; e.y = ey }
            }
        }
    }

    private fun onEnemyKilled(e: Enemy, x: Int, y: Int) {
        kills++
        if (e.isBoss) room[y, x] = T.CHEST
        xp++
        if (xp >= xpToNext) levelUp()
    }

    private fun levelUp() {
        level++; xp = 0; xpToNext = level * 3
        attack++; maxHp += 2; hp = minOf(hp + 2, maxHp)
    }

    // ── Dungeon generation ────────────────────────────────────────────────────

    internal fun generateFloor(f: Int): Room {
        val w = 12; val h = 10
        val r = Room(w, h)

        for (x in 0 until w) { r[0, x] = T.WALL; r[h - 1, x] = T.WALL }
        for (y in 0 until h) { r[y, 0] = T.WALL; r[y, w - 1] = T.WALL }

        r[h - 1, w / 2] = T.DOOR
        r.spawnX = w / 2; r.spawnY = 2

        repeat(rng.nextInt(3, 7)) {
            val wx = rng.nextInt(2, w - 2); val wy = rng.nextInt(3, h - 2)
            if (r[wy, wx] == T.GRASS) r[wy, wx] = T.WALL
        }

        if (rng.nextBoolean()) {
            val wy = rng.nextInt(4, h - 3); val wx = rng.nextInt(2, w - 5)
            for (i in 0..2) if (r[wy, wx + i] == T.GRASS) r[wy, wx + i] = T.WATER
        }

        val isBossFloor = f % 5 == 0
        if (!isBossFloor && rng.nextInt(10) < 3) placeItem(r, T.CHEST)

        if (isBossFloor) {
            spawnEnemy(r, Enemy(0, 0, hp = 10 + f, dmg = 2, isBoss = true))
        } else {
            repeat(minOf(f + 1, 6)) {
                val e = when {
                    f >= 5 && rng.nextInt(4) == 0 -> Enemy(0, 0, hp = 6, dmg = 2)
                    else                           -> Enemy(0, 0, hp = 3, dmg = 1)
                }
                spawnEnemy(r, e)
            }
        }
        return r
    }

    private fun placeItem(r: Room, t: T) {
        repeat(25) {
            val x = rng.nextInt(2, r.w - 2); val y = rng.nextInt(3, r.h - 2)
            if (r[y, x] == T.GRASS && !(x == r.spawnX && y == r.spawnY)) { r[y, x] = t; return }
        }
    }

    private fun spawnEnemy(r: Room, e: Enemy) {
        repeat(30) {
            val x = rng.nextInt(1, r.w - 1); val y = rng.nextInt(4, r.h - 2)
            if (r[y, x] == T.GRASS && r.enemies.none { it.x == x && it.y == y }) {
                e.x = x; e.y = y; r.enemies += e; return
            }
        }
    }
}
