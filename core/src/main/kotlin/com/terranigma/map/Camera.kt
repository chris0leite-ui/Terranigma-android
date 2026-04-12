package com.terranigma.map

class Camera(
    var x: Float,
    var y: Float,
    val viewportWidth: Int,
    val viewportHeight: Int,
    val tileSize: Int,
) {
    fun moveTo(newX: Float, newY: Float) {
        x = newX
        y = newY
    }

    fun getVisibleTilesX(): IntRange {
        val start = (x / tileSize).toInt()
        val end = start + viewportWidth / tileSize
        return start..end
    }

    fun getVisibleTilesY(): IntRange {
        val start = (y / tileSize).toInt()
        val end = start + viewportHeight / tileSize
        return start..end
    }
}
