package com.terranigma.map

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TileMapTest {

    @Test
    fun `map has correct width and height`() {
        val map = TileMap(10, 8)
        assertEquals(10, map.width)
        assertEquals(8, map.height)
    }

    @Test
    fun `default tile type is GRASS`() {
        val map = TileMap(5, 5)
        assertEquals(TileType.GRASS, map.getTile(0, 0).type)
        assertEquals(TileType.GRASS, map.getTile(4, 4).type)
    }

    @Test
    fun `can set and get a tile`() {
        val map = TileMap(5, 5)
        map.setTile(2, 3, Tile(TileType.WATER))
        assertEquals(TileType.WATER, map.getTile(2, 3).type)
    }

    @Test
    fun `setting a tile does not affect neighbours`() {
        val map = TileMap(5, 5)
        map.setTile(2, 2, Tile(TileType.WALL))
        assertEquals(TileType.GRASS, map.getTile(1, 2).type)
        assertEquals(TileType.GRASS, map.getTile(3, 2).type)
        assertEquals(TileType.GRASS, map.getTile(2, 1).type)
        assertEquals(TileType.GRASS, map.getTile(2, 3).type)
    }

    @Test(expected = IndexOutOfBoundsException::class)
    fun `getTile throws when x is out of bounds`() {
        TileMap(5, 5).getTile(5, 0)
    }

    @Test(expected = IndexOutOfBoundsException::class)
    fun `getTile throws when y is out of bounds`() {
        TileMap(5, 5).getTile(0, 5)
    }

    @Test(expected = IndexOutOfBoundsException::class)
    fun `getTile throws when x is negative`() {
        TileMap(5, 5).getTile(-1, 0)
    }

    @Test(expected = IndexOutOfBoundsException::class)
    fun `getTile throws when y is negative`() {
        TileMap(5, 5).getTile(0, -1)
    }

    @Test
    fun `isWalkable returns true for walkable tile`() {
        val map = TileMap(5, 5)
        assertTrue(map.isWalkable(0, 0))
    }

    @Test
    fun `isWalkable returns false for non-walkable tile`() {
        val map = TileMap(5, 5)
        map.setTile(1, 1, Tile(TileType.WATER))
        assertFalse(map.isWalkable(1, 1))
    }

    @Test
    fun `isWalkable returns false for out-of-bounds position`() {
        val map = TileMap(5, 5)
        assertFalse(map.isWalkable(-1, 0))
        assertFalse(map.isWalkable(0, -1))
        assertFalse(map.isWalkable(5, 0))
        assertFalse(map.isWalkable(0, 5))
    }
}
