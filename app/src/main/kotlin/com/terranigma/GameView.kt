package com.terranigma

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.terranigma.game.Player
import com.terranigma.map.Camera
import com.terranigma.map.Tile
import com.terranigma.map.TileMap
import com.terranigma.map.TileType

class GameView(context: Context) : SurfaceView(context), SurfaceHolder.Callback {

    companion object {
        private const val TILE_SIZE = 48
        private const val MAP_WIDTH = 20
        private const val MAP_HEIGHT = 26
        private const val TARGET_FPS = 60L
        private const val FRAME_MS = 1000L / TARGET_FPS
    }

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val tileMap: TileMap
    private val camera: Camera
    private val player: Player

    private var gameThread: Thread? = null
    private var running = false

    init {
        holder.addCallback(this)

        tileMap = buildDemoMap()
        camera = Camera(
            x = 0f, y = 0f,
            viewportWidth = resources.displayMetrics.widthPixels,
            viewportHeight = resources.displayMetrics.heightPixels,
            tileSize = TILE_SIZE,
        )
        player = Player(tileX = MAP_WIDTH / 2, tileY = MAP_HEIGHT / 2)
    }

    // ── demo map ─────────────────────────────────────────────────────────────

    private fun buildDemoMap(): TileMap {
        val map = TileMap(MAP_WIDTH, MAP_HEIGHT)

        // wall border
        for (x in 0 until MAP_WIDTH) {
            map.setTile(x, 0, Tile(TileType.WALL))
            map.setTile(x, MAP_HEIGHT - 1, Tile(TileType.WALL))
        }
        for (y in 0 until MAP_HEIGHT) {
            map.setTile(0, y, Tile(TileType.WALL))
            map.setTile(MAP_WIDTH - 1, y, Tile(TileType.WALL))
        }

        // river
        for (x in 6..13) map.setTile(x, MAP_HEIGHT / 2, Tile(TileType.WATER))

        // trees
        for (x in 2..5) for (y in 2..5) map.setTile(x, y, Tile(TileType.TREE))

        // dirt path
        for (x in 1 until MAP_WIDTH - 1) map.setTile(x, MAP_HEIGHT / 2 + 3, Tile(TileType.DIRT))

        return map
    }

    // ── SurfaceHolder.Callback ────────────────────────────────────────────────

    override fun surfaceCreated(holder: SurfaceHolder) {
        resume()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) = Unit

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        pause()
    }

    // ── lifecycle ─────────────────────────────────────────────────────────────

    fun resume() {
        running = true
        gameThread = Thread {
            while (running) {
                val frameStart = System.currentTimeMillis()
                drawFrame()
                val elapsed = System.currentTimeMillis() - frameStart
                val sleep = FRAME_MS - elapsed
                if (sleep > 0) Thread.sleep(sleep)
            }
        }.also { it.start() }
    }

    fun pause() {
        running = false
        try { gameThread?.join() } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
        }
        gameThread = null
    }

    private fun drawFrame() {
        val canvas = holder.lockCanvas() ?: return
        try {
            render(canvas)
        } finally {
            holder.unlockCanvasAndPost(canvas)
        }
    }

    // ── rendering ─────────────────────────────────────────────────────────────

    private fun render(canvas: Canvas) {
        canvas.drawColor(Color.BLACK)

        val offsetX = -camera.x.toInt()
        val offsetY = -camera.y.toInt()

        for (ty in 0 until tileMap.height) {
            for (tx in 0 until tileMap.width) {
                val screenX = tx * TILE_SIZE + offsetX
                val screenY = ty * TILE_SIZE + offsetY

                paint.color = tileColorFor(tileMap.getTile(tx, ty).type)
                canvas.drawRect(
                    screenX.toFloat(),
                    screenY.toFloat(),
                    (screenX + TILE_SIZE).toFloat(),
                    (screenY + TILE_SIZE).toFloat(),
                    paint,
                )
            }
        }

        // grid lines
        paint.color = Color.argb(40, 0, 0, 0)
        paint.strokeWidth = 1f
        for (ty in 0..tileMap.height) {
            val y = (ty * TILE_SIZE + offsetY).toFloat()
            canvas.drawLine(offsetX.toFloat(), y, (tileMap.width * TILE_SIZE + offsetX).toFloat(), y, paint)
        }
        for (tx in 0..tileMap.width) {
            val x = (tx * TILE_SIZE + offsetX).toFloat()
            canvas.drawLine(x, offsetY.toFloat(), x, (tileMap.height * TILE_SIZE + offsetY).toFloat(), paint)
        }

        // player
        val px = (player.tileX * TILE_SIZE + offsetX + TILE_SIZE / 2).toFloat()
        val py = (player.tileY * TILE_SIZE + offsetY + TILE_SIZE / 2).toFloat()
        paint.color = Color.WHITE
        canvas.drawCircle(px, py, (TILE_SIZE / 2 - 4).toFloat(), paint)
        paint.color = Color.RED
        canvas.drawCircle(px, py, (TILE_SIZE / 2 - 8).toFloat(), paint)
    }

    private fun tileColorFor(type: TileType): Int = when (type) {
        TileType.GRASS -> Color.rgb(56, 142, 60)
        TileType.DIRT  -> Color.rgb(121, 85, 72)
        TileType.STONE -> Color.rgb(117, 117, 117)
        TileType.WATER -> Color.rgb(30, 136, 229)
        TileType.WALL  -> Color.rgb(55, 71, 79)
        TileType.TREE  -> Color.rgb(27, 94, 32)
    }

    // ── touch input ──────────────────────────────────────────────────────────

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN) {
            val offsetX = camera.x.toInt()
            val offsetY = camera.y.toInt()
            val tappedX = (event.x.toInt() + offsetX) / TILE_SIZE
            val tappedY = (event.y.toInt() + offsetY) / TILE_SIZE

            when {
                tappedX > player.tileX -> player.moveRight(tileMap)
                tappedX < player.tileX -> player.moveLeft(tileMap)
            }
            when {
                tappedY > player.tileY -> player.moveDown(tileMap)
                tappedY < player.tileY -> player.moveUp(tileMap)
            }

            // centre camera on player
            camera.moveTo(
                (player.tileX * TILE_SIZE - camera.viewportWidth / 2).toFloat().coerceAtLeast(0f),
                (player.tileY * TILE_SIZE - camera.viewportHeight / 2).toFloat().coerceAtLeast(0f),
            )
        }
        return true
    }
}
