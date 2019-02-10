const GongoServer = require('gongo-server').GongoServer;

const server = new GongoServer({
  mongoUrl: 'mongodb://mongo/gongo?replicaSet=rs0'
});

server.listen(3000);

server.publish('todos', (db,ats) => db.collection('todos').find({
  __updatedAt: { $gt: ats.todos }
}));

/*
setTimeout(() => {
  const db = server.db;
  console.log(db.collection('food').find());
},1000);
*/

/*
  const gongo = new Gongo(db);

  gongo.publish('food', () => gongo.collection('food').find({}).live());
*/
