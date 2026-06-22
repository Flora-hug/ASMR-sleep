(function(){
  "use strict";

  const state = {
    currentPage: 'home',
    sessionStartTime: null
  };

  const sceneManager = new SceneManager();
  sceneManager.register('paper', PaperScene);
  sceneManager.register('sand', SandScene);
  sceneManager.register('clay', ClayScene);

  const canvas = document.getElementById('scene-canvas');

  function initCanvas() {
    const container = document.getElementById('scene-canvas-container');
    const w = container.clientWidth, h = container.clientHeight;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    return { w, h };
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    state.currentPage = pageId;
  }

  function enterScene(sceneName) {
    if (BreathGuide.isActive()) BreathGuide.stop();
    showPage('scene');
    const { w, h } = initCanvas();
    const titles = { paper:'揉纸团', sand:'拨沙画', clay:'捏泥巴' };
    document.getElementById('scene-title').textContent = titles[sceneName] || sceneName;

    const scene = sceneManager.switchTo(sceneName);
    if (scene) scene.resize(w, h);

    audio.resume();
    audio.startAmbient(Storage.getPreset());
    audio.startAtmosphere();
    state.sessionStartTime = Date.now();
    document.getElementById('mixer-panel').classList.remove('open');
    startRenderLoop();
  }

  function exitScene() {
    Timer.stop();
    if (BreathGuide.isActive()) BreathGuide.stop();
    stopRenderLoop();
    audio.stopAll();
    if (state.sessionStartTime) {
      StatsModule.addSession((Date.now() - state.sessionStartTime) / 60000);
      state.sessionStartTime = null;
    }
    sceneManager.destroy();
    showPage('home');
  }

  let animFrameId = null;
  let lastFrameTime = 0;

  function startRenderLoop() {
    lastFrameTime = performance.now();
    function loop(time) {
      const dt = Math.min((time - lastFrameTime) / 1000, 0.05);
      lastFrameTime = time;
      if (sceneManager.getCurrent()) {
        Timer.tick(dt);
        sceneManager.update(dt);
        sceneManager.render();
      }
      animFrameId = requestAnimationFrame(loop);
    }
    loop(lastFrameTime);
  }

  function stopRenderLoop() {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  }

  function triggerTimerEnd() {
    const container = document.getElementById('scene-canvas-container');
    container.style.transition = 'opacity 3s ease';
    container.style.opacity = '0';
    if (audio.ctx) audio.masterGain.gain.setTargetAtTime(0.01, audio.ctx.currentTime, 2);
    setTimeout(() => {
      container.style.opacity = '1';
      container.style.transition = '';
      if (audio.ctx) audio.masterGain.gain.value = 0.6;
      exitScene();
    }, 3500);
  }

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!sceneManager.getCurrent()) return;
    audio.resume();
    const r = canvas.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(t => sceneManager.addTouch(t.identifier, t.clientX - r.left, t.clientY - r.top));
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!sceneManager.getCurrent()) return;
    const r = canvas.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(t => sceneManager.moveTouch(t.identifier, t.clientX - r.left, t.clientY - r.top));
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!sceneManager.getCurrent()) return;
    Array.from(e.changedTouches).forEach(t => sceneManager.removeTouch(t.identifier));
  });
  canvas.addEventListener('touchcancel', (e) => {
    if (!sceneManager.getCurrent()) return;
    Array.from(e.changedTouches).forEach(t => sceneManager.removeTouch(t.identifier));
  });

  let mouseDown = false;
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    if (!sceneManager.getCurrent()) return;
    audio.resume();
    const r = canvas.getBoundingClientRect();
    sceneManager.addTouch('mouse', e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!mouseDown || !sceneManager.getCurrent()) return;
    const r = canvas.getBoundingClientRect();
    sceneManager.moveTouch('mouse', e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    if (sceneManager.getCurrent()) sceneManager.removeTouch('mouse');
  });
  canvas.addEventListener('mouseleave', () => {
    if (mouseDown && sceneManager.getCurrent()) sceneManager.removeTouch('mouse');
    mouseDown = false;
  });

  let lastTap = { time:0, x:0, y:0 };
  canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const r = canvas.getBoundingClientRect();
    const x = t.clientX - r.left, y = t.clientY - r.top, now = Date.now();
    if (now - lastTap.time < 400 && Utils.dist(x,y,lastTap.x,lastTap.y) < 40) {
      const cur = sceneManager.getCurrent();
      if (cur && typeof cur.doubleTap === 'function') cur.doubleTap(x,y);
    }
    lastTap = { time:now, x, y };
  });

  function init() {
    const settings = Storage.getSettings();
    window.vibrationEnabled = settings.vibration;

    Timer.init(document.getElementById('timer-display'));
    StatsModule.load();
    StatsModule.render();

    const savedPreset = Storage.getPreset();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === savedPreset));

    document.querySelectorAll('.scene-card').forEach(card => card.addEventListener('click', () => enterScene(card.dataset.scene)));
    document.getElementById('btn-back').addEventListener('click', exitScene);
    document.getElementById('btn-settings-nav').addEventListener('click', () => showPage('settings'));
    document.getElementById('btn-stats-nav').addEventListener('click', () => { StatsModule.render(); showPage('stats'); });
    document.getElementById('btn-settings-back').addEventListener('click', () => showPage('home'));
    document.getElementById('btn-stats-back').addEventListener('click', () => showPage('home'));

    document.getElementById('btn-timer').addEventListener('click', () => document.getElementById('timer-overlay').classList.remove('hidden'));
    document.querySelectorAll('.timer-opt').forEach(btn => btn.addEventListener('click', () => Timer.start(parseInt(btn.dataset.min), triggerTimerEnd)));
    document.getElementById('timer-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget && !Timer.isActive()) document.getElementById('timer-overlay').classList.add('hidden');
    });

    Mixer.init();
    document.getElementById('btn-reset').addEventListener('click', () => sceneManager.reset());
    document.getElementById('btn-breath').addEventListener('click', () => BreathGuide.start());
    document.getElementById('btn-breath-close').addEventListener('click', () => BreathGuide.stop());

    document.getElementById('settings-vibration').addEventListener('change', (e) => {
      window.vibrationEnabled = e.target.checked;
      const s = Storage.getSettings();
      s.vibration = window.vibrationEnabled;
      Storage.saveSettings(s);
    });
    document.getElementById('settings-timer').addEventListener('change', (e) => {
      if (state.currentPage === 'scene') Timer.start(parseInt(e.target.value), triggerTimerEnd);
    });

    window.addEventListener('resize', () => {
      if (sceneManager.getCurrent() && state.currentPage === 'scene') {
        const { w, h } = initCanvas();
        sceneManager.resize(w, h);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
