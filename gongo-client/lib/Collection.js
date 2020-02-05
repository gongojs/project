const Cursor = require('./Cursor').default;
const sift = require('sift').default;

class Collection {

  constructor(db, name) {
    this.db = db;
    this.name = name;
    this.documents = new Map();
    this.persists = [];
  }

  toStrId(id) {
    return typeof id === 'string' ? id : id.toString();
  }

  find(query, options) {
    return new Cursor(this, query, options);
  }

  findOne(query) {
    if (typeof query === 'string')
      return this.documents.get(query);

    const matches = sift(query);
    for (let [id, doc] of this.documents) {
      if (matches(doc))
        return doc;
    }
    return null;
  }

  persist(query) {
    this.db.persistedQueriesExist = true;
    this.persists.push(sift(query || {}));
    this.db.idb.checkInit();
  }

  shouldPersist(doc) {
    for (let query of this.persists) {
      if (query(doc))
        return true;
    }
    return false;
  }

  /*
   * _funcs should
   *   - write to in-memory store (with objects), and
   *   - save to idb (in json)
   *   - notify (or not)
   */

  _insert(document) {
    if (!document._id)
      throw new Error('no doc._id ' + JSON.stringify(document));

    if (this.shouldPersist(document))
      this.db.idb.put(this.name, document);

    this.documents.set(document._id, document);
  }

  /*
   * non-(_)-funcs should
   *   - add _pending markups
   *   - call _funcs
   */

  insert(document) {
    document._pendingInsert = true;
    document._pendingSince = Date.now();
  }

  update(query) {
    //
      if (document._pendingSince) {

      } else {
        document._pendingSince = Date.now();
        document._orig = document;  // no, use JSON raw
      }
  }

}

module.exports = { __esModule: true, default: Collection };
