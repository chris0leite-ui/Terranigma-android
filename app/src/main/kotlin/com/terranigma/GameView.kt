package com.terranigma

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView

// ── Constants ─────────────────────────────────────────────────────────────────
private const val TS = 64          // tile size in px
private const val FRAME_MS = 33L   // ~30 fps

// ── Data types ────────────────────────────────────────────────────────────────

enum class T(val pass: Boolean, val col: Int) {
    GRASS(true,  Color.rgb(56, 142,  60)),
    WALL (false, Color.rgb(55,  71,  79)),
    WATER(false, Color.rgb(30, 136, 229)),
    DOOR (true,  Color.rgb(255, 143,  0)),
}

data class Enemy(var x: Int, var y: Int, var hp: Int = 3)

class Room(val w: Int, val h: Int) {
    val tiles   = Array(h) { Array(w) { T.GRASS } }
    val enemies = mutableListOf<Enemy>()
    var doorX = -1; var doorY = -1
    var doorTarget = -1
    var spawnX = 1;  var spawnY = 1

    operator fun get(y: Int, x: Int) = tiles[y][x]
    operator fun set(y: Int, x: Int, t: T) { tiles[y][x] = t }
}

// ── Game state ────────────────────────────────────────────────────────────────

class Game {
    var px = 5; var py = 5
    var hp = 10; val maxHp = 10
    var roomIdx = 0
    val rooms = buildRooms()
    val room get() = rooms[roomIdx]

    fun move(dx: Int, dy: Int) {
        val nx = px + dx; val ny = py + dy
        val r = room
        if (nx !in 0 until r.w || ny !in 0 until r.h) return
        if (!r[ny, nx].pass) return

        val hit = r.enemies.firstOrNull { it.x == nx && it.y == ny }
        if (hit != null) {
            hit.hp--
            if (hit.hp <= 0) r.enemies.remove(hit)
            return
        }

        px = nx; py = ny

        if (r[ny, nx] == T.DOOR && r.doorTarget >= 0) {
            val next = rooms[r.doorTarget]
            roomIdx = r.doorTarget
            px = next.spawnX; py = next.spawnY
            return
        }

        // enemies step toward player
        for (e in r.enemies.toList()) {
            val ex = e.x + (px - e.x).coerceIn(-1, 1)
            val ey = e.y + (py - e.y).coerceIn(-1, 1)
            when {
                ex == px && ey == py -> hp--
                r[ey, ex].pass && r.enemies.none { it.x == ex && it.y == ey } -> { e.x = ex; e.y = ey }
            }
        }
    }

    private fun buildRooms(): List<Room> {
        // Room 0 – starting area
        val r0 = Room(12, 10).apply {
            for (x in 0 until w) { this[0, x] = T.WALL; this[h-1, x] = T.WALL }
            for (y in 0 until h) { this[y, 0] = T.WALL; this[y, w-1] = T.WALL }
            for (x in 3..5) this[5, x] = T.WATER
            this[h-1, 6] = T.DOOR; doorX = 6; doorY = h-1; doorTarget = 1; spawnX = 5; spawnY = 2
        }
        // Room 1 – enemy room
        val r1 = Room(14, 12).apply {
            for (x in 0 until w) { this[0, x] = T.WALL; this[h-1, x] = T.WALL }
            for (y in 0 until h) { this[y, 0] = T.WALL; this[y, w-1] = T.WALL }
            enemies += Enemy(7, 5); enemies += Enemy(10, 8)
            this[0, 7] = T.DOOR; doorX = 7; doorY = 0; doorTarget = 0; spawnX = 6; spawnY = 8
        }
        return listOf(r0, r1)
    }
}

// ── View ──────────────────────────────────────────────────────────────────────

class GameView(ctx: Context) : SurfaceView(ctx), SurfaceHolder.Callback {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val g = Game()
    private var running = false
    private var thread: Thread? = null

    init { holder.addCallback(this) }

    override fun surfaceCreated(h: SurfaceHolder)                          { resume() }
    override fun surfaceChanged(h: SurfaceHolder, f: Int, w: Int, h2: Int) = Unit
    override fun surfaceDestroyed(h: SurfaceHolder)                        { pause() }

    fun resume() {
        running = true
        thread = Thread {
            while (running) {
                val t = System.currentTimeMillis()
                draw()
                val s = FRAME_MS - (System.currentTimeMillis() - t)
                if (s > 0) Thread.sleep(s)
            }
        }.also { it.start() }
    }

    fun pause() {
        running = false
        thread?.join(); thread = null
    }

    private fun draw() {
        val c = holder.lockCanvas() ?: return
        try { render(c) } finally { holder.unlockCanvasAndPost(c) }
    }

    private fun render(c: Canvas) {
        c.drawColor(Color.BLACK)
        val r = g.room
        val ox = (c.width  - r.w * TS) / 2
        val oy = 56   // HUD height

        // tiles
        for (y in 0 until r.h) for (x in 0 until r.w) {
            paint.color = r[y, x].col
            c.drawRect((ox + x*TS).f, (oy + y*TS).f, (ox + (x+1)*TS).f, (oy + (y+1)*TS).f, paint)
        }

        // enemies (magenta squares)
        paint.color = Color.MAGENTA
        for (e in r.enemies) {
            val pad = 10f
            c.drawRect(ox + e.x*TS + pad, oy + e.y*TS + pad,
                       ox + (e.x+1)*TS - pad, oy + (e.y+1)*TS - pad, paint)
        }

        // player (white ring + red dot)
        val px = (ox + g.px*TS + TS/2).f; val py = (oy + g.py*TS + TS/2).f
        paint.color = Color.WHITE;  c.drawCircle(px, py, (TS/2 - 4).f, paint)
        paint.color = Color.RED;    c.drawCircle(px, py, (TS/2 - 12).f, paint)

        // HUD
        paint.color = Color.DKGRAY; c.drawRect(8f, 8f, 208f, 44f, paint)
        paint.color = if (g.hp > 3) Color.GREEN else Color.RED
        c.drawRect(8f, 8f, 8f + 200f * g.hp / g.maxHp, 44f, paint)
        paint.color = Color.WHITE; paint.textSize = 22f
        c.drawText("HP ${g.hp}/${g.maxHp}", 216f, 36f, paint)
    }

    override fun onTouchEvent(e: MotionEvent): Boolean {
        if (e.action != MotionEvent.ACTION_DOWN) return true
        val r = g.room
        val ox = (width  - r.w * TS) / 2
        val oy = 56
        val tx = (e.x.toInt() - ox) / TS
        val ty = (e.y.toInt() - oy) / TS
        val dx = (tx - g.px).coerceIn(-1, 1)
        val dy = (ty - g.py).coerceIn(-1, 1)
        if (dx != 0) g.move(dx, 0)
        if (dy != 0) g.move(0, dy)
        return true
    }
}

private val Int.f get() = this.toFloat()
