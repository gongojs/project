const MongoClient = require('mongodb').MongoClient;
const Gongo = require('./gongo');

const url = 'mongodb://mongo1,mongo2,mongo3?replicaSet=rs0';
const dbName = 'gongo';

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
