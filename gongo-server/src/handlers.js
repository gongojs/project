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
    this.db.collection(cmd.coll).insertOne(cmd.doc);
    console.log('insert', cmd.coll, cmd.doc);
  }

};
