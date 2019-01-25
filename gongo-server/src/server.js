const WebSocket = require('ws');
const MongoClient = require('mongodb').MongoClient;
const Gongo = require('./gongo').Gongo;

/*
  TODO
    - heartbeats
 */

const handlers = {
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
          console.log('results', results);
          // this.send(cmd.sid, { type: 'sub-results', name: cmd.name, results });

          this.send(cmd.sid, { type: 'subscription-start', name: cmd.name });
          for (let row of results)
            this.send(cmd.sid, { type: 'insert', coll: collName, data: row });
          this.send(cmd.sid, { type: 'subscription-ready' });

          this.liveQueryOn(cmd, collName, query);
        });

      }
    } else {
      console.log('pub for invalid');
    }
  }
};

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
      if (err)
        throw err;

      this.db = this.mongoClient.db();
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
      cmd = JSON.parse(raw);
    } catch (e) {
      console.log(sid, raw);
      console.log(e);
      return;
    }

    cmd.ws = ws;
    cmd.sid = sid;

    const toLog = Object.assign({}, cmd);
    delete toLog.ws;
    console.log(toLog);

    if (handlers[cmd.type])
      handlers[cmd.type].call(this, cmd);
  }

  publish(name, func) {
    this.pubs[name] = func;
  }

  send(dest, raw) {
    const ws = typeof dest === 'number' ? this.sockets[dest] : dest;
    ws.send(JSON.stringify(raw));
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

    if (!cmd.ws.watching)
      cmd.ws.watching = [];
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
    console.log(change);

    if (change.operationType === 'insert') {
      this.sendToMatchingWatchers(coll, {
        type: 'insert',
        coll: coll,
        data: doc,
      });
    } else {
      console.log('unknown operation', change);
    }
  }

}

module.exports = { GongoServer };
