package com.terranigma

import android.app.Activity
import android.os.Bundle

class MainActivity : Activity() {
    private lateinit var view: GameView

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        view = GameView(this)
        setContentView(view)
    }

    override fun onResume() { super.onResume(); view.resume() }
    override fun onPause()  { super.onPause();  view.pause()  }
}
