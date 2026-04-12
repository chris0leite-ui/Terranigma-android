package com.terranigma.map

import org.junit.Assert.assertEquals
import org.junit.Test

class CameraTest {

    @Test
    fun `camera stores initial position`() {
        val camera = Camera(x = 0f, y = 0f, viewportWidth = 320, viewportHeight = 240, tileSize = 16)
        assertEquals(0f, camera.x, 0.001f)
        assertEquals(0f, camera.y, 0.001f)
    }

    @Test
    fun `moveTo updates position`() {
        val camera = Camera(0f, 0f, 320, 240, 16)
        camera.moveTo(48f, 32f)
        assertEquals(48f, camera.x, 0.001f)
        assertEquals(32f, camera.y, 0.001f)
    }

    @Test
    fun `visible tiles X range starts at tile containing camera x`() {
        val camera = Camera(0f, 0f, 320, 240, 16)
        val range = camera.getVisibleTilesX()
        assertEquals(0, range.first)
    }

    @Test
    fun `visible tiles X range covers full viewport width`() {
        val camera = Camera(0f, 0f, 320, 240, 16)
        // 320 / 16 = 20 tiles; range 0..20 covers 21 positions for safety margin
        val range = camera.getVisibleTilesX()
        assertEquals(20, range.last - range.first)
    }

    @Test
    fun `visible tiles Y range covers full viewport height`() {
        val camera = Camera(0f, 0f, 320, 240, 16)
        // 240 / 16 = 15 tiles; range 0..15
        val range = camera.getVisibleTilesY()
        assertEquals(15, range.last - range.first)
    }

    @Test
    fun `visible tiles shift when camera moves`() {
        val camera = Camera(32f, 16f, 320, 240, 16)
        val xRange = camera.getVisibleTilesX()
        val yRange = camera.getVisibleTilesY()
        assertEquals(2, xRange.first)  // 32 / 16 = 2
        assertEquals(1, yRange.first)  // 16 / 16 = 1
    }
}
