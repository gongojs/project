class ChangeStream {

  constructor() {
    this.callbacks = { change: [] };
  }

  on(event, callback) {
    this.callbacks[event].push(callback);
  }

  exec(obj) {
    this.callbacks.change.forEach(callback => callback(obj));
  }

}

module.exports = { __esModule: true, default: ChangeStream };
