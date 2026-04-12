package com.terranigma

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import kotlin.math.abs
import kotlin.math.min

private const val FRAME_MS = 33L
private const val HUD_H    = 56

class GameView(ctx: Context) : SurfaceView(ctx), SurfaceHolder.Callback {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var g = Game()
    private var running = false
    private var thread: Thread? = null

    private var ts      = 64
    private var btnSize = 80
    private var dpadCx  = 0f
    private var dpadCy  = 0f
    private var playerFlash = 0

    @Suppress("DEPRECATION")
    private val vib = ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    init { holder.addCallback(this) }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun surfaceCreated(h: SurfaceHolder) { resume() }

    override fun surfaceChanged(h: SurfaceHolder, f: Int, w: Int, ht: Int) {
        btnSize = min(w, ht) / 6
        val availH = ht - HUD_H - btnSize * 3
        ts     = min(w / g.room.w, availH / g.room.h).coerceAtLeast(8)
        dpadCx = w / 2f
        dpadCy = ht - btnSize * 1.5f
    }

    override fun surfaceDestroyed(h: SurfaceHolder) { pause() }

    fun resume() {
        running = true
        thread = Thread {
            while (running) {
                val t = System.currentTimeMillis()
                if (playerFlash > 0) playerFlash--
                draw()
                val s = FRAME_MS - (System.currentTimeMillis() - t)
                if (s > 0) Thread.sleep(s)
            }
        }.also { it.start() }
    }

    fun pause() { running = false; thread?.join(); thread = null }

    // ── Render ────────────────────────────────────────────────────────────────

    private fun draw() {
        val c = holder.lockCanvas() ?: return
        try { render(c) } finally { holder.unlockCanvasAndPost(c) }
    }

    private fun render(c: Canvas) {
        c.drawColor(Color.BLACK)
        val r  = g.room
        val ox = (c.width - r.w * ts) / 2
        val oy = HUD_H

        // tiles
        for (y in 0 until r.h) for (x in 0 until r.w) {
            val l = ox + x * ts; val t2 = oy + y * ts
            paint.style = Paint.Style.FILL
            paint.color = r[y, x].color()
            c.drawRect(l.f, t2.f, (l + ts).f, (t2 + ts).f, paint)
            paint.style = Paint.Style.STROKE; paint.strokeWidth = 1f
            paint.color = Color.argb(50, 0, 0, 0)
            c.drawRect(l.f, t2.f, (l + ts).f, (t2 + ts).f, paint)
            paint.style = Paint.Style.FILL
        }

        // enemies
        for (e in r.enemies) {
            val pad = ts * 0.15f
            paint.color = if (e.flash > 0) Color.WHITE else Color.rgb(200, 0, 180)
            if (e.flash > 0) e.flash--
            val el = ox + e.x * ts; val et = oy + e.y * ts
            c.drawRect(el + pad, et + pad, el + ts - pad, et + ts - pad, paint)
            // eyes
            paint.color = Color.BLACK
            val ecx = (el + ts / 2).f; val ecy = et + ts * 0.4f
            c.drawCircle(ecx - ts * 0.15f, ecy, ts * 0.07f, paint)
            c.drawCircle(ecx + ts * 0.15f, ecy, ts * 0.07f, paint)
            // HP dots
            val dotR = ts * 0.08f; val dotY = et + ts - pad - dotR
            val totalW = e.hp * dotR * 2 + (e.hp - 1) * dotR
            var dotX = el + ts / 2 - totalW / 2 + dotR
            repeat(e.hp) {
                paint.color = Color.GREEN
                c.drawCircle(dotX, dotY, dotR, paint)
                dotX += dotR * 3
            }
        }

        // player
        val pcx = (ox + g.px * ts + ts / 2).f; val pcy = (oy + g.py * ts + ts / 2).f
        paint.color = if (playerFlash > 0) Color.RED else Color.WHITE
        c.drawCircle(pcx, pcy, (ts / 2 - 4).f, paint)
        paint.color = if (playerFlash > 0) Color.YELLOW else Color.rgb(200, 50, 50)
        c.drawCircle(pcx, pcy, (ts / 2 - ts / 5).f, paint)

        // HUD
        paint.color = Color.DKGRAY; c.drawRect(8f, 8f, 208f, 44f, paint)
        paint.color = if (g.hp > 3) Color.GREEN else Color.RED
        val barW = (200f * g.hp / g.maxHp).coerceAtLeast(0f)
        if (barW > 0) c.drawRect(8f, 8f, 8f + barW, 44f, paint)
        paint.color = Color.WHITE; paint.textSize = 22f
        c.drawText("HP ${g.hp}/${g.maxHp}", 216f, 36f, paint)

        renderDpad(c)

        // game-over overlay
        if (!g.alive) {
            paint.color = Color.argb(180, 0, 0, 0)
            c.drawRect(0f, 0f, c.width.f, c.height.f, paint)
            paint.color = Color.RED; paint.textSize = 64f; paint.textAlign = Paint.Align.CENTER
            c.drawText("GAME OVER", c.width / 2f, c.height / 2f - 40f, paint)
            paint.color = Color.WHITE; paint.textSize = 30f
            c.drawText("Tap to restart", c.width / 2f, c.height / 2f + 20f, paint)
            paint.textAlign = Paint.Align.LEFT
        }
    }

