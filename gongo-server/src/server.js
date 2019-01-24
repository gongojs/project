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
      const collName = result.cursorState.cmd.find.split('.')[1];

      if (1 /* TODO isMongoCursor */) {
        // TODO, loop async?
        result.toArray((err, results) => {
          console.log('results', results);
          // this.send(cmd.sid, { type: 'sub-results', name: cmd.name, results });

          this.send(cmd.sid, { type: 'subscription-start', name: cmd.name });
          for (let row of results)
            this.send(cmd.sid, { type: 'insert', coll: collName, data: row });
          this.send(cmd.sid, { type: 'subscription-ready' });
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
      console.log('connection from ' + sid);

      ws.on('message', msg => {
        this.onMsg(sid, msg);
        //console.log('msg', msg);
      });
    });
  }

  onMsg(sid, raw) {
    let cmd;
    try {
      cmd = JSON.parse(raw);
    } catch (e) {
      console.log(sid, raw);
      console.log(e);
      return;
    }

    cmd.sid = sid;
    console.log(sid, cmd);

    if (handlers[cmd.type])
      handlers[cmd.type].call(this, cmd);
  }

  publish(name, func) {
    this.pubs[name] = func;
  }

  send(sid, raw) {
    const ws = this.sockets[sid];
    ws.send(JSON.stringify(raw));
  }

}

module.exports = { GongoServer };
