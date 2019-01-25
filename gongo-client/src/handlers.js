export default {

  insert(cmd) {
    //console.log(cmd);
    this.collection(cmd.coll)._insert(cmd.doc);
  }

}
