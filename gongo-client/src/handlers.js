export default {

  // --- data ---

  insert(cmd) {
    this.collection(cmd.coll)._insert(cmd.doc, true);
  },

  delete(cmd) {
    // console.log(cmd);
    const strId = typeof cmd._id === 'string' ? cmd._id : cmd._id.toString();
    this.collection(cmd.coll)._remove(strId, true);
  },

  update(cmd) {
    // console.log(cmd);
    const strId = typeof cmd._id === 'string' ? cmd._id : cmd._id.toString();
    this.collection(cmd.coll)._update(strId, cmd.update, true);
  },

  // --- subs ---

  sub_start(cmd) {
    // no-op for now
  },

  sub_ready(cmd) {
    // console.log(sub);
    const sub = this.subscriptions[cmd.name];
    sub.isReady = true;
    sub.exec('ready', cmd.name);
  }

}
