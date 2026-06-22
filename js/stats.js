const StatsModule = {
  _data: null,

  load() {
    this._data = Storage.getStats();
    return this._data;
  },

  save() { Storage.saveStats(this._data); },

  addSession(minutes) {
    if (minutes < 0.5) return;
    const s = this.load();
    const today = new Date().toDateString();
    if (s.lastDate !== today) {
      s.todayMinutes = 0;
      const y = new Date(Date.now()-86400000).toDateString();
      s.streak = (s.lastDate === y) ? s.streak + 1 : 1;
      s.lastDate = today;
    }
    s.todayMinutes += minutes;
    s.totalMinutes += minutes;
    this.save();
    this.render();
  },

  render() {
    if (!this._data) this.load();
    const s = this._data;
    document.getElementById('stats-today').textContent = Math.round(s.todayMinutes);
    document.getElementById('stats-streak').textContent = s.streak;
    document.getElementById('stats-total').textContent = Math.round(s.totalMinutes);
  }
};
