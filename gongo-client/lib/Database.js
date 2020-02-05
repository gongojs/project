const Collection = require('./Collection').default;
const GongoIDB = require('./idb').default;

class Database {

  constructor(opts = {}) {

    this.name = opts.name || 'default';
    this.collections = new Map();

    this.idb = new GongoIDB(this);
  }

  collection(name) {
    if (!this.collections.has(name))
      this.collections.set(name, new Collection(this, name));

    return this.collections.get(name);
  }

}

module.exports = { __esModule: true, default: Database };
