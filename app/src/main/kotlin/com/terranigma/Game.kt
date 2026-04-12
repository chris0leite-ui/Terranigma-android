package com.terranigma

enum class T(val pass: Boolean) {
    GRASS(true), WALL(false), WATER(false), DOOR(true)
}

data class Enemy(var x: Int, var y: Int, var hp: Int = 3, var flash: Int = 0)

class Room(val w: Int, val h: Int) {
    val tiles   = Array(h) { Array(w) { T.GRASS } }
    val enemies = mutableListOf<Enemy>()
    var doorTarget = -1; var spawnX = 1; var spawnY = 1

    operator fun get(y: Int, x: Int) = tiles[y][x]
    operator fun set(y: Int, x: Int, t: T) { tiles[y][x] = t }
}

class Game {
    var px = 5; var py = 5
    var hp = 10; val maxHp = 10
    var invincible = 0
    var roomIdx = 0
    val rooms = buildRooms()
    val room get() = rooms[roomIdx]
    val alive get() = hp > 0

    fun move(dx: Int, dy: Int) {
        if (!alive) return
        val nx = px + dx; val ny = py + dy
        val r = room
        if (nx !in 0 until r.w || ny !in 0 until r.h) return
        if (!r[ny, nx].pass) return

        val hit = r.enemies.firstOrNull { it.x == nx && it.y == ny }
        if (hit != null) {
            hit.hp--; hit.flash = 8
            if (hit.hp <= 0) r.enemies.remove(hit)
            return
        }

        px = nx; py = ny

        if (r[ny, nx] == T.DOOR && r.doorTarget >= 0) {
            val next = rooms[r.doorTarget]
            roomIdx = r.doorTarget; px = next.spawnX; py = next.spawnY; return
        }

        if (invincible > 0) { invincible--; return }

        for (e in r.enemies.toList()) {
            val ex = e.x + (px - e.x).coerceIn(-1, 1)
            val ey = e.y + (py - e.y).coerceIn(-1, 1)
            when {
                ex == px && ey == py -> { hp = (hp - 1).coerceAtLeast(0); invincible = 4 }
                r[ey, ex].pass && r.enemies.none { it.x == ex && it.y == ey } ->
                    { e.x = ex; e.y = ey }
            }
        }
    }

    private fun buildRooms(): List<Room> {
        val r0 = Room(12, 10).apply {
            for (x in 0 until w) { this[0, x] = T.WALL; this[h-1, x] = T.WALL }
            for (y in 0 until h) { this[y, 0] = T.WALL; this[y, w-1] = T.WALL }
            for (x in 3..5) this[5, x] = T.WATER
            this[h-1, 6] = T.DOOR; doorTarget = 1; spawnX = 5; spawnY = 2
        }
        val r1 = Room(12, 10).apply {
            for (x in 0 until w) { this[0, x] = T.WALL; this[h-1, x] = T.WALL }
            for (y in 0 until h) { this[y, 0] = T.WALL; this[y, w-1] = T.WALL }
            enemies += Enemy(7, 5); enemies += Enemy(3, 7)
            this[0, 6] = T.DOOR; doorTarget = 0; spawnX = 6; spawnY = 8
        }
        return listOf(r0, r1)
    }
}
