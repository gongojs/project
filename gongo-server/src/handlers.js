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
          this.send(cmd.sid, { type: 'sub_start', name: cmd.name });

          for (let row of results) {
            if (row.__deleted)
              this.send(cmd.sid, { type: 'delete', coll: collName, _id: row._id });
            else
              this.send(cmd.sid, { type: 'insert', coll: collName, doc: row });
          }

          this.send(cmd.sid, { type: 'sub_ready', name: cmd.name });

          this.liveQueryOn(cmd, collName, query);
        });

      }
    } else {
      console.log('pub for invalid');
    }
  },

  insert(cmd) {
    delete cmd.doc.__pendingInsert;
    delete cmd.doc.__pendingSince;
    // console.log('insert', cmd.coll, cmd.doc);
    this.db.collection(cmd.coll).insertOne(cmd.doc);
  },

  remove(cmd) {
    if (typeof cmd.query === 'string')
      cmd.query = { _id: this.mongoObjectID(cmd.query) };
    else if (cmd.query instanceof this.mongoObjectID)
      cmd.query = { _id: cmd.query };

    // console.log('remove', cmd.coll, cmd.query);

    // this.db.collection(cmd.coll).removeMany(cmd.query);
    this.db.collection(cmd.coll).updateOne(cmd.query, {
      $set: { __deleted: true }
    });
  },

  update(cmd) {
    if (typeof cmd.query === 'string')
      cmd.query = { _id: this.mongoObjectID(cmd.query) };

    // console.log('update', cmd.coll, cmd.query);
    this.db.collection(cmd.coll).updateMany(cmd.query, cmd.update);
  }

};
