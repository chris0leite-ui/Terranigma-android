package com.terranigma.map

enum class TileType(val walkable: Boolean) {
    GRASS(walkable = true),
    DIRT(walkable = true),
    STONE(walkable = true),
    WATER(walkable = false),
    WALL(walkable = false),
    TREE(walkable = false),
}
