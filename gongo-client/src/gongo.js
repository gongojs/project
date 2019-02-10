import ARSON from 'arson';
import sift from "sift";
import ObjectID from 'bson-objectid';
import { openDb, deleteDb } from 'idb';
import modify from 'modifyjs';
import jsonpatch from 'fast-json-patch';

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
    this.idbIsLoaded = false;
    this.persistedQueriesExist = false;
  }

  getAts() {
    const rows = this.gongoStore.find({ type: 'updatedAt' }).toArraySync();
    const ats = {};
    rows.forEach(({ name, updatedAt }) => ats[name] = updatedAt);
    return ats;
  }

  sendSubscriptions() {
    log.debug("Sending subscriptions");
    Object.values(this.subscriptions)
      .forEach(({ name }) => this.ws.send(ARSON.stringify({
        type: 'subscribe',
        name,
        ats: this.getAts(),
      })));
  }

  sendPendingChanges() {
    log.debug("Sending pending changes");
    this.collections.forEach(coll => {
      if (coll.isLocalCollection)
        return;

      coll.find({ __pendingSince: { $exists: true }}, { includePendingDeletes: true })
        .toArraySync()
        .forEach(doc => {
          log.debug(doc);

          if (doc.__pendingInsert)
            this.wsSend({
              type: 'insert',
              coll: coll.name,
              doc
            });
          else if (doc.__pendingDelete)
            this.wsSend({
              type: 'remove',
              coll: coll.name,
              query: doc._id
            });
          else if (doc.__pendingBase) {
            const oldDoc = doc.__pendingBase;
            delete oldDoc._id;
            const newDoc = Object.assign({}, doc);
            delete newDoc._id;
            delete newDoc.__pendingBase;
            delete newDoc.__pendingSince;
            this.wsSend({
              type: 'patch',
              coll: coll.name,
              query: doc._id,
              patch: jsonpatch.compare(oldDoc, newDoc),
              since: doc.__pendingSince,
            });
          }
        });
    });
  }

  disconnect() {
    this.autoReconnect = false;
    this.ws.close();
  }

  connect(url) {
    if (url && !this.url)
      this.url = url;
    else if (this.url && !url)
      url = this.url;

    this.autoReconnect = true;

    log.debug('Connecting to ' + url + '...');
    const ws = this.ws = new WebSocket(url);

    ws.onopen = () => {
      log.debug('Connected to ' + url);
      this.wsReady = true;
      this.wsQueue.forEach(msg => this.ws.send(ARSON.stringify(msg)));
      this.wsQueue = [];

      if (this.persistedQueriesExist && !this.idbIsLoaded) {
        log.debug("Waiting for IDB to load before sending changes + subscriptions");
        return;
      }

      this.sendPendingChanges();
      this.sendSubscriptions();
    }

    ws.onclose = () => {
      this.wsReady = false;
      log.info('Disconnected from ' + url);

      // TODO, better reconnect stuff
      if (this.autoReconnect)
        setTimeout(() => this.connect(url), 1000);
    };

    ws.onmessage = messageEvent => {
      let cmd;
      try {
        cmd = ARSON.parse(messageEvent.data);
        log.debug('wsGet', cmd);
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

  wsSend(msg) {
    if (this.wsReady) {
      log.debug('wsSend', msg);
      this.ws.send(ARSON.stringify(msg))
    } else {
      throw new Error("should handle offline better");
      // this.wsQueue.push(msg);
    }
  }

  subscribe(name) {
    //console.log('subscribe', name);

    if (this.subscriptions[name])
      return this.subscriptions[name];

    const sub = this.subscriptions[name] = new Subscription(this, name);

    // don't queue this as this.sendSubscriptions called on every (re-)connect
    if (this.wsReady && !this.isLocalCollection)
      this.wsSend({
        type: 'subscribe',
        name: name,
        ats: this.getAts(),
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
      throw new Error("idb already open; TODO explain better when to call persist()");
    else if (this.idbOpenTimeout) {
      clearTimeout(this.idbOpenTimeout);
      this.idbOpenTimeout = setTimeout( () => this.idbOpen(), 0 );
    } else
      this.idbOpenTimeout = setTimeout( () => this.idbOpen(), 0 );
  }

  async idbOpen() {
    log.debug('Opening IDB "gongo" database');
    this.idbIsOpen = true;

    if (!this.idbDbVersion)
      this.idbDbVersion = 1;

    this.idbPromise = openDb('gongo', this.idbDbVersion, upgradeDB => {
      log.info('Upgrading IDB "gongo" database v' + this.idbDbVersion);

      for (let name of upgradeDB._db.objectStoreNames)
        if (!this.collections.has(name))
          upgradeDB.deleteObjectStore(name);

      for (let [name] of this.collections)
        if (!upgradeDB._db.objectStoreNames.contains(name))
          upgradeDB.createObjectStore(name);
    });

    const db = await this.idbPromise;

    let upgradeNeeded = false;
    for (let name of db.objectStoreNames)
      if (!this.collections.has(name)) {
        upgradeNeeded = true;
        break;
      }

    if (!upgradeNeeded)
      for (let [name] of this.collections)
        if (!db.objectStoreNames.contains(name)) {
          upgradeNeeded = true;
          break;
        }

    if (upgradeNeeded) {
      this.idbDbVersion = db.version + 1;
      db.close();
      this.idbOpen();
      return;
    }

    window.db = db;

    let i = 0;
    this.collections.forEach( async (col, name) => {
      log.debug('Begin populating from IndexedDB of ' + name);
      const docs = await db.transaction(name).objectStore(name).getAll();
      docs.forEach(document => {
        fixObjIds(document);
        const strId = typeof document._id === 'string' ? document._id : document._id.toString();
        col.documents.set(strId, document);
      });
      log.debug('Finished populating from IndexedDB of ' + name);

      if (++i === this.collections.size) {
        this.idbIsLoaded = true;
        log.debug('Finished populating from IndexedDB of all collections');

        const existing = this.gongoStore.find({ type: 'updatedAt' })
          .toArraySync().map(row => row.name);

        for (let [name, coll] of this.collections) {
          if (!coll.isLocalCollection && !existing.includes(name)) {
            this.gongoStore.insert({
              type: 'updatedAt',
              name: name,
              updatedAt: new Date(0)
            });
          }
        }

        this.sendPendingChanges();
        this.sendSubscriptions();
      }
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
    this.db.persistedQueriesExist = true;
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

  find(query, options) {
    return new Cursor(this, query, options);
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

    document.__pendingInsert = true;
    document.__pendingSince = Date.now();
    this._insert(document);

    if (this.db.wsReady && !this.isLocalCollection)
      this.db.wsSend({
        type: 'insert',
        coll: this.name,
        doc: toSendDoc
      });

    return toSendDoc;
  }

  _remove(_id, fromServer) {
    if (typeof _id !== 'string')
      throw new Error("_remove(_id) expects a string id only, not: "
        + JSON.stringify(_id));

    // actual delete vs pending delete
    if (fromServer) {

      if (!this.documents.has(_id))
        return;

      this.documents.delete(_id);

      // always "persist" deletes, regardless of persist query
      this.db.idbPromise.then(db => {
        const tx = db.transaction(this.name, 'readwrite');
        tx.objectStore(this.name).delete(this.toStrId(_id));
        return tx.complete;
      });

      // TODO, different event than "update" for this case?
      this.sendChanges('update', _id);

    } else {

      const doc = this.documents.get(_id);
      doc.__pendingDelete = true;
      doc.__pendingSince = Date.now();

      this.db.idbPromise.then(db => {
        const tx = db.transaction(this.name, 'readwrite');
        tx.objectStore(this.name)
          .put(this.idbPrepareDoc(doc), this.toStrId(_id));
        return tx.complete;
      });

      this.sendChanges('delete', _id);

    }

  }

  remove(idOrSelector) {
    if (typeof idOrSelector === 'string') {

      this._remove(idOrSelector);
      if (this.db.wsReady && !this.isLocalCollection)
        this.db.wsSend({
          type: 'remove',
          coll: this.name,
          query: idOrSelector
        });

    } else if (typeof idOrSelector === 'object') {

      const query = sift(idOrSelector);
      for (let [id, doc] of this.documents) {
        if (query(doc)) {
          this._remove(id);
          if (this.db.wsReady && !this.isLocalCollection)
            this.db.wsSend({
              type: 'remove',
              coll: this.name,
              query: id
            });
        }
      }

    } else {

      throw new Error('remove() called with invalid argument: '
        + JSON.stringify(idOrSelector));

    }
  }

  _update(strId, newDocOrChanges) {
    if (typeof strId !== 'string')
      throw new Error("_update(id, ...) expects string id, not " + JSON.stringify(strId));

    const oldDoc = this.documents.get(strId);

    if (!oldDoc)
      throw new Error("updateId(id, ...) called with id with no matches " + strId);

    const newDoc = modify(oldDoc, newDocOrChanges);
    fixObjIds(newDoc);

    // TODO, bail on no actual changes
    // return false;

    // allow multiple updates
    if (!newDoc.__pendingSince) {
      newDoc.__pendingSince = Date.now();
      newDoc.__pendingBase = oldDoc;
    }

    this.documents.set(strId, newDoc);
    this.sendChanges('update', newDoc._id, {
      updateDescription: {
        updatedFields: newDocOrChanges.$set,
        removedFields: []
      }
    });

    if (this.shouldPersist(newDoc))
      this.db.idbPromise.then(db => {
        const tx = db.transaction(this.name, 'readwrite');
        tx.objectStore(this.name)
          .put(this.idbPrepareDoc(newDoc), strId);
        return tx.complete;
      });

    if (this.wsReady && !this.isLocalCollection)
      this.db.wsSend({
        type: 'update',
        coll: this.name,
        query: strId,
        update: newDocOrChanges
      });

    return newDoc;
  }

  update(idOrSelector, newDocOrChanges) {
    if (typeof idOrSelector === 'string') {

      return this._update(idOrSelector, newDocOrChanges);

    } else if (typeof idOrSelector === 'object') {

      const query = sift(idOrSelector);

      const updatedDocIds = [];
      let matchedCount = 0;
      let modifiedCount = 0;

      for (let [id, doc] of this.documents)
        if (query(doc)) {
          matchedCount++;
          if (this._update(id, newDocOrChanges)) {
            modifiedCount++;
            updatedDocIds.push(id);
          };
        }
      return {
        matchedCount,
        modifiedCount,
        __updatedDocsIds: updatedDocIds,
      };

    } else {
      throw new Error();
    }
  }

  upsert(query, doc) {
    // TODO use count() when avaialble
    const existing = this.find(query).toArraySync();
    if (existing) {
      this.update(query, { $set: doc });
    } else {
      this.insert(doc);
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

  constructor(collection, query, options) {
    this.collection = collection;

    if (!query)
      query = {};
    if (!options)
      options = {};

    if (!options.includePendingDeletes)
      query.__pendingDelete = { $exists: false };

    this._query = query;
    this.query = sift(query);
  }

  toArray() {
    return new Promise((resolve, reject) => {
      resolve(this.toArraySync());
    });
  }

  toArraySync() {
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
db.gongoStore = db.collection('__gongo');
db.gongoStore.isLocalCollection = true;
db.gongoStore.persist({});

export { Database };

export default db;
