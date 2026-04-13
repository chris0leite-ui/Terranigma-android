package com.terranigma

import org.junit.Assert.*
import org.junit.Test

class GameTest {

    // ── Existing (updated for procedural rooms) ───────────────────────────────

    @Test fun `player starts at spawn`() {
        val g = Game()
        assertEquals(g.room.spawnX, g.px)
        assertEquals(g.room.spawnY, g.py)
    }

    @Test fun `wall blocks movement`() {
        val g = Game()
        g.px = 1; g.py = 1
        g.move(-1, 0)   // left border wall at x=0
        assertEquals(1, g.px)
    }

    @Test fun `player moves on passable tile`() {
        val g = Game()
        g.room.enemies.clear()
        // spawn row (y=2) is always clear of interior walls/water
        g.px = g.room.spawnX - 1; g.py = g.room.spawnY
        val startX = g.px
        g.move(1, 0)
        assertEquals(startX + 1, g.px)
    }

    @Test fun `water blocks movement`() {
        val g = Game()
        g.room.enemies.clear()
        g.px = 5; g.py = 4
        g.room[4, 6] = T.WATER    // place water manually at (6,4)
        g.move(1, 0)              // try to move to (6,4)
        assertEquals(4, g.py)
        assertEquals(5, g.px)     // blocked
    }

    @Test fun `attacking enemy reduces its hp`() {
        val g = Game()
        val e = Enemy(6, 5); g.room.enemies.clear(); g.room.enemies += e
        g.room[5, 6] = T.GRASS
        g.px = 5; g.py = 5
        g.move(1, 0)
        assertEquals(2, e.hp)
    }

    @Test fun `enemy removed when hp reaches zero`() {
        val g = Game()
        val e = Enemy(6, 5, hp = 1); g.room.enemies.clear(); g.room.enemies += e
        g.room[5, 6] = T.GRASS
        g.px = 5; g.py = 5
        g.move(1, 0)
        assertTrue(g.room.enemies.isEmpty())
    }

    @Test fun `player takes damage when enemy intercepts`() {
        val g = Game()
        g.room.enemies.clear(); g.room.enemies += Enemy(5, 3)
        g.room[3, 4] = T.GRASS
        g.px = 3; g.py = 3
        val before = g.hp
        g.move(1, 0)
        assertEquals(before - 1, g.hp)
    }

    @Test fun `hp never goes below zero`() {
        val g = Game()
        g.room.enemies.clear(); g.room.enemies += Enemy(5, 3)
        g.room[3, 4] = T.GRASS
        g.px = 3; g.py = 3
        repeat(20) { g.invincible = 0; g.move(1, 0); g.px = 3 }
        assertTrue(g.hp >= 0)
    }

    @Test fun `alive is false at zero hp`() {
        val g = Game(); g.hp = 0; assertFalse(g.alive)
    }

    @Test fun `alive is true above zero hp`() {
        assertTrue(Game().alive)
    }

    @Test fun `invincibility frames block damage`() {
        val g = Game()
        g.room.enemies.clear(); g.room.enemies += Enemy(5, 3)
        g.room[3, 4] = T.GRASS
        g.px = 3; g.py = 3
        g.move(1, 0)
        val hpAfter = g.hp; g.px = 3
        g.move(1, 0)   // i-frames active
        assertEquals(hpAfter, g.hp)
    }

    // ── Round 1: Procedural dungeon + floor counter ───────────────────────────

    @Test fun `floor starts at 1`() {
        assertEquals(1, Game().floor)
    }

    @Test fun `entering door increments floor`() {
        val g = Game()
        g.px = g.room.w / 2; g.py = g.room.h - 2  // one above door
        g.room.enemies.clear()
        g.move(0, 1)
        assertEquals(2, g.floor)
    }

