const BreathGuide = {
  _active: false,
  _timeout: null,

  start() {
    this._active = true;
    const overlay = document.getElementById('breath-overlay');
    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    overlay.classList.remove('hidden');
    audio.startBreath();

    let inhaling = true;
    circle.style.transform = 'scale(0.6)';
    text.textContent = '吸气';

    const cycle = () => {
      if (!this._active) return;
      if (inhaling) {
        circle.style.transform = 'scale(1.3)';
        text.textContent = '吸气';
        this._timeout = setTimeout(() => {
          if (!this._active) return;
          inhaling = false;
          circle.style.transform = 'scale(0.6)';
          text.textContent = '呼气';
          this._timeout = setTimeout(cycle, 4000);
        }, 4000);
      } else {
        inhaling = true;
        cycle();
      }
    };
    cycle();
  },

  stop() {
    this._active = false;
    if (this._timeout) { clearTimeout(this._timeout); this._timeout = null; }
    document.getElementById('breath-overlay').classList.add('hidden');
    audio.stopBreath();
  },

  isActive() { return this._active; }
};
