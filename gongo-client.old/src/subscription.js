class Subscription {

  constructor(gongo, name) {
    this.gongo = gongo;
    this.name = name;
    this.isReady = false;
    this.events = { ready: [] };
  }

  on(event, callback) {
    this.events[event].push(callback);
  }

  exec(event, ...args) {
    this.events[event].forEach(callback => callback.apply(this,args));
  }

  stop() {
    console.log("TODO subscription stop");
    //delete this.gongo.subscriptions[this.name];
  }
}

export default Subscription;
