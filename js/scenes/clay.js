// clay.js - 捏泥巴 Scene (Enhanced)
class ClayScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.width = 0; this.height = 0;
    this.grid = null; this.gridW = 0; this.gridH = 0;
    this.cellSize = 5;
    this.touches = {}; this.time = 0; this.lastSoundTime = 0;
    this.tempGrid = null;
  }

  resize(w, h) {
    this.width = w; this.height = h;
    this.canvas.width = w * devicePixelRatio;
    this.canvas.height = h * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.gridW = Math.ceil(w / this.cellSize) + 1;
    this.gridH = Math.ceil(h / this.cellSize) + 1;
    this.grid = new Float32Array(this.gridW * this.gridH);
    this.tempGrid = new Float32Array(this.gridW * this.gridH);
    const cx = w/2, cy = h/2;
    const rx = w*0.35, ry = h*0.38;
    for (let gy=0; gy<this.gridH; gy++)
      for (let gx=0; gx<this.gridW; gx++) {
        const x=gx*this.cellSize, y=gy*this.cellSize;
        const dx=(x-cx)/rx, dy=(y-cy)/ry;
        const dist=Math.sqrt(dx*dx+dy*dy);
        this.grid[gy*this.gridW+gx] = dist<1 ? Math.max(0, (1-dist*dist)*(1-dist*0.4)) : 0;
      }
  }

  addTouch(id, x, y) {
    this.touches[id] = { x, y, px: x, py: y, pressDepth:0, active:true, startTime:Date.now() };
    this._deformClay(x, y, -0.4, 30);
    audio.playClayPress(0.3);
    this._tryVibrate(15);
  }

  moveTouch(id, x, y) {
    const t = this.touches[id]; if (!t) return;
    t.px=t.x; t.py=t.y; t.x=x; t.y=y;
    const speed = Utils.dist(x,y,t.px,t.py);
    const pressRadius = 22 + Math.min(speed*0.5, 10);
    this._deformClay(x, y, -0.3, pressRadius);
    if (speed > 3) {
      const dx=x-t.px, dy=y-t.py, len=Math.hypot(dx,dy)||1;
      this._dragClay(x,y,dx/len,dy/len,Math.min(1,speed/10)*0.2,pressRadius);
      const now=Date.now();
      if (now-this.lastSoundTime>100) {
        audio.playClayPress(Math.min(0.8, speed/15*0.5+0.2));
        this.lastSoundTime=now;
        this._tryVibrate(Math.round(Math.min(speed, 12)));
      }
    }
  }

  removeTouch(id) { delete this.touches[id]; }

  _deformClay(x,y,amount,radius) {
    const cx=Math.floor(x/this.cellSize), cy=Math.floor(y/this.cellSize);
    const r=Math.ceil(radius/this.cellSize);
    for (let dy=-r; dy<=r; dy++)
      for (let dx=-r; dx<=r; dx++) {
        const gx=cx+dx, gy=cy+dy;
        if (gx<1||gx>=this.gridW-1||gy<1||gy>=this.gridH-1) continue;
        const d=Math.hypot(dx*this.cellSize,dy*this.cellSize);
        if (d>radius) continue;
        const f=1-d/radius;
        this.grid[gy*this.gridW+gx] = Math.max(0, Math.min(1, this.grid[gy*this.gridW+gx] + amount*f*f));
      }
  }

  _dragClay(x,y,dirX,dirY,amount,radius) {
    const cx=Math.floor(x/this.cellSize), cy=Math.floor(y/this.cellSize);
    const r=Math.ceil(radius/this.cellSize);
    for (let dy=-r; dy<=r; dy++)
      for (let dx=-r; dx<=r; dx++) {
        const gx=cx+dx, gy=cy+dy;
        if (gx<2||gx>=this.gridW-2||gy<2||gy>=this.gridH-2) continue;
        const d=Math.hypot(dx*this.cellSize,dy*this.cellSize);
        if (d>radius) continue;
        const f=1-d/radius;
        const tgx=gx+Math.round(dirX*f*2), tgy=gy+Math.round(dirY*f*2);
        const ti=tgy*this.gridW+tgx;
        if (tgx>=0&&tgx<this.gridW&&tgy>=0&&tgy<this.gridH) {
          const transfer = this.grid[gy*this.gridW+gx]*amount*f;
          this.grid[gy*this.gridW+gx] -= transfer;
          this.grid[ti] = Math.min(1, this.grid[ti] + transfer);
        }
      }
  }

  _smoothClay(strength) {
    this.tempGrid.set(this.grid);
    for (let gy=1; gy<this.gridH-1; gy++)
      for (let gx=1; gx<this.gridW-1; gx++) {
        const idx=gy*this.gridW+gx;
        let sum=0, count=0;
        for (let dy=-1; dy<=1; dy++)
          for (let dx=-1; dx<=1; dx++) {
            if (dx===0&&dy===0) continue;
            sum+=this.tempGrid[(gy+dy)*this.gridW+(gx+dx)]; count++;
          }
        this.grid[idx] = Utils.lerp(this.grid[idx], sum/count, strength);
      }
  }

  _tryVibrate(ms) { if (window.vibrationEnabled && navigator.vibrate) navigator.vibrate(ms); }

  update(dt) {
    this.time += dt;
    if (Math.random() < 0.1) this._smoothClay(0.02);
    Object.values(this.touches).forEach(t => t.pressDepth = Math.min(1, t.pressDepth+dt*2));
  }

  render() {
    const ctx=this.ctx, w=this.width, h=this.height;
    if (w <= 0 || h <= 0) return;
    const bgGrad=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.7);
    bgGrad.addColorStop(0,'#2A2420'); bgGrad.addColorStop(1,'#1A1816');
    ctx.fillStyle=bgGrad; ctx.fillRect(0,0,w,h);
    for (let gy=1; gy<this.gridH-1; gy++)
      for (let gx=1; gx<this.gridW-1; gx++) {
        const height=this.grid[gy*this.gridW+gx];
        if (height<0.01) continue;
        const x=gx*this.cellSize, y=gy*this.cellSize;
        const hL=this.grid[gy*this.gridW+Math.max(0,gx-1)];
        const hR=this.grid[gy*this.gridW+Math.min(this.gridW-1,gx+1)];
        const hU=this.grid[Math.max(0,gy-1)*this.gridW+gx];
        const hD=this.grid[Math.min(this.gridH-1,gy+1)*this.gridW+gx];
        const nx=(hL-hR)*2, ny=(hU-hD)*2, nz=1;
        const nl=Math.sqrt(nx*nx+ny*ny+nz*nz);
        const dot=(nx*0.3-ny*0.5+nz*0.8)/nl;
        const diffuse=Math.max(0.15, dot*0.7+0.3);
        const depth=(1-height)*0.3;
        ctx.fillStyle='rgb('+Math.round((180-depth*50)*(diffuse+0.15))+','+Math.round((140-depth*40)*(diffuse+0.15))+','+Math.round((100-depth*30)*(diffuse+0.15))+')';
        ctx.fillRect(x,y,this.cellSize,this.cellSize);
      }
    Object.values(this.touches).forEach(t=>{
      const glow=ctx.createRadialGradient(t.x,t.y,0,t.x,t.y,35);
      glow.addColorStop(0,'rgba(255,200,160,0.08)');
      glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow; ctx.fillRect(t.x-35,t.y-35,70,70);
    });
  }destroy() {}
}
