export default {

  insert(cmd) {
    this.collection(cmd.coll)._insert(cmd.doc);
  },

  delete(cmd) {
    // console.log(cmd);
    const strId = typeof cmd._id === 'string' ? cmd._id : cmd._id.toString();
    this.collection(cmd.coll)._remove(strId);
  },

  update(cmd) {
    // console.log(cmd);
    const strId = typeof cmd._id === 'string' ? cmd._id : cmd._id.toString();
    this.collection(cmd.coll)._update(strId, cmd.update);
  }

}
