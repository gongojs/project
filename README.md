# DO. NOT. USE. THIS.  Discuss in github issues.

# gongo

Reactive, realtime queries supporting offline and a 👌 developer experience.

Copyright (c) 2019 by Gadi Cohen.  Released under the [MIT license](./LICENSE.txt).

## Features / TODO

* Use Mongo once, on the client
* Reactive, realtime (live) queries
* Optimistic updates for free
* Persists offline (with IndexedDB)
* Great experience to use with React, etc.
* Highly scalable

## Quick Start

### Server

```js
const GongoServer = require('gongo-server').GongoServer;

const server = new GongoServer({
  mongoUrl: 'mongodb://mongo1,mongo2,mongo3/gongo?replicaSet=rs0'
});

server.listen(3000);

server.publish('todos', db => db.collection('todos').find());
```

### Client (react)

```js
import React from 'react';
import { gongo, useGongoLive, useGongoSub } from 'gongo-react';

const todos = window.todos = gongo.collection('todos');

function submitTodo(e) {
  e.preventDefault();
  const form = e.target, input = form.children[0];
  todos.insert({ title: input.value });
  input.value = '';
}

function TodoList() {
  // Reactive realtime live query (of local db / subscription) using React Hooks
  const todos = useGongoLive( () => todos.find() );

  // Tell the server to keep us up to date as long as component is rendered
  useGongoSub(gongo, 'todos');

  return (
    <div>
      <form onSubmit={submitTodo}>
        Title: <input type="text" />
        <button type="submit">Add</button>
      </form>

      <ol>
        {
          todos.map(todo => (
            <li key={todo._id}>{todo.title}</li>
          ))
        }
      </ol>
    </div>
  )
}

export default TodoList;
```

![demo](./docs/demo.gif)

## Deployment

More instructions coming as needed.

* Database
  * MongoDB
    * Note that Mongodb.com Atlas's
      [free forever tier](https://www.mongodb.com/cloud/atlas/pricing)
      includes a replSet and works great.  
  * Other databases could be supported in the future.

* Server
  * Host anywhere you can run node.
  * Zeit.co
    * Works great on Now 1.0;  Planned to work with Now 2.0 once WebSockets
      become available.

## Backstory

TODO

### How it differs from Meteor

To be clear, the concept and data flow is very similar to Meteor.  I spent
years working with Meteor and have a lot of love for the team and community.

If, for whatever reason, you choose not to use Meteor for a particular project,
this package aims to return the joyful developer experience to creating apps
while addressing some of the shortcomings.

More in [meteor.md](./docs/meteor.md).

## Credits

* Biggest credit is to the incredible METEOR TEAM who completely revolutionized
the developer experience for modern web apps.  The inspiration for this project
is to imitate the Meteor Development Experience outside of Meteor.

## Development / Get involved

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Q&A

1. **GraphQL does case X better.**  
Use GraphQL for case X.
