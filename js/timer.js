const Timer = {
  _minutes: 0,
  _remaining: 0,
  _active: false,
  _onEnd: null,
  _displayEl: null,

  init(displayEl) { this._displayEl = displayEl; },

  start(minutes, onEnd) {
    this.stop();
    if (minutes <= 0) { this._hideTimer(); return; }
    this._minutes = minutes;
    this._remaining = minutes * 60;
    this._active = true;
    this._onEnd = onEnd || null;
    this._showTimer();
  },

  stop() {
    this._active = false;
    this._remaining = 0;
  },

  tick(dt) {
    if (!this._active || this._remaining <= 0) return;
    this._remaining -= dt;
    this._updateDisplay();
    if (this._remaining <= 0) {
      this._active = false;
      if (this._onEnd) this._onEnd();
    }
  },

  isActive() { return this._active; },

  _updateDisplay() {
    if (!this._displayEl) return;
    const m = Math.floor(this._remaining / 60);
    const s = Math.floor(this._remaining % 60);
    this._displayEl.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  },

  _showTimer() {
    const el = document.getElementById('timer-countdown');
    if (el) el.classList.remove('hidden');
    const ov = document.getElementById('timer-overlay');
    if (ov) ov.classList.remove('hidden');
  },

  _hideTimer() {
    const el = document.getElementById('timer-countdown');
    if (el) el.classList.add('hidden');
    const ov = document.getElementById('timer-overlay');
    if (ov) ov.classList.add('hidden');
  }
};
