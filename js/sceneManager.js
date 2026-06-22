class SceneManager {
  constructor() {
    this.instances = {};
    this.classes = {};
    this.currentScene = null;
    this.currentName = null;
    this.canvas = document.getElementById('scene-canvas');
  }

  register(name, sceneClass) { this.classes[name] = sceneClass; }

  switchTo(name) {
    if (!this.instances[name]) {
      if (!this.classes[name]) return null;
      this.instances[name] = new this.classes[name](this.canvas);
    }
    this.currentScene = this.instances[name];
    this.currentName = name;
    return this.currentScene;
  }

  getCurrent() { return this.currentScene; }
  getName() { return this.currentName; }

  resize(w, h) { if(this.currentScene) this.currentScene.resize(w, h); }
  addTouch(id, x, y) { if(this.currentScene) this.currentScene.addTouch(id, x, y); }
  moveTouch(id, x, y) { if(this.currentScene) this.currentScene.moveTouch(id, x, y); }
  removeTouch(id) { if(this.currentScene) this.currentScene.removeTouch(id); }
  update(dt) { if(this.currentScene) this.currentScene.update(dt); }
  render() { if(this.currentScene) this.currentScene.render(); }

  reset() { if(this.currentScene && this.currentScene.reset) this.currentScene.reset(); }
  destroy() { this.currentScene = null; }
}
