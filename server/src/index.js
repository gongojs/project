const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://mongo1,mongo2,mongo3?replicaSet=rs0';
const dbName = 'gongo';

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

const client = new MongoClient(url, { useNewUrlParser: true });
client.connect(function(err) {
  if (err)
    throw err;

  console.log("Connected successfully to server");

  const db = client.db(dbName);

  const gongo = new Gongo(db);

  gongo.publish('food', () => gongo.collection('food').find({}).live());

  //client.close();
});
