package com.terranigma.map

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TileTest {

    @Test
    fun `tile holds its type`() {
        val tile = Tile(TileType.GRASS)
        assertEquals(TileType.GRASS, tile.type)
    }

    @Test
    fun `tile is walkable when type is walkable`() {
        val tile = Tile(TileType.DIRT)
        assertTrue(tile.isWalkable)
    }

    @Test
    fun `tile is not walkable when type is not walkable`() {
        val tile = Tile(TileType.WATER)
        assertFalse(tile.isWalkable)
    }

    @Test
    fun `two tiles with same type are equal`() {
        val a = Tile(TileType.STONE)
        val b = Tile(TileType.STONE)
        assertEquals(a, b)
    }
}
