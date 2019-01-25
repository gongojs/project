module.exports = {

  subscribe(cmd) {
    console.log(cmd.name, this.pubs);

    if (this.pubs[cmd.name]) {
      const result = this.pubs[cmd.name](this.db);
      const mCmd = result.cursorState.cmd;
      const [ dbName, collName ] = mCmd.find.split('.');
      const query = mCmd.query;

      if (1 /* TODO isMongoCursor */) {
        // TODO, getNext async loop?
        result.toArray((err, results) => {
          // console.log('results', results);
          this.send(cmd.sid, { type: 'subscription-start', name: cmd.name });
          for (let row of results)
            this.send(cmd.sid, { type: 'insert', coll: collName, doc: row });
          this.send(cmd.sid, { type: 'subscription-ready' });

          this.liveQueryOn(cmd, collName, query);
        });

      }
    } else {
      console.log('pub for invalid');
    }
  },

  insert(cmd) {
    delete cmd.doc._pendingSince;
    cmd.doc._id = this.mongoObjectID(cmd.doc._id);
    // console.log('insert', cmd.coll, cmd.doc);
    this.db.collection(cmd.coll).insertOne(cmd.doc);
  },

  remove(cmd) {
    if (typeof cmd.query === 'string')
      cmd.query = { _id: this.mongoObjectID(cmd.query) };

    // console.log('remove', cmd.coll, cmd.query);
    this.db.collection(cmd.coll).removeMany(cmd.query);
  },

  update(cmd) {
    if (typeof cmd.query === 'string')
      cmd.query = { _id: this.mongoObjectID(cmd.query) };

    // console.log('update', cmd.coll, cmd.query);
    this.db.collection(cmd.coll).updateMany(cmd.query, cmd.update);
  }

};
