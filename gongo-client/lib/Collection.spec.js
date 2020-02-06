const Collection = require('./Collection').default;
const Cursor = require('./Cursor').default;
const randomId = require('./Collection').randomId;

describe('Other in Collection.js', () => {

  describe('randomId', () => {

    beforeAll(() => {
      if (!window.crypto)
        window.crypto = {
          getRandomValues(arr) {
            for (let i=0; i < arr.length; i++)
              arr[i] = Math.floor(Math.random() * 100000);
          },
          isFake: true
        }
    });

    afterAll(() => {
      if (window.crypto.isFake)
        delete window.crypto;
    });

    it('returns the right length', () => {
      expect(randomId(5).length).toBe(5);
    });

    it('returns seemingly random results', () => {
      expect(randomId(5)).not.toBe(randomId(5));
    });

  });

});

describe('Collection', () => {
  const FakeDb = {};

  it('can be created', () => {
    const col = new Collection(FakeDb, 'test');

    expect(col.db).toBe(FakeDb);
    expect(col).toBeInstanceOf(Collection);
  });

  describe('persistance', () => {

    it('persist()', () => {
      const db = { idb: { checkInit: jest.fn() }};
      const col = new Collection(db, 'test');

      col.persist();
      expect(col.db.persistedQueriesExist).toBe(true);
      expect(col.persists.length).toBe(1);
      const p1 = col.persists[0];
      expect(p1({ type: 'apple' })).toBe(true);
      expect(col.db.idb.checkInit).toHaveBeenCalled();
    });

    it('persist(query)', () => {
      const db = { idb: { checkInit: jest.fn() }};
      const col = new Collection(db, 'test');
      const query = { type: 'apple' };

      col.persist(query);
      expect(col.db.persistedQueriesExist).toBe(true);
      expect(col.persists.length).toBe(1);
      const p1 = col.persists[0];
      expect(p1({ type: 'apple' })).toBe(true);
      expect(p1({ type: 'banana' })).toBe(false);
      expect(col.db.idb.checkInit).toHaveBeenCalled();
    });

    it('shouldPersist(doc) matches', () => {
      const db = { idb: { checkInit() {} }};
      const col = new Collection(db, 'test');
      col.persist({ type: 'apple' });
      expect(col.shouldPersist({ type: 'apple' })).toBe(true);
      expect(col.shouldPersist({ type: 'banana' })).toBe(false);
    });

  });

  describe('CRUD', () => {

    // check modify on pendingInsert

    describe('_insert', () => {

      it('inserts a single record', () => {
        const col = new Collection(FakeDb, 'test');
        const doc = { _id: 'a' };
        col._insert(doc);

        const result = col.findOne({});
        expect(result).toBe(doc);
      });

    });

    describe('find', () => {

      it('returns a Cursor', () => {
        const col = new Collection(FakeDb, 'test');
        const cursor = col.find({});
        expect(cursor).toBeInstanceOf(Cursor);
      });

    });

    describe('findOne', () => {

      it('returns first match on find(query)', () => {
        const col = new Collection(FakeDb, 'test');
        const apple = { _id: 'apple' };
        const banana = { _id: 'banana' };
        col._insert(apple);
        col._insert(banana);
        expect(col.findOne({ _id: 'banana' })).toEqual(banana);
      });

      it('returns null on no match for find(query)', () => {
        const col = new Collection(FakeDb, 'test');
        const apple = { _id: 'apple' };
        col._insert(apple);
        expect(col.findOne({ _id: 'banana' })).toBe(null);
      });

      it('returns an exact record on find(strId)', () => {
        const col = new Collection(FakeDb, 'test');
        const apple = { _id: 'apple' };
        const banana = { _id: 'banana' };
        col._insert(apple);
        col._insert(banana);
        expect(col.findOne('apple')).toEqual(apple);
      });

      it('returns null on no record for find(strId)', () => {
        const col = new Collection(FakeDb, 'test');
        const apple = { _id: 'apple' };
        col._insert(apple);
        expect(col.findOne('banana')).toBe(null);
      });

    });

  });

})
