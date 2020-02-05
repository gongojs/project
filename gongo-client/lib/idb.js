const { openDB, deleteDB } = require('idb');
const { log } = require('./utils');

class GongoIDB {

  constructor(db) {
    this.db = db;
    // this.name = 'gongo';  TODO
  }

  delete() {
    deleteDB('gongo');
  }

  async put(collectionName, document) {
    const db = await this.idbPromise;
    return db.put(collectionName, document, document._id);
    /*
    this.db.idb.idbPromise.then(db => {
      const tx = db.transaction(this.name, 'readwrite');
      tx.objectStore(this.name)
        .put(this.idb.prepareDoc(document), this.toStrId(document._id));
      return tx.complete;
    });
    */
  }

  checkInit() {
    if (this.idbIsOpen)
      throw new Error("idb already open; TODO explain better when to call persist()");
    else if (this.openTimeout) {
      clearTimeout(this.openTimeout);
      this.openTimeout = setTimeout( () => this.open(), 0 );
    } else
      this.openTimeout = setTimeout( () => this.open(), 0 );
  }

  async open() {
    log.debug('Opening IDB "gongo" database');
    this.idbIsOpen = true;

    // idbDbVersion is (purposefully) undefined for initial open
    this.idbPromise = openDB('gongo', this.idbDbVersion, {
      upgrade: (db, oldVersion, newVersion, transaction) => {
        log.info('Upgrading IDB "gongo" database v' + this.idbDbVersion);
        console.log(db, oldVersion, newVersion, transaction);

        for (let name of db.objectStoreNames)
          if (!this.db.collections.has(name))
            db.deleteObjectStore(name);

        for (let [name] of this.db.collections)
          if (!db.objectStoreNames.contains(name))
            db.createObjectStore(name);
      }
    });

    this.idbPromise.catch(e => {
      console.log(e.message);
      throw e;
    })

    const db = await this.idbPromise;

    let upgradeNeeded = false;
    for (let name of db.objectStoreNames)
      if (!this.db.collections.has(name)) {
        upgradeNeeded = true;
        break;
      }

    if (!upgradeNeeded)
      for (let [name] of this.db.collections)
        if (!db.objectStoreNames.contains(name)) {
          upgradeNeeded = true;
          break;
        }

    if (upgradeNeeded) {
      this.idbDbVersion = db.version + 1;
      db.close();
      this.open();
      return;
    }

    for (let col of this.db.collections.values()) {
      log.debug('Begin populating from IndexedDB of ' + col.name);
      const docs = await db.getAll(col.name);
      docs.forEach(doc => {
        col.documents.set(doc._id, doc);
      });
      log.debug('Finished populating from IndexedDB of ' + col.name);
    }

    /*

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

      col.sendChanges('ready');

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

    */
  }

  prepareDoc(doc) {
    return doc;
  }

}

module.exports = { __esModule: true, default: GongoIDB };
