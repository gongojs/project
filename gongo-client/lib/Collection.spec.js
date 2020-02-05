const Collection = require('./Collection').default;
const Cursor = require('./Cursor').default;

describe('Collection', () => {
  const FakeDb = {};

  it('can be created', () => {
    const col = new Collection(FakeDb, 'test');

    expect(col.db).toBe(FakeDb);
    expect(col).toBeInstanceOf(Collection);
  });

  it('find returns a Cursor', () => {
    const col = new Collection(FakeDb, 'test');
    const cursor = col.find({});
    expect(cursor).toBeInstanceOf(Cursor);
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

  describe('_funcs', () => {

    describe('_insert', () => {

      it('inserts a single record', () => {
        const col = new Collection(FakeDb, 'test');
        const doc = { _id: 'a' };
        col._insert(doc);

        const result = col.findOne({});
        expect(result).toBe(doc);
      });

    });

  });

})
