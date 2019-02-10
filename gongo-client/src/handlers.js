export default {

  // TODO.  do we need to store updatedAt per query??  what if we have two
  // subscriptions/queries on same collection, will we have wrong updatedAt
  // for them if they don't overlap.

  // --- data ---

  insert(cmd) {
    this.collection(cmd.coll)._insert(cmd.doc, true);

    if (cmd.doc.__updatedAt)
      this.gongoStore.update(
        { type: 'updatedAt', name: cmd.coll },
        { $set: { updatedAt: cmd.doc.__updatedAt }}
      );
  },

  delete(cmd) {
    // console.log(cmd);
    const strId = typeof cmd._id === 'string' ? cmd._id : cmd._id.toString();
    this.collection(cmd.coll)._remove(strId, true);

    if (cmd.updatedAt)
      this.gongoStore.update(
        { type: 'updatedAt', name: cmd.coll },
        { $set: { updatedAt: cmd.updatedAt }}
      );
  },

  update(cmd) {
    // console.log(cmd);
    const strId = typeof cmd._id === 'string' ? cmd._id : cmd._id.toString();
    this.collection(cmd.coll)._update(strId, cmd.update, true);

    if (cmd.doc.__updatedAt)
      this.gongoStore.update(
        { type: 'updatedAt', name: cmd.coll },
        { $set: { updatedAt: cmd.doc.__updatedAt }}
      );
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
