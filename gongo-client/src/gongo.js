import handlers from './handlers';

// https://stackoverflow.com/questions/10593337/is-there-any-way-to-create-mongodb-like-id-strings-without-mongodb
// TODO, rather use library
const ObjectId = (m = Math, d = Date, h = 16, s = s => m.floor(s).toString(h)) =>
  s(d.now() / 1000) + ' '.repeat(h).replace(/./g, () => s(m.random() * h));

class Database {

  constructor(opts) {
    if (!opts)
      opts = {};

    this.name = opts.name || 'default';

    this.collections = new Map();
    this.wsQueue = [];

    // check options too
    this.subscriptions = [];
  }

  connect(url) {
    console.log('connected to ' + url);
    const ws = this.ws = new WebSocket(url);

    ws.onopen = () => {
      this.wsReady = true;
      this.wsQueue.forEach(msg => this.ws.send(JSON.stringify(msg)));
      this.wsQueue = [];

      this.subscriptions.forEach(sub => this.ws.send(JSON.stringify({
        type: 'subscribe',
        name: sub,
      })))
    }

    ws.onclose = () => {
      this.wsReady = false;
      console.log('disconnected');
      // TODO, better reconnect stuff
      setTimeout(() => this.connect(url), 1000);
    };

    ws.onmessage = messageEvent => {
      let cmd;
      try {
        cmd = JSON.parse(messageEvent.data);
      } catch (e) {
        console.log(e);
        return;
      }

      if (handlers[cmd.type]) {
        handlers[cmd.type].call(this, cmd);
      } else {
        console.log('no handler for', cmd);
      }
    }

  }

  send(msg) {
    if (this.wsReady)
      this.ws.send(JSON.stringify(msg))
    else
      this.wsQueue.push(msg);
  }

  subscribe(name) {
    //console.log('subscribe', name);

    if (this.subscriptions.indexOf(name) !== -1)
      return;

    this.subscriptions.push(name);

    if (this.wsReady)
      this.send({
        type: 'subscribe',
        name: name,
      });
  }

  collection(name) {
    if (!this.collections.has(name))
      this.collections.set(name, new Collection(this, name));

    return this.collections.get(name);
  }

}

class Collection {

  constructor(db, name) {
    this.db = db;
    this.name = name;
    this.documents = new Map();
    this.changestreams = [];
    this.pendingOps = [];
  }

  find(query) {
    return new Cursor(this, query);
  }

  sendChanges(operationType, _id, data) {
    this.changestreams.forEach(cs => {
      cs.exec({
        operationType,
        ...data,
        ns: { db: this.db.name, coll: this.name },
        documentKey: { _id }
      })
    });
  }

  _insert(document) {
    if (!document._id)
      throw new Error('no doc._id ' + JSON.stringify(document));

    this.documents.set(document._id, document);
    this.sendChanges('insert', document._id, { fullDocument: document });
  }

  insert(document) {
    if (!document._id) {
      // Add _id, ensure it's first field in object
      document = { _id: ObjectId(), ...document };
    }

    const toSendDoc = Object.assign({}, document);

    document._pendingSince = Date.now();
    this._insert(document);

    this.db.send({
      type: 'insert',
      coll: this.name,
      doc: toSendDoc
    });
  }

  _remove(idOrSelector) {
    if (typeof idOrSelector === 'string') {

      const _id = idOrSelector;
      this.documents.delete(_id);
      this.sendChanges('delete', _id);

    } else if (typeof idOrSelector === 'object') {

      throw new Erro('remove by selector not supported yet');
    } else {
      throw new Error('remove called with invalid argument: '
        + JSON.stringify(idOrSelector));
    }
  }

  remove(idOrSelector) {
    this._remove(idOrSelector);
    this.db.send({
      type: 'remove',
      coll: this.name,
      query: idOrSelector
    });
  }

  _update(idOrSelector, newDocOrChanges) {
    const _id = idOrSelector;
    const oldDoc = this.documents.get(_id);

    // TODO think again about how to verify returned data
    if (!oldDoc)
      return;

    // XXX TODO
    const newDoc = { ...oldDoc, ...newDocOrChanges.$set };

    this.documents.set(_id, newDoc);
    this.sendChanges('update', _id, {
      updateDescription: {
        updatedFields: newDocOrChanges.$set,
        removedFields: []
      }
    });

    return newDoc;
  }

  update(idOrSelector, newDocOrChanges) {
    if (typeof idOrSelector === 'string') {

      const newDoc = this._update(idOrSelector, newDocOrChanges);
      this.db.send({
        type: 'update',
        coll: this.name,
        query: idOrSelector,
        update: newDocOrChanges
      });

    } else if (typeof idOrSelector === 'object') {

      throw new Erro('not supported yet');
    } else {
      throw new Error();
    }
  }

}

class Cursor {

  constructor(collection, query) {
    this.collection = collection;
  }

  toArray() {
    const out = [];
    for (let pair of this.collection.documents)
      out.push(pair[1]);
    return out;
  }

  watch() {
    return new ChangeStream(this);
  }

  sort() {
    return this;
  }

}

class ChangeStream {

  constructor(cursor) {
    this.cursor = cursor;
    this.cursor.collection.changestreams.push(this);
    this.callbacks = { change: [] };
  }

  on(event, callback) {
    this.callbacks[event].push(callback);
  }

  exec(obj) {
    this.callbacks.change.forEach(callback => callback(obj));
  }

}

const db = new Database();
export { Database };

export default db;
