// sand.js - 拨沙画 Scene (Enhanced)
class SandScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.width = 0; this.height = 0;
    this.particles = [];
    this.touches = {};
    this.revealMap = [];
    this.revealW = 0; this.revealH = 0;
    this.time = 0;
    this.lastSoundTime = 0;
    this.bgGradient = null;
    this.patternCanvas = null;
  }

  resize(w, h) {
    this.width = w; this.height = h;
    this.canvas.width = w * devicePixelRatio;
    this.canvas.height = h * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.revealW = Math.ceil(w / 4);
    this.revealH = Math.ceil(h / 4);
    this.revealMap = new Float32Array(this.revealW * this.revealH);
    this._generatePattern(w, h);
    this._initParticles(w, h);
  }

  _generatePattern(w, h) {
    this.patternCanvas = document.createElement('canvas');
    this.patternCanvas.width = w; this.patternCanvas.height = h;
    const ptx = this.patternCanvas.getContext('2d');
    const grad = ptx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a3a'); grad.addColorStop(0.3, '#2a1a4a');
    grad.addColorStop(0.6, '#1a3a4a'); grad.addColorStop(1, '#0a2a3a');
    ptx.fillStyle = grad; ptx.fillRect(0, 0, w, h);

    ptx.save(); ptx.globalAlpha = 0.35;
    for (let i = 0; i < 50; i++) {
      const sx = Utils.rand(0, w), sy = Utils.rand(0, h*0.5), sr = Utils.rand(1, 3.5);
      ptx.beginPath(); ptx.arc(sx, sy, sr, 0, Math.PI*2);
      ptx.fillStyle = `hsla(${Utils.rand(35,55)}, 60%, 80%, ${Utils.rand(0.3,0.8)})`;
      ptx.fill();
    }
    const mx = w*0.75, my = h*0.2, mr = 30;
    ptx.beginPath(); ptx.arc(mx, my, mr, 0, Math.PI*2);
    ptx.fillStyle = 'hsla(40, 30%, 85%, 0.5)'; ptx.fill();
    ptx.beginPath(); ptx.arc(mx+8, my-5, mr*0.85, 0, Math.PI*2);
    ptx.fillStyle = '#1a3a4a'; ptx.fill();
    ptx.restore();
  }

  _initParticles(w, h) {
    this.particles = [];
    const count = Math.min(500, Math.floor(w * h / 1200));
    for (let i = 0; i < count; i++)
      this.particles.push({
        x: Utils.rand(0, w), y: Utils.rand(0, h),
        vx: 0, vy: 0,
        size: Utils.rand(2, 5),
        targetSize: Utils.rand(2, 5),
        color: `hsl(${Utils.randInt(35,50)}, ${Utils.randInt(15,30)}%, ${Utils.randInt(60,78)}%)`,
        alpha: Utils.rand(0.5, 0.95)
      });
  }

  addTouch(id, x, y) {
    this.touches[id] = { x, y, px: x, py: y, speed: 0 };
    this._clearSand(x, y, 30);
    audio.playSandSwish(0.3);
  }

  moveTouch(id, x, y) {
    const t = this.touches[id]; if (!t) return;
    t.px = t.x; t.py = t.y; t.x = x; t.y = y;
    t.speed = Utils.dist(x, y, t.px, t.py);
    this._pushParticles(x, y, t.px, t.py, t.speed);
    this._clearSand(x, y, 18 + Math.min(t.speed, 18));
    const now = Date.now();
    if (t.speed > 3 && now - this.lastSoundTime > 80) {
      audio.playSandSwish(Math.min(1, t.speed / 15));
      this.lastSoundTime = now;
      this._tryVibrate(Math.round(Math.min(t.speed, 8)));
    }
  }

  removeTouch(id) { delete this.touches[id]; }

  _pushParticles(x, y, px, py, speed) {
    const force = Math.min(1, speed/20) * 10;
    const dx = x-px, dy = y-py, len = Math.hypot(dx,dy)||1;
    const dirX = dx/len, dirY = dy/len;
    this.particles.forEach(p => {
      const d = Utils.dist(x, y, p.x, p.y);
      if (d < 70 && d > 0) {
        const strength = force * (1-d/70);
        p.vx += (dirX + Utils.rand(-0.3, 0.3)) * strength;
        p.vy += (dirY + Utils.rand(-0.3, 0.3)) * strength;
        p.size = p.targetSize * (1 + strength * 0.15);
      }
    });
  }

  _clearSand(x, y, radius) {
    const rx=Math.floor(x/4), ry=Math.floor(y/4), r=Math.ceil(radius/4);
    for (let dy=-r; dy<=r; dy++)
      for (let dx=-r; dx<=r; dx++) {
        const gx=rx+dx, gy=ry+dy;
        if (gx<0||gx>=this.revealW||gy<0||gy>=this.revealH) continue;
        if (Math.hypot(dx, dy)>r) continue;
        this.revealMap[gy*this.revealW+gx] = Math.min(1, this.revealMap[gy*this.revealW+gx] + (1-Math.hypot(dx,dy)/r) * 0.7);
      }
  }

  _tryVibrate(ms) { if (window.vibrationEnabled && navigator.vibrate) navigator.vibrate(ms); }

  update(dt) {
    this.time += dt;
    this.particles.forEach(p => {
      p.vx *= 0.92; p.vy *= 0.92;
      p.vy += 0.02; p.vx += Utils.rand(-0.05, 0.05); p.vy += Utils.rand(-0.05, 0.05);
      p.x += p.vx; p.y += p.vy;
      if (p.x<-10) p.x=this.width+10; if (p.x>this.width+10) p.x=-10;
      if (p.y<-10) p.y=this.height+10; if (p.y>this.height+10) p.y=-10;
      p.size = Utils.lerp(p.size, p.targetSize, 0.05);
    });
    for (let i=0; i<this.revealMap.length; i++)
      if (this.revealMap[i]>0) this.revealMap[i] = Math.max(0, this.revealMap[i] - dt*0.015);
  }

  render() {
    const ctx=this.ctx,w=this.width,h=this.height;
    if(w<=0||h<=0)return;
    ctx.drawImage(this.patternCanvas,0,0,w,h);
    ctx.save();ctx.globalAlpha=0.4;
    const sg=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.6);
    sg.addColorStop(0,'hsla(38,25%,50%,0.3)');sg.addColorStop(1,'hsla(38,18%,35%,0.5)');
    ctx.fillStyle=sg;ctx.fillRect(0,0,w,h);ctx.restore();
    
    this.particles.forEach(p=>{
      const rx=Math.floor(p.x/4),ry=Math.floor(p.y/4);
      let reveal=0;
      if(rx>=0&&rx<this.revealW&&ry>=0&&ry<this.revealH) reveal=this.revealMap[ry*this.revealW+rx];
      const alpha=Math.max(0.1,p.alpha*(1-reveal*0.85));
      if(alpha<0.02)return;
      const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size+3);
      grd.addColorStop(0,'hsla('+(35+Math.random()*15)+',25%,'+(62+Math.random()*18)+'%,'+alpha+')');
      grd.addColorStop(1,'transparent');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(p.x,p.y,p.size+3,0,Math.PI*2);ctx.fill();
    });
    
    Object.values(this.touches).forEach(t=>{
      const glow=ctx.createRadialGradient(t.x,t.y,0,t.x,t.y,50);
      glow.addColorStop(0,'rgba(255,220,180,0.12)');glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow;ctx.fillRect(t.x-50,t.y-50,100,100);
    });
  }  destroy() {}
}
