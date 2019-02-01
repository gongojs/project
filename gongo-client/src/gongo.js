import ARSON from 'arson';
import sift from "sift";
import ObjectID from 'bson-objectid';

import handlers from './handlers';

// Expects similar code in gongo-server/server.js
ARSON.registerType('ObjectID', {
  deconstruct: objId => ObjectID.isValid(objId) && [objId.toJSON()],
  reconstruct: args => args && new ObjectID(args[0])
});

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
      this.wsQueue.forEach(msg => this.ws.send(ARSON.stringify(msg)));
      this.wsQueue = [];

      this.subscriptions.forEach(sub => this.ws.send(ARSON.stringify({
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
        cmd = ARSON.parse(messageEvent.data);
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
      this.ws.send(ARSON.stringify(msg))
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

    const strId = typeof document._id === 'string' ? document._id : document._id.toString();
    this.documents.set(strId, document);
    this.sendChanges('insert', document._id, { fullDocument: document });
  }

  insert(document) {
    if (!document._id) {
      // Add _id, ensure it's first field in object
      document = { _id: new ObjectID(), ...document };
    }

    const toSendDoc = Object.assign({}, document);

    document._pendingSince = Date.now();
    this._insert(document);

    this.db.send({
      type: 'insert',
      coll: this.name,
      doc: toSendDoc
    });

    return toSendDoc;
  }

  _remove(_id) {
    if (typeof _id !== 'string')
      throw new Error("_remove(_id) expects a string id only, not: "
        + JSON.stringify(_id));

    this.documents.delete(_id);
    this.sendChanges('delete', _id);
  }

  remove(idOrSelector) {
    if (typeof idOrSelector === 'string') {

      this._remove(idOrSelector);
      this.db.send({
        type: 'remove',
        coll: this.name,
        query: idOrSelector
      });

    } else if (typeof idOrSelector === 'object') {

      const query = sift(idOrSelector);
      for (let pair of this.documents) {
        if (query(pair[1])) {
          this._remove(pair[0]);
          this.db.send({
            type: 'remove',
            coll: this.name,
            query: pair[0]
          });
        }
      }

    } else {

      throw new Error('remove() called with invalid argument: '
        + JSON.stringify(idOrSelector));

    }
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

      const query = sift(idOrSelector);
      for (let pair of this.documents)
        if (query(pair[1])) {
          const newDoc = this._update(pair[0], newDocOrChanges);
          this.db.send({
            type: 'update',
            coll: this.name,
            query: pair[0],
            update: newDocOrChanges
          });
        }

    } else {
      throw new Error();
    }
  }

}

class Cursor {

  constructor(collection, query) {
    this.collection = collection;
    this._query = query;
    this.query = sift(query || {});
  }

  toArray() {
    const out = [];
    for (let pair of this.collection.documents)
      if (this.query(pair[1]))
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