    @Test fun `every floor has border walls`() {
        val g = Game()
        val r = g.room
        for (x in 0 until r.w) assertEquals(T.WALL, r[0, x])
        for (y in 0 until r.h) { assertEquals(T.WALL, r[y, 0]); assertEquals(T.WALL, r[y, r.w - 1]) }
        // bottom row: wall except the door position
        for (x in 0 until r.w) if (r[r.h - 1, x] != T.DOOR) assertEquals(T.WALL, r[r.h - 1, x])
    }

    @Test fun `every floor has a door`() {
        val g = Game()
        val r = g.room
        assertTrue((0 until r.h).any { y -> (0 until r.w).any { x -> r[y, x] == T.DOOR } })
    }

    @Test fun `deeper floors spawn more enemies`() {
        val g = Game(seed = 42)
        val r1 = g.generateFloor(1)   // 2 enemies
        val r4 = g.generateFloor(4)   // 5 enemies
        assertTrue(r4.enemies.size > r1.enemies.size)
    }

    // ── Round 2: Level up + chest ─────────────────────────────────────────────

    @Test fun `killing enemy grants xp`() {
        val g = Game()
        g.room.enemies.clear(); g.room.enemies += Enemy(6, g.py, hp = 1)
        g.px = 5
        val before = g.xp
        g.move(1, 0)
        assertEquals(before + 1, g.xp)
    }

    @Test fun `level up increases attack and maxHp`() {
        val g = Game()
        g.xp = g.xpToNext - 1
        g.room.enemies.clear(); g.room.enemies += Enemy(6, g.py, hp = 1)
        g.px = 5
        val prevAtk = g.attack; val prevMax = g.maxHp
        g.move(1, 0)
        assertEquals(prevAtk + 1, g.attack)
        assertEquals(prevMax + 2, g.maxHp)
    }

    @Test fun `chest heals player`() {
        val g = Game()
        g.room.enemies.clear()
        g.hp = 5; g.px = 5; g.py = 3
        g.room[3, 6] = T.CHEST
        g.move(1, 0)
        assertTrue(g.hp > 5)
    }

    @Test fun `chest becomes grass after use`() {
        val g = Game()
        g.room.enemies.clear()
        g.px = 5; g.py = 3
        g.room[3, 6] = T.CHEST
        g.move(1, 0)
        assertEquals(T.GRASS, g.room[3, 6])
    }

    @Test fun `chest does not overheal`() {
        val g = Game()
        g.room.enemies.clear()
        g.hp = g.maxHp; g.px = 5; g.py = 3
        g.room[3, 6] = T.CHEST
        g.move(1, 0)
        assertEquals(g.maxHp, g.hp)
    }

    // ── Round 3: Boss + enemy variety ─────────────────────────────────────────

    @Test fun `brute deals 2 damage`() {
        val g = Game()
        g.room.enemies.clear()
        g.room.enemies += Enemy(5, 3, hp = 6, dmg = 2)
        g.room[3, 4] = T.GRASS
        g.px = 3; g.py = 3
        val before = g.hp
        g.move(1, 0)
        assertEquals(before - 2, g.hp)
    }

    @Test fun `boss spawns on floor 5`() {
        val g = Game(seed = 42)
        val r5 = g.generateFloor(5)
        assertTrue(r5.enemies.any { it.isBoss })
    }

    @Test fun `boss drops chest on death`() {
        val g = Game()
        val boss = Enemy(6, 4, hp = 1, dmg = 2, isBoss = true)
        g.room.enemies.clear(); g.room.enemies += boss
        g.room[4, 6] = T.GRASS
        g.px = 5; g.py = 4
        g.move(1, 0)
        assertEquals(T.CHEST, g.room[4, 6])
    }

    @Test fun `player attack scales with level`() {
        val g = Game()
        g.room.enemies.clear()
        val e = Enemy(6, g.py, hp = 5); g.room.enemies += e
        g.px = 5; g.attack = 2
        g.move(1, 0)
        assertEquals(3, e.hp)   // 5 - 2 = 3
    }
}
