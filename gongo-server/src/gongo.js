class Gongo {

  constructor(db) {
    this.db = db;
    this.collections = {};
  }

  collection(name) {
    if (!this.collections[name])
      this.collections[name] = new Collection(this, name);

    return this.collections[name];
  }

  publish(name, callback) {
    callback();
  }

}

class Collection {

  constructor(gongo, name) {
    this.name = name;
    this.gongo = gongo;

    this._coll = gongo.db.collection(name);
    this._changeStream = this._coll.watch({ $match: {} }, { fullDocument: 'updateLookup' });
    this._changeStream.on('change', this.onChange.bind(this));

    this.watching = [];
  }

  find(query) {
    return new Cursor(this, query)
  }

  onChange(change) {
    console.log('change', change);
    this.watching.forEach(cursor => {
      // if cursor.query matches change.fullDocument or change.updateDescription
    });
  }

}

class Cursor {

  constructor(coll, query) {
    this.coll = coll;
    this.query = query;
  }

  watch() {
    this.coll.watching.push(this);
  }

  live() {
    this.watch();
  }

}

module.exports = { Gongo };
