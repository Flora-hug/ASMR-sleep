// utils.js - Math helpers & Perlin noise
const Utils = {
  lerp(a,b,t){return a+(b-a)*t},
  clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v))},
  dist(x1,y1,x2,y2){return Math.hypot(x2-x1,y2-y1)},
  rand(min,max){return Math.random()*(max-min)+min},
  randInt(min,max){return Math.floor(this.rand(min,max+1))},

  // Simple 2D value noise for textures
  _perm:[],
  _initPerm(){if(this._perm.length)return;const p=[];for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]]}this._perm=[...p,...p]},
  noise2D(x,y){this._initPerm();const p=this._perm;const ix=Math.floor(x)&255,iy=Math.floor(y)&255;const fx=x-Math.floor(x),fy=y-Math.floor(y);const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const aa=p[p[ix]+iy],ab=p[p[ix]+iy+1],ba=p[p[ix+1]+iy],bb=p[p[ix+1]+iy+1];const lerp=(a,b,t)=>a+t*(b-a);return lerp(lerp(aa,ba,u),lerp(ab,bb,u),v)/128-1},

  // Smoothstep
  smoothstep(t){return t*t*(3-2*t)},

  // Map value from one range to another
  map(val,inMin,inMax,outMin,outMax){return outMin+(val-inMin)*(outMax-outMin)/(inMax-inMin)},

  // Ease in-out
  easeInOut(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
};
