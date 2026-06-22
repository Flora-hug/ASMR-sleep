const Mixer = {
  init() {
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
        Storage.savePreset(btn.dataset.preset);
      });
    });

    document.getElementById('btn-vibration').addEventListener('click', () => {
      window.vibrationEnabled = !window.vibrationEnabled;
      document.getElementById('btn-vibration').classList.toggle('active', window.vibrationEnabled);
      const settings = Storage.getSettings();
      settings.vibration = window.vibrationEnabled;
      Storage.saveSettings(settings);
    });

    const panel = document.getElementById('mixer-panel');
    document.getElementById('mixer-handle').addEventListener('click', () => {
      panel.classList.toggle('open');
    });
  },

  resetMixer() {
    document.getElementById('mixer-ambient').value = 40;
    document.getElementById('mixer-atmosphere').value = 30;
    document.getElementById('mixer-interaction').value = 60;
    audio.setMixer(40, 30, 60);
  }
};
