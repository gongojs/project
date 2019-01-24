# DO. NOT. USE. THIS.  Discuss in github issues.

# gongo

Mongo Live Queries with Meteor convenience and Severless scalability

Temporary name.

## Features / TODO

* Use Mongo once, on the client, with offline support
* Realtime / live queries / reactive queries
* Great experience to use with React, etc.

## Example usage (react)

```js
import React from 'react';
import gongo from 'gongo-client';
import { useGongoLive, useGongoSub } from 'gongo-react';

const todos = window.todos = gongo.collection('todos');
todos.insert({ title: 'client' });

function submitTodo(e) {
  e.preventDefault();
  const form = e.target, input = form.children[0];
  todos.insert({ title: input.value });
  input.value = '';
}

function TodoList() {
  // Reactive realtime live query (of local db / subscription) using React Hooks
  const todos = useGongoLive( todos.find() );

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

![gifrecord_2019-01-23_143907](https://user-images.githubusercontent.com/381978/51607416-3aa64a80-1f1d-11e9-930c-6e24a5826b26.gif)

## Backstory

TODO

### How it differs from Meteor

Everyone loved the Meteor develop experience, but there were still issues.
What were the main pain points and how can we try solve them?

* Performance (server)
 * serverless / lambda architecture, mongodb changestreams
 * Don't keep entire client's contents in memory?

* Performance (client)
 * Make reactivity opt-in / more explicit
 * Batch incoming data

* Offline support
 * Offline-first support via indexeddb.

## Credits

* Biggest credit is to the incredible METEOR TEAM who completely revolutionized
the developer experience for modern web apps.  The inspiration for this project
is to imitate the Meteor Development Experience outside of Meteor.

## Development / Get involved

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Q&A

1. **GraphQL does case X better.**

  Use GraphQL for case X.
