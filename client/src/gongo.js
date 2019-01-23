// https://stackoverflow.com/questions/10593337/is-there-any-way-to-create-mongodb-like-id-strings-without-mongodb
// TODO, rather use library
const ObjectId = (m = Math, d = Date, h = 16, s = s => m.floor(s).toString(h)) =>
  s(d.now() / 1000) + ' '.repeat(h).replace(/./g, () => s(m.random() * h));

class Database {

  constructor() {
    this.name = 'default';
    this.collections = new Map();
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
    this.documents = [];
    this.changestreams = [];
  }

  find(query) {
    return new Cursor(this, query);
  }

  _insert(document) {
    if (!document._id)
      throw new Error('no doc._id ' + JSON.stringify(document));

    // TODO, insert in order (sort by _id)
    this.documents.push(document);

    this.changestreams.forEach(cs => {
      cs.exec({
        operationType: 'insert',
        fullDocument: document,
        ns: { db: this.db.name, coll: this.name },
        documentKey: { _id: document._id }
      })
    });
  }

  insert(document) {
    if (!document._id)
      document._id = ObjectId();

    document._pendingSince = Date.now();

    this._insert(document);
  }

}

class Cursor {

  constructor(collection, query) {
    this.collection = collection;
  }

  toArray() {
    return this.collection.documents;
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