    // D-pad: [ox, oy, label] triples
    private val DPAD = arrayOf(
        floatArrayOf(0f, -1f),   // ▲
        floatArrayOf(-1f, 0f),   // ◄
        floatArrayOf(1f,  0f),   // ►
        floatArrayOf(0f,  1f),   // ▼
    )
    private val DPAD_LABELS = arrayOf("▲", "◄", "►", "▼")

    private fun renderDpad(c: Canvas) {
        paint.textSize  = btnSize * 0.5f
        paint.textAlign = Paint.Align.CENTER
        val half = btnSize * 0.45f
        for (i in DPAD.indices) {
            val bx = dpadCx + DPAD[i][0] * btnSize
            val by = dpadCy + DPAD[i][1] * btnSize
            paint.color = Color.argb(180, 50, 50, 60); paint.style = Paint.Style.FILL
            c.drawRoundRect(bx - half, by - half, bx + half, by + half, 14f, 14f, paint)
            paint.color = Color.argb(200, 180, 180, 200); paint.style = Paint.Style.STROKE
            paint.strokeWidth = 2f
            c.drawRoundRect(bx - half, by - half, bx + half, by + half, 14f, 14f, paint)
            paint.style = Paint.Style.FILL; paint.color = Color.WHITE
            c.drawText(DPAD_LABELS[i], bx, by + btnSize * 0.18f, paint)
        }
        paint.textAlign = Paint.Align.LEFT
    }

    // ── Input ─────────────────────────────────────────────────────────────────

    override fun onTouchEvent(e: MotionEvent): Boolean {
        if (e.action != MotionEvent.ACTION_DOWN) return true
        if (!g.alive) { g = Game(); playerFlash = 0; return true }
        val dx = e.x - dpadCx; val dy = e.y - dpadCy
        val half = btnSize * 0.5f
        val (mdx, mdy) = when {
            dy < -half && abs(dx) < half -> 0 to -1
            dy >  half && abs(dx) < half -> 0 to  1
            dx < -half && abs(dy) < half -> -1 to 0
            dx >  half && abs(dy) < half ->  1 to 0
            else -> return true
        }
        val before = g.hp
        g.move(mdx, mdy)
        if (g.hp < before) { playerFlash = 10; vibrate() }
        return true
    }

    private fun vibrate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vib?.vibrate(VibrationEffect.createOneShot(30L, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION") vib?.vibrate(30L)
        }
    }
}

private fun T.color() = when (this) {
    T.GRASS -> Color.rgb(56,  142,  60)
    T.WALL  -> Color.rgb(55,   71,  79)
    T.WATER -> Color.rgb(30,  136, 229)
    T.DOOR  -> Color.rgb(255, 143,   0)
}

private val Int.f get() = toFloat()
