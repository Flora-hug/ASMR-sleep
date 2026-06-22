render() {
    const ctx=this.ctx, w=this.width, h=this.height, g=this.wrinkleGrid;
    if (w <= 0 || h <= 0) return;
    
    // Smooth paper background gradient
    const bgLit = 82 - this.wrinkleIntensity * 8;
    const grad=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.6);
    grad.addColorStop(0, 'hsl(38,10%,'+(bgLit+2)+'%)');
    grad.addColorStop(1, 'hsl(38,15%,'+(bgLit-8)+'%)');
    ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);
    
    // Subtle paper grain (small noise dots)
    ctx.save();
    for(let i=0;i<300;i++){
      ctx.globalAlpha=0.04+Math.random()*0.06;
      ctx.fillStyle='hsl(38,8%,'+(40+Math.random()*20)+'%)';
      ctx.beginPath(); ctx.arc(Math.random()*w,Math.random()*h,1+Math.random()*2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    
    // Smooth wrinkle rendering using radial gradients at each wrinkle point
    if(this.wrinkleIntensity>0.01){
      ctx.save();
      for(let gy=0;gy<g.rows;gy+=1)
        for(let gx=0;gx<g.cols;gx+=1){
          const wVal=this.wrinkleMap[gy*g.cols+gx];
          if(wVal<0.08)continue;
          const cx=gx*g.cellSize+g.cellSize/2, cy=gy*g.cellSize+g.cellSize/2;
          const dk=Math.min(1,wVal*this.wrinkleIntensity*1.8);
          const radius = g.cellSize * (0.5 + dk * 1.2);
          const alpha = dk * 0.4 + 0.05;
          
          // Shadow gradient (dark crease)
          const sh = ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
          sh.addColorStop(0, 'hsla(30,8%,15%,'+alpha+')');
          sh.addColorStop(0.4, 'hsla(30,8%,25%,'+(alpha*0.6)+')');
          sh.addColorStop(1, 'transparent');
          ctx.fillStyle=sh; ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.fill();
          
          // Highlight (ridge edge) offset from shadow
          const angle = Utils.noise2D(gx*0.3+this.time*0.01, gy*0.3) * Math.PI;
          const hx = cx + Math.cos(angle)*radius*0.3;
          const hy = cy + Math.sin(angle)*radius*0.3;
          const hl = ctx.createRadialGradient(hx,hy,0,hx,hy,radius*0.5);
          hl.addColorStop(0, 'hsla(40,15%,75%,'+(alpha*0.4)+')');
          hl.addColorStop(1, 'transparent');
          ctx.fillStyle=hl; ctx.beginPath(); ctx.arc(hx,hy,radius*0.5,0,Math.PI*2); ctx.fill();
          
          // Connect adjacent wrinkles with curved lines
          if(dk>0.3 && gx>0 && gy>0){
            const prev = this.wrinkleMap[(gy-1)*g.cols+(gx-1)];
            if(prev>0.08){
              const px=(gx-1)*g.cellSize+g.cellSize/2, py=(gy-1)*g.cellSize+g.cellSize/2;
              ctx.strokeStyle='hsla(30,8%,20%,'+alpha*0.5+')';
              ctx.lineWidth=1.5+dk;
              ctx.beginPath();
              ctx.moveTo(px+Math.sin(angle)*3,py+Math.cos(angle)*3);
              ctx.quadraticCurveTo((px+cx)/2,(py+cy)/2-4,cx,cy);
              ctx.stroke();
            }
          }
        }
      ctx.restore();
    }
    
    // Hint text
    if(this.wrinkleIntensity<0.01&&this.time<2){
      ctx.save();
      ctx.globalAlpha=Math.max(0,0.4*(1-this.time/2));
      ctx.fillStyle='hsla(30,15%,35%,0.6)';
      ctx.font='15px -apple-system,"PingFang SC",sans-serif';
      ctx.textAlign='center';
      ctx.fillText('<-- 按住拖动揉搓 -->',w/2,h/2);
      ctx.restore();
    }
    
    // Vignette at high intensity
    if(this.wrinkleIntensity>0.4){
      const vg=ctx.createRadialGradient(w/2,h/2,w*0.12,w/2,h/2,w*0.55);
      vg.addColorStop(0,'transparent');
      vg.addColorStop(1,'rgba(0,0,0,'+((this.wrinkleIntensity-0.4)*0.4)+')');
      ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
    }
    
    // Touch glow
    Object.values(this.touches).forEach(t=>{
      const glow=ctx.createRadialGradient(t.x,t.y,0,t.x,t.y,50);
      glow.addColorStop(0,'rgba(255,200,160,0.12)');
      glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow; ctx.fillRect(t.x-50,t.y-50,100,100);
    });
  }render() {
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
