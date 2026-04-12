package com.terranigma

import org.junit.Assert.*
import org.junit.Test

class GameTest {

    @Test fun `player starts at spawn`() {
        val g = Game()
        assertEquals(5, g.px); assertEquals(5, g.py)
    }

    @Test fun `wall blocks movement`() {
        val g = Game()
        g.px = 1; g.py = 1
        g.move(-1, 0)   // left wall at x=0
        assertEquals(1, g.px)
    }

    @Test fun `player moves on passable tile`() {
        val g = Game()
        g.px = 5; g.py = 3
        g.move(1, 0)
        assertEquals(6, g.px)
    }

    @Test fun `water blocks movement`() {
        val g = Game()
        // room 0: water at y=5, x=3..5
        g.px = 3; g.py = 4
        g.move(0, 1)
        assertEquals(4, g.py)
    }

    @Test fun `attacking enemy reduces its hp`() {
        val g = Game()
        val e = Enemy(6, 5); g.room.enemies.clear(); g.room.enemies += e
        g.px = 5; g.py = 5
        g.move(1, 0)
        assertEquals(2, e.hp)
    }

    @Test fun `enemy removed when hp reaches zero`() {
        val g = Game()
        val e = Enemy(6, 5, hp = 1); g.room.enemies.clear(); g.room.enemies += e
        g.px = 5; g.py = 5
        g.move(1, 0)
        assertTrue(g.room.enemies.isEmpty())
    }

    @Test fun `player takes damage when enemy intercepts`() {
        val g = Game()
        // enemy at (5,3), player at (3,3) → player moves to (4,3) → enemy moves to (4,3) = player
        g.room.enemies.clear(); g.room.enemies += Enemy(5, 3)
        g.px = 3; g.py = 3
        val before = g.hp
        g.move(1, 0)
        assertEquals(before - 1, g.hp)
    }

    @Test fun `door transitions to next room`() {
        val g = Game()
        // room 0 door at (6, 9) — bottom row
        g.px = 6; g.py = 8
        g.move(0, 1)
        assertEquals(1, g.roomIdx)
    }

    @Test fun `hp never goes below zero`() {
        val g = Game()
        g.room.enemies.clear(); g.room.enemies += Enemy(5, 3)
        g.px = 3; g.py = 3
        repeat(20) { g.invincible = 0; g.move(1, 0); g.px = 3 }
        assertTrue(g.hp >= 0)
    }

    @Test fun `alive is false at zero hp`() {
        val g = Game()
        g.hp = 0
        assertFalse(g.alive)
    }

    @Test fun `alive is true above zero hp`() {
        val g = Game()
        assertTrue(g.alive)
    }

    @Test fun `invincibility frames block damage`() {
        val g = Game()
        g.room.enemies.clear(); g.room.enemies += Enemy(5, 3)
        g.px = 3; g.py = 3
        g.move(1, 0)                   // takes damage, invincible set
        val hpAfterFirstHit = g.hp
        g.px = 3                       // reset position
        g.move(1, 0)                   // should NOT take damage (i-frames active)
        assertEquals(hpAfterFirstHit, g.hp)
    }
}
