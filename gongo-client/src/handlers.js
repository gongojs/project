export default {

  insert(cmd) {
    this.collection(cmd.coll)._insert(cmd.data);
  }

}
