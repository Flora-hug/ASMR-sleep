// app.js - Main Application Controller
(function(){
  "use strict";

  // ===== STATE =====
  const state = {
    currentPage: 'home',
    currentScene: null,
    sceneInstances: { paper: null, sand: null, clay: null },
    timerMinutes: 0,
    timerRemaining: 0,
    timerInterval: null,
    timerActive: false,
    vibrationEnabled: true,
    sessionStartTime: null,
    mixerOpen: false,
    breathActive: false
  };

  // ===== STATS (localStorage) =====
  function loadStats() {
    try {
      const raw = localStorage.getItem('chumian_stats');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { todayMinutes:0, streak:0, totalMinutes:0, lastDate:'' };
  }
  function saveStats(stats) { localStorage.setItem('chumian_stats', JSON.stringify(stats)); }

  function renderStats(stats) {
    document.getElementById('stats-today').textContent = Math.round(stats.todayMinutes);
    document.getElementById('stats-streak').textContent = stats.streak;
    document.getElementById('stats-total').textContent = Math.round(stats.totalMinutes);
  }

  function addSessionTime(minutes) {
    const stats = loadStats();
    const today = new Date().toDateString();
    if (stats.lastDate !== today) {
      stats.todayMinutes = 0;
      const yesterday = new Date(Date.now()-86400000).toDateString();
      stats.streak = (stats.lastDate === yesterday) ? stats.streak+1 : 1;
      stats.lastDate = today;
    }
    stats.todayMinutes += minutes;
    stats.totalMinutes += minutes;
    saveStats(stats);
    renderStats(stats);
  }

  // ===== PAGE NAVIGATION =====
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    state.currentPage = pageId;
  }

  // ===== CANVAS SETUP =====
  const canvas = document.getElementById('scene-canvas');
  let currentSceneObj = null;

  function initCanvas() {
    const container = document.getElementById('scene-canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    return { w, h };
  }

  // ===== SCENE MANAGEMENT =====
  function enterScene(sceneName) {
    if (state.breathActive) stopBreath();
    showPage('scene');
    const { w, h } = initCanvas();
    state.currentScene = sceneName;
    const titles = { paper:'揉纸团', sand:'拨沙画', clay:'捏泥巴' };
    document.getElementById('scene-title').textContent = titles[sceneName] || sceneName;

    if (!state.sceneInstances[sceneName]) {
      switch(sceneName) {
        case 'paper': state.sceneInstances.paper = new PaperScene(canvas); break;
        case 'sand':  state.sceneInstances.sand  = new SandScene(canvas); break;
        case 'clay':  state.sceneInstances.clay  = new ClayScene(canvas); break;
      }
    }
    currentSceneObj = state.sceneInstances[sceneName];
    currentSceneObj.resize(w, h);

    audio.resume();
    audio.startAmbient('rain');
    audio.startAtmosphere();
    state.sessionStartTime = Date.now();

    document.getElementById('mixer-panel').classList.remove('open');
    state.mixerOpen = false;
    showPage('scene');
    startRenderLoop();
  }

  function exitScene() {
    stopTimer();
    if (state.breathActive) stopBreath();
    stopRenderLoop();
    audio.stopAll();
    currentSceneObj = null;
    if (state.sessionStartTime) {
      const elapsed = (Date.now() - state.sessionStartTime) / 60000;
      if (elapsed > 0.5) addSessionTime(elapsed);
      state.sessionStartTime = null;
    }
    showPage('home');
  }

  // ===== RENDER LOOP =====
  let animFrameId = null;
  let lastFrameTime = 0;

  function startRenderLoop() {
    lastFrameTime = performance.now();
    function loop(time) {
      const dt = Math.min((time - lastFrameTime) / 1000, 0.05);
      lastFrameTime = time;
      if (currentSceneObj) {
        if (state.timerActive && state.timerRemaining > 0) {
          state.timerRemaining -= dt;
          updateTimerDisplay();
          if (state.timerRemaining <= 0) { triggerTimerEnd(); return; }
        }
        currentSceneObj.update(dt);
        currentSceneObj.render();
      }
      animFrameId = requestAnimationFrame(loop);
    }
    loop(lastFrameTime);
  }

  function stopRenderLoop() {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  }

  // ===== TOUCH HANDLING =====
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!currentSceneObj) return;
    audio.resume();
    const rect = canvas.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(t => {
      currentSceneObj.addTouch(t.identifier, t.clientX - rect.left, t.clientY - rect.top);
    });
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!currentSceneObj) return;
    const rect = canvas.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(t => {
      currentSceneObj.moveTouch(t.identifier, t.clientX - rect.left, t.clientY - rect.top);
    });
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!currentSceneObj) return;
    Array.from(e.changedTouches).forEach(t => currentSceneObj.removeTouch(t.identifier));
  });
  canvas.addEventListener('touchcancel', (e) => {
    if (!currentSceneObj) return;
    Array.from(e.changedTouches).forEach(t => currentSceneObj.removeTouch(t.identifier));
  });

  // Double tap for paper un-ball
  let lastTap = { time:0, x:0, y:0 };
  canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left, y = t.clientY - rect.top;
    const now = Date.now();
    if (now - lastTap.time < 400 && Utils.dist(x,y,lastTap.x,lastTap.y) < 40) {
      if (currentSceneObj && typeof currentSceneObj.doubleTap === 'function') currentSceneObj.doubleTap(x,y);
    }
    lastTap = { time:now, x, y };
  });

  // Mouse fallback
  let mouseDown = false;
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    if (!currentSceneObj) return;
    audio.resume();
    const rect = canvas.getBoundingClientRect();
    currentSceneObj.addTouch('mouse', e.clientX - rect.left, e.clientY - rect.top);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!mouseDown || !currentSceneObj) return;
    const rect = canvas.getBoundingClientRect();
    currentSceneObj.moveTouch('mouse', e.clientX - rect.left, e.clientY - rect.top);
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    if (currentSceneObj) currentSceneObj.removeTouch('mouse');
  });
  canvas.addEventListener('mouseleave', () => {
    if (mouseDown && currentSceneObj) currentSceneObj.removeTouch('mouse');
    mouseDown = false;
  });

  // ===== TIMER =====
  function startTimer(minutes) {
    stopTimer();
    if (minutes <= 0) {
      document.getElementById('timer-countdown').classList.add('hidden');
      document.getElementById('timer-overlay').classList.add('hidden');
      return;
    }
    state.timerMinutes = minutes;
    state.timerRemaining = minutes * 60;
    state.timerActive = true;
    document.getElementById('timer-countdown').classList.remove('hidden');
    document.getElementById('timer-overlay').classList.remove('hidden');
    updateTimerDisplay();
  }
  function stopTimer() {
    state.timerActive = false;
    state.timerRemaining = 0;
  }
  function updateTimerDisplay() {
    const m = Math.floor(state.timerRemaining / 60);
    const s = Math.floor(state.timerRemaining % 60);
    document.getElementById('timer-display').textContent =
      String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }
  function triggerTimerEnd() {
    state.timerActive = false;
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

  // ===== BREATH GUIDE =====
  function startBreath() {
    state.breathActive = true;
    const overlay = document.getElementById('breath-overlay');
    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    overlay.classList.remove('hidden');
    audio.startBreath();
    let inhaling = true;
    circle.style.transform = 'scale(0.6)';
    text.textContent = '吸气';
    function cycle() {
      if (!state.breathActive) return;
      if (inhaling) {
        circle.style.transform = 'scale(1.3)';
        text.textContent = '吸气';
        setTimeout(() => {
          if (!state.breathActive) return;
          inhaling = false;
          circle.style.transform = 'scale(0.6)';
          text.textContent = '呼气';
          setTimeout(cycle, 4000);
        }, 4000);
      } else {
        inhaling = true;
        cycle();
      }
    }
    cycle();
  }
  function stopBreath() {
    state.breathActive = false;
    document.getElementById('breath-overlay').classList.add('hidden');
    audio.stopBreath();
  }

  // ===== EVENT BINDING =====
  function init() {
    window.vibrationEnabled = state.vibrationEnabled;

    document.querySelectorAll('.scene-card').forEach(card => {
      card.addEventListener('click', () => enterScene(card.dataset.scene));
    });
    document.getElementById('btn-back').addEventListener('click', exitScene);
    document.getElementById('btn-timer').addEventListener('click', () => {
      document.getElementById('timer-overlay').classList.remove('hidden');
    });
    document.querySelectorAll('.timer-opt').forEach(btn => {
      btn.addEventListener('click', () => startTimer(parseInt(btn.dataset.min)));
    });
    document.getElementById('timer-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget && !state.timerActive)
        document.getElementById('timer-overlay').classList.add('hidden');
    });

    const mixerPanel = document.getElementById('mixer-panel');
    document.getElementById('mixer-handle').addEventListener('click', () => {
      state.mixerOpen = !state.mixerOpen;
      mixerPanel.classList.toggle('open', state.mixerOpen);
    });
    document.getElementById('mixer-ambient').addEventListener('input', (e) => {
      audio.updateAmbientVolume(parseInt(e.target.value));
    });
    document.getElementById('mixer-atmosphere').addEventListener('input', (e) => {
      audio.updateAtmosphereVolume(parseInt(e.target.value));
    });
    document.getElementById('mixer-interaction').addEventListener('input', (e) => {
      audio.updateInteractionVolume(parseInt(e.target.value));
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        audio.startAmbient(btn.dataset.preset);
      });
    });

    document.getElementById('btn-reset').addEventListener('click', () => { if (currentSceneObj && typeof currentSceneObj.reset === 'function') currentSceneObj.reset(); });
    document.getElementById('btn-breath').addEventListener('click', startBreath);
    document.getElementById('btn-breath-close').addEventListener('click', stopBreath);
    document.getElementById('btn-vibration').addEventListener('click', () => {
      state.vibrationEnabled = !state.vibrationEnabled;
      window.vibrationEnabled = state.vibrationEnabled;
      document.getElementById('btn-vibration').classList.toggle('active', state.vibrationEnabled);
    });

    document.getElementById('btn-settings-nav').addEventListener('click', () => showPage('settings'));
    document.getElementById('btn-stats-nav').addEventListener('click', () => {
      renderStats(loadStats());
      showPage('stats');
    });
    document.getElementById('btn-settings-back').addEventListener('click', () => showPage('home'));
    document.getElementById('btn-stats-back').addEventListener('click', () => showPage('home'));

    document.getElementById('settings-vibration').addEventListener('change', (e) => {
      state.vibrationEnabled = e.target.checked;
      window.vibrationEnabled = state.vibrationEnabled;
      document.getElementById('btn-vibration').classList.toggle('active', state.vibrationEnabled);
    });
    document.getElementById('settings-timer').addEventListener('change', (e) => {
      if (state.currentPage === 'scene') startTimer(parseInt(e.target.value));
    });

    window.addEventListener('resize', () => {
      if (currentSceneObj && state.currentPage === 'scene') {
        const { w, h } = initCanvas();
        currentSceneObj.resize(w, h);
      }
    });

    renderStats(loadStats());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

