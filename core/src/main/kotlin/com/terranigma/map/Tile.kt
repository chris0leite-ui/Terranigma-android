package com.terranigma.map

data class Tile(val type: TileType) {
    val isWalkable: Boolean get() = type.walkable
}
