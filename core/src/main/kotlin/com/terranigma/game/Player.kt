package com.terranigma.game

import com.terranigma.map.TileMap

class Player(var tileX: Int, var tileY: Int) {

    fun moveUp(map: TileMap) = moveTo(tileX, tileY - 1, map)
    fun moveDown(map: TileMap) = moveTo(tileX, tileY + 1, map)
    fun moveLeft(map: TileMap) = moveTo(tileX - 1, tileY, map)
    fun moveRight(map: TileMap) = moveTo(tileX + 1, tileY, map)

    private fun moveTo(newX: Int, newY: Int, map: TileMap) {
        if (map.isWalkable(newX, newY)) {
            tileX = newX
            tileY = newY
        }
    }
}
