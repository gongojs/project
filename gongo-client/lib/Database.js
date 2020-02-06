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

  /**
   * [getTime Returns the current UNIX epoc in milliseconds.  Always use this
   *   for timestmaps in the database, as it may differ from the browser's
   *   Date.now() if we synchronize time over the network.]
   * @return {[Int]} [The current UNIX epoc in milliseconds.]
   */
  getTime() {
    return Date.now();
  }

}

module.exports = { __esModule: true, default: Database };
