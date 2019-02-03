import ARSON from 'arson';
import sift from "sift";
import ObjectID from 'bson-objectid';
import { openDb, deleteDb } from 'idb';

import { Log } from './utils';
import handlers from './handlers';
import Subscription from './subscription';

// Expects similar code in gongo-server/server.js
ARSON.registerType('ObjectID', {
  deconstruct: objId => ObjectID.isValid(objId) && [objId.toJSON()],
  reconstruct: args => args && new ObjectID(args[0])
});

const log = new Log('gongo-client');

// Fix ObjectIDs after restore from IDB
function fixObjIds(obj) {
  Object.keys(obj).forEach(key => {
    // for now just top-level
    if (typeof obj[key] === 'object') {
      const keys = Object.keys(obj[key]);
      if (keys.length === 1 && keys[0] === 'id')
        obj[key] = new ObjectID(obj[key].id)
    }
  });
}

class Database {

  constructor(opts) {
    if (!opts)
      opts = {};

    this.name = opts.name || 'default';

    this.collections = new Map();
    this.wsQueue = [];

    // check options too
    this.subscriptions = {};

    this.idbIsOpen = false;
  }

  connect(url) {
    log.debug('Connecting to ' + url + '...');
    const ws = this.ws = new WebSocket(url);

    ws.onopen = () => {
      log.debug('Connected to ' + url);
      this.wsReady = true;
      this.wsQueue.forEach(msg => this.ws.send(ARSON.stringify(msg)));
      this.wsQueue = [];

      Object.values(this.subscriptions)
        .forEach(({ name }) => this.ws.send(ARSON.stringify({
          type: 'subscribe',
          name,
        })));
    }

    ws.onclose = () => {
      this.wsReady = false;
      log.warn('Disconnected from ' + url);
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

    if (this.subscriptions[name])
      return this.subscriptions[name];

    const sub = this.subscriptions[name] = new Subscription(this, name);

    this.send({
      type: 'subscribe',
      name: name,
    });

    return sub;
  }

  collection(name) {
    if (!this.collections.has(name))
      this.collections.set(name, new Collection(this, name));

    return this.collections.get(name);
  }

  idbCheckInit() {
    if (this.idbIsOpen)
      throw new Error("idb already open");
    else
      setTimeout( () => this.idbOpen(), 0 );
  }

  async idbOpen() {
    log.debug('Opening IDB "gongo" database');
    this.idbIsOpen = true;
    this.idbPromise = openDb('gongo', 1, upgradeDB => {
      log.info('Creating IDB "gongo" database');
      this.collections.forEach( (col,name) => upgradeDB.createObjectStore(name) );
    });

    const db = await this.idbPromise;
    this.collections.forEach( async (col, name) => {
      log.debug('Begin populating from IndexedDB of ' + name);
      const docs = await db.transaction(name).objectStore(name).getAll();
      docs.forEach(document => {
        fixObjIds(document);
        const strId = typeof document._id === 'string' ? document._id : document._id.toString();
        col.documents.set(strId, document);
      });
      log.debug('Finished populating from IndexedDB of ' + name);
    });
  }

}

class Collection {

  constructor(db, name) {
    this.db = db;
    this.name = name;
    this.documents = new Map();
    this.changestreams = [];
    this.pendingOps = [];
    this.persists = [];
  }

  toStrId(id) {
    return typeof id === 'string' ? id : id.toString();
  }

  persist(query) {
    this.persists.push(sift(query || {}));
    this.db.idbCheckInit();
  }

  shouldPersist(doc) {
    for (let query of this.persists) {
      if (query(doc))
        return true;
    }
    return false;
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

    if (this.shouldPersist(document))
      this.db.idbPromise.then(db => {
        const tx = db.transaction(this.name, 'readwrite');
        tx.objectStore(this.name)
          .put(this.idbPrepareDoc(document), this.toStrId(document._id));
        return tx.complete;
      });

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

    // always "persist" deletes
    this.db.idbPromise.then(db => {
      const tx = db.transaction(this.name, 'readwrite');
      tx.objectStore(this.name).delete(this.toStrId(newDoc._id));
      return tx.complete;
    });

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

    if (this.shouldPersist(newDoc))
      this.db.idbPromise.then(db => {
        const tx = db.transaction(this.name, 'readwrite');
        tx.objectStore(this.name)
          .put(this.idbPrepareDoc(newDoc), this.toStrId(newDoc._id));
        return tx.complete;
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

  idbPrepareDoc(_doc) {
    return _doc;
    /*
    const doc = Object.assign({}, _doc);
    doc._id = typeof doc._id === 'string' ? doc._id : doc._id.toString();
    return doc;
    */
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
