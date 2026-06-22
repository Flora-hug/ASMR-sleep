const Storage = {
  KEYS: {
    SETTINGS: 'chumian_settings',
    PRESET: 'chumian_preset',
    FAVORITE: 'chumian_favorite',
    STATS: 'chumian_stats'
  },

  _get(key, def) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : def; }
    catch(e) { return def; }
  },

  _set(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
  },

  getSettings() { return this._get(this.KEYS.SETTINGS, { vibration: true, timerDefault: 15, nightMode: true }); },
  saveSettings(s) { this._set(this.KEYS.SETTINGS, s); },

  getPreset() { return this._get(this.KEYS.PRESET, 'rain'); },
  savePreset(n) { this._set(this.KEYS.PRESET, n); },

  getFavoriteScene() { return this._get(this.KEYS.FAVORITE, null); },
  saveFavoriteScene(n) { this._set(this.KEYS.FAVORITE, n); },

  getStats() { return this._get(this.KEYS.STATS, { todayMinutes:0, streak:0, totalMinutes:0, lastDate:'' }); },
  saveStats(s) { this._set(this.KEYS.STATS, s); }
};
