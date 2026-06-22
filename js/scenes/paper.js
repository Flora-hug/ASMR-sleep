// paper.js - 揉纸团 Scene
class PaperScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.width = 0; this.height = 0;
    this.touches = {};
    this.wrinkleMap = [];
    this.wrinkleGrid = { cols: 0, rows: 0, cellSize: 4 };
    this.wrinkleIntensity = 0;
    this.time = 0;
    this.lastMoveTime = 0;
    this.moveIntensity = 0;
  }

  resize(w, h) {
    this.width = w; this.height = h;
    this.canvas.width = w * devicePixelRatio;
    this.canvas.height = h * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.wrinkleGrid.cols = Math.ceil(w / this.wrinkleGrid.cellSize);
    this.wrinkleGrid.rows = Math.ceil(h / this.wrinkleGrid.cellSize);
    this.wrinkleMap = new Float32Array(this.wrinkleGrid.cols * this.wrinkleGrid.rows);
  }

  addTouch(id, x, y) {
    this.touches[id] = { x, y, px: x, py: y, startX: x, startY: y, time: Date.now() };
    this._addWrinkle(x, y, 35);
    this.wrinkleIntensity = Math.min(1, this.wrinkleIntensity + 0.2);
    audio.playPaperCrinkle(0.3);
    this._tryVibrate(10);
  }

  moveTouch(id, x, y) {
    const t = this.touches[id]; if (!t) return;
    const dx = x - t.x, dy = y - t.y;
    const speed = Math.hypot(dx, dy);
    t.px = t.x; t.py = t.y; t.x = x; t.y = y;
    if (speed > 1) {
      const intensity = Math.min(1, speed / 15);
      this._addWrinkleAlong(t.px, t.py, x, y, intensity * 25);
      this.wrinkleIntensity = Math.min(1, this.wrinkleIntensity + intensity * 0.15);
      this.moveIntensity = intensity;
      this.lastMoveTime = Date.now();
      audio.playPaperCrinkle(intensity * 0.6 + 0.2);
      this._tryVibrate(Math.round(intensity * 15));
    }
  }

  removeTouch(id) { delete this.touches[id]; }

  _addWrinkle(x, y, radius) {
    const g = this.wrinkleGrid;
    const cx = Math.floor(x / g.cellSize), cy = Math.floor(y / g.cellSize);
    const r = Math.ceil(radius / g.cellSize);
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const gx = cx+dx, gy = cy+dy;
        if (gx<0||gx>=g.cols||gy<0||gy>=g.rows) continue;
        const d = Math.hypot(dx, dy);
        if (d>r) continue;
        this.wrinkleMap[gy*g.cols+gx] = Math.min(1, this.wrinkleMap[gy*g.cols+gx] + (1-d/r)*0.9 + Utils.rand(0,0.2));
      }
  }

  _addWrinkleAlong(x1,y1,x2,y2,radius) {
    const steps = Math.ceil(Utils.dist(x1,y1,x2,y2)/2);
    for (let i=0;i<=steps;i++)
      this._addWrinkle(Utils.lerp(x1,x2,i/steps)+Utils.rand(-2,2),Utils.lerp(y1,y2,i/steps)+Utils.rand(-2,2),radius*(0.5+Utils.rand(0,0.5)));
  }

  _tryVibrate(ms){if(window.vibrationEnabled&&navigator.vibrate)navigator.vibrate(ms);}

  doubleTap(x,y){
    if(this.wrinkleIntensity>0.3){
      this.wrinkleIntensity=Math.max(0,this.wrinkleIntensity-0.3);
      for(let i=0;i<this.wrinkleMap.length;i++)this.wrinkleMap[i]=Math.max(0,this.wrinkleMap[i]-0.3);
      audio.playPaperCrinkle(0.5);
    }
  }

  update(dt){
    this.time+=dt;
    if(Date.now()-this.lastMoveTime>2000&&this.wrinkleIntensity>0)this.wrinkleIntensity=Math.max(0,this.wrinkleIntensity-dt*0.005);
    this.moveIntensity*=0.92;
  }

  render() {
    const ctx=this.ctx,w=this.width,h=this.height,g=this.wrinkleGrid;
    const bgLit = 82 - this.wrinkleIntensity*12;
    const grad=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.6);
    grad.addColorStop(0,`hsl(38,12%,${bgLit+3}%)`);
    grad.addColorStop(1,`hsl(38,15%,${bgLit-10}%)`);
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);

    // visible paper noise
    ctx.save();ctx.globalAlpha=0.1;
    for(let i=0;i<200;i++)ctx.fillRect(Utils.rand(0,w),Utils.rand(0,h),2,2);
    ctx.restore();

    // Draw visible wrinkle cells
    if(this.wrinkleIntensity>0.01){
      for(let gy=0;gy<g.rows;gy++)
        for(let gx=0;gx<g.cols;gx++){
          const wVal=this.wrinkleMap[gy*g.cols+gx];
          if(wVal<0.05)continue;
          const x=gx*g.cellSize,y=gy*g.cellSize;
          const dk=Math.min(1,wVal*this.wrinkleIntensity*2);
          ctx.fillStyle=`hsla(30,10%,${Math.max(20,45-dk*35)}%,${dk*0.6+0.1})`;
          ctx.fillRect(x,y,g.cellSize,g.cellSize);
        }
    }

    // Hint
    if(this.wrinkleIntensity<0.01&&this.time<2){
      ctx.save();
      ctx.globalAlpha=Math.max(0,0.4*(1-this.time/2));
      ctx.fillStyle='hsla(30,15%,35%,0.6)';
      ctx.font='14px -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign='center';
      ctx.fillText('<-- 按住拖动揉搓 -->',w/2,h/2);
      ctx.restore();
    }

    // Vignette
    if(this.wrinkleIntensity>0.4){
      const vg=ctx.createRadialGradient(w/2,h/2,w*0.15,w/2,h/2,w*0.55);
      vg.addColorStop(0,'transparent');
      vg.addColorStop(1,`rgba(0,0,0,${(this.wrinkleIntensity-0.4)*0.5})`);
      ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
    }

    // big touch glow
    Object.values(this.touches).forEach(t=>{
      const glow=ctx.createRadialGradient(t.x,t.y,0,t.x,t.y,45);
      glow.addColorStop(0,'rgba(255,200,160,0.2)');
      glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow;ctx.fillRect(t.x-45,t.y-45,90,90);
    });
  }
  destroy(){}
}
