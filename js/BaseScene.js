class BaseScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.width = 0;
    this.height = 0;
    this.touches = {};
    this.time = 0;
  }

  resize(w, h) {
    this.width = w; this.height = h;
    this.canvas.width = w * devicePixelRatio;
    this.canvas.height = h * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  addTouch(id, x, y) {}
  moveTouch(id, x, y) {}
  removeTouch(id) {}
  update(dt) {}
  render() {}
  reset() {}
  destroy() {}

  _tryVibrate(ms) {
    if (window.vibrationEnabled && navigator.vibrate) navigator.vibrate(ms);
  }
}
