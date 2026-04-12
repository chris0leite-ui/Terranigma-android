package com.terranigma.game

import com.terranigma.map.Tile
import com.terranigma.map.TileMap
import com.terranigma.map.TileType
import org.junit.Assert.assertEquals
import org.junit.Test

class PlayerTest {

    private fun openMap() = TileMap(10, 10)

    @Test
    fun `player starts at given tile coordinates`() {
        val player = Player(tileX = 5, tileY = 3)
        assertEquals(5, player.tileX)
        assertEquals(3, player.tileY)
    }

    @Test
    fun `moveUp decreases tileY by 1`() {
        val player = Player(5, 5)
        player.moveUp(openMap())
        assertEquals(4, player.tileY)
        assertEquals(5, player.tileX)
    }

    @Test
    fun `moveDown increases tileY by 1`() {
        val player = Player(5, 5)
        player.moveDown(openMap())
        assertEquals(6, player.tileY)
    }

    @Test
    fun `moveLeft decreases tileX by 1`() {
        val player = Player(5, 5)
        player.moveLeft(openMap())
        assertEquals(4, player.tileX)
    }

    @Test
    fun `moveRight increases tileX by 1`() {
        val player = Player(5, 5)
        player.moveRight(openMap())
        assertEquals(6, player.tileX)
    }

    @Test
    fun `player cannot move onto a non-walkable tile`() {
        val map = TileMap(10, 10)
        map.setTile(5, 4, Tile(TileType.WATER))
        val player = Player(5, 5)
        player.moveUp(map)
        assertEquals(5, player.tileY) // blocked — did not move
    }

    @Test
    fun `player cannot move above the top edge`() {
        val player = Player(5, 0)
        player.moveUp(openMap())
        assertEquals(0, player.tileY)
    }

    @Test
    fun `player cannot move below the bottom edge`() {
        val player = Player(5, 9)
        player.moveDown(openMap())
        assertEquals(9, player.tileY)
    }

    @Test
    fun `player cannot move past the left edge`() {
        val player = Player(0, 5)
        player.moveLeft(openMap())
        assertEquals(0, player.tileX)
    }

    @Test
    fun `player cannot move past the right edge`() {
        val player = Player(9, 5)
        player.moveRight(openMap())
        assertEquals(9, player.tileX)
    }

    @Test
    fun `player can move through walkable tiles freely`() {
        val player = Player(5, 5)
        val map = openMap()
        player.moveUp(map)
        player.moveUp(map)
        player.moveLeft(map)
        assertEquals(4, player.tileX)
        assertEquals(3, player.tileY)
    }
}
