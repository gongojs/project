const WebSocket = require('ws');
const MongoClient = require('mongodb').MongoClient;
const ARSON = require('arson');

const Gongo = require('./gongo').Gongo;
const handlers = require('./handlers');

const ObjectID = require('mongodb').ObjectID

// Expects similar code in gongo-client/gongo.js
ARSON.registerType('ObjectID', {
  deconstruct: objId => ObjectID.isValid(objId) && [objId.toJSON()],
  reconstruct: args => args && new ObjectID(args[0])
});

/*
  TODO
    - heartbeats
 */

class GongoServer {

  constructor(opts) {
    if (!opts)
      throw new Error("use new GongoServer(opts)");

    this.pubs = {};

    this.mongoUrl = opts.mongoUrl;
    this.mongoConnect();

    this.changeStreams = {};
    this.watchers = {};
  }

  mongoConnect() {
    this.mongoClient = new MongoClient(this.mongoUrl, { useNewUrlParser: true });
    this.mongoClient.connect(err => {
      if (err) {
        if (process.env.NODE_ENV === 'development'
            && err.message === 'no primary found in replicaset or invalid replica set name') {

              console.log(err.name + ': ' + err.message);
              console.log("As a convenience, we'll create one for you (since NODE_ENV=='development')");
              const url = this.mongoUrl.replace(/\?replicaSet=rs0$/, '');
              const client = new MongoClient(url, { useNewUrlParser: true });
              client.connect(err => {
                if (err) throw err;
                const db = client.db();
                const adminDb = db.admin();
                const conf = { _id: "rs0", members: [{_id: 0, host: "mongo:27017"}] };
                adminDb.command({ replSetInitiate: conf }, (err, info) => {
                  if (err) throw err;
                  if (info.ok) {
                    console.log("Success");
                    client.close();
                    setTimeout(() => this.mongoConnect(), 5000);
                  } else {
                    console.log(info);
                    throw new Error("Unexpected output from rs.initiate()");
                  }
                });
              });

              return;
        }
        throw err;
      }

      this.db = this.mongoClient.db();
      this.mongoObjectID = ObjectID;
    });

  }

  listen(port) {
    const wss = this.wss = new WebSocket.Server({
      port: port || 3000,
      // todo, compression, see notes in ws README
    });

    this.idCount = 0;
    this.sockets = [];

    wss.on('connection', ws => {
      const sid = this.idCount++;
      this.sockets.push(ws);

      ws.sid = sid;
      ws.watching = [];

      console.log('connection from ' + sid);

      ws.on('message', msg => {
        this.onMsg(ws, sid, msg);
        //console.log('msg', msg);
      });

      ws.on('close', () => {
        ws.watching.forEach(watchers => {
          watchers.watchers.delete(ws);
        })
      });
    });
  }

  onMsg(ws, sid, raw) {
    let cmd;
    try {
      cmd = ARSON.parse(raw);
    } catch (e) {
      console.log(sid, raw);
      console.log(e);
      return;
    }

    cmd.ws = ws;
    cmd.sid = sid;

    if (handlers[cmd.type])
      return handlers[cmd.type].call(this, cmd);

    delete cmd.ws;
    console.log("Unknown message", cmd);
  }

  publish(name, func) {
    this.pubs[name] = func;
  }

  send(dest, raw) {
    const ws = typeof dest === 'number' ? this.sockets[dest] : dest;
    ws.send(ARSON.stringify(raw));
  }

  liveQueryOn(cmd, coll, query) {
    if (!this.changeStreams[coll]) {
      this.changeStreams[coll] = this.db.collection(coll).watch(
        { $match: {} },
        { fullDocument: 'updateLookup' }
      );
      this.changeStreams[coll].on('change', this.onChange.bind(this));
    }

    if (!this.watchers[coll])
      this.watchers[coll] = {};

    const serializedQuery = JSON.stringify(query);
    if (!this.watchers[coll][serializedQuery])
      this.watchers[coll][serializedQuery] = { query, watchers: new Set() };

    this.watchers[coll][serializedQuery].watchers.add(cmd.ws);
    cmd.ws.watching.push(this.watchers[coll][serializedQuery]);
  }

  sendToMatchingWatchers(coll, obj) {
    for (let query of Object.values(this.watchers[coll])) {
      if (1 /* query.query is match TODO */) {
        query.watchers.forEach(ws => this.send(ws, obj));
      }
    }
  }

  onChange(change) {
    const doc = change.fullDocument;
    const { db, coll } = change.ns;
    const _id = change.documentKey._id;

    if (change.operationType === 'insert') {

      this.sendToMatchingWatchers(coll, {
        type: 'insert',
        coll: coll,
        doc: doc,
      });

    } else if (change.operationType === 'delete') {

      // TODO.  hmm.  should we recreate with __deleted?  warn?
      //console.log('onChange delete', coll, _id);
      this.sendToMatchingWatchers(coll, {
        type: 'delete',
        coll: coll,
        _id,
      });

    } else if (change.operationType === 'update') {

      //console.log('onChange update', coll, _id);
      this.sendToMatchingWatchers(coll, {
        type: 'update',
        coll: coll,
        _id,
        update: {
          $set: change.updateDescription.updatedFields,
          $unset: change.updateDescription.removedFields
        }
      });

    } else {

      console.log('unknown operation', change);

    }
  }

}

module.exports = { GongoServer };
