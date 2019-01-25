export default {

  insert(cmd) {
    //console.log(cmd);
    this.collection(cmd.coll)._insert(cmd.doc);
  },

  delete(cmd) {
    // console.log(cmd);
    this.collection(cmd.coll)._remove(cmd._id);
  },

  update(cmd) {
    // console.log(cmd);
    this.collection(cmd.coll)._update(cmd._id, cmd.update);
  }

}
