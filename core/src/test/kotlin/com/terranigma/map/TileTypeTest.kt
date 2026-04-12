package com.terranigma.map

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TileTypeTest {

    @Test
    fun `GRASS is walkable`() {
        assertTrue(TileType.GRASS.walkable)
    }

    @Test
    fun `DIRT is walkable`() {
        assertTrue(TileType.DIRT.walkable)
    }

    @Test
    fun `STONE is walkable`() {
        assertTrue(TileType.STONE.walkable)
    }

    @Test
    fun `WATER is not walkable`() {
        assertFalse(TileType.WATER.walkable)
    }

    @Test
    fun `WALL is not walkable`() {
        assertFalse(TileType.WALL.walkable)
    }

    @Test
    fun `TREE is not walkable`() {
        assertFalse(TileType.TREE.walkable)
    }
}
