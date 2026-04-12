package com.terranigma.map

class TileMap(val width: Int, val height: Int) {

    private val tiles: Array<Array<Tile>> =
        Array(height) { Array(width) { Tile(TileType.GRASS) } }

    fun getTile(x: Int, y: Int): Tile {
        checkBounds(x, y)
        return tiles[y][x]
    }

    fun setTile(x: Int, y: Int, tile: Tile) {
        checkBounds(x, y)
        tiles[y][x] = tile
    }

    fun isWalkable(x: Int, y: Int): Boolean {
        if (x < 0 || x >= width || y < 0 || y >= height) return false
        return tiles[y][x].isWalkable
    }

    private fun checkBounds(x: Int, y: Int) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            throw IndexOutOfBoundsException(
                "Tile ($x, $y) is out of bounds for map ${width}x${height}"
            )
        }
    }
}
