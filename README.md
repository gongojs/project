# gongo

Mongo Live Queries with Meteor convenience and Severless scalability

Temporary name.

## Features / TODO

* Use Mongo once, on the client, with offline support
* Realtime / live queries / reactive queries
* Great experience to use with React, etc.

## Example usage (react)

```js
import gongo from 'gongo';
import { useGongoLive, useGongoSub } from 'gongo/react';

function submitTodo(e) {
  const title = e.target.value;
  gongo.collection('todos').insert({ title });
}

function TodoList() {  
  // This is a reactive realtime live query (of local db) using React Hooks
  const todos = useGongoLive( gongo.collection('todos').find() );

  // Tell the server to keep us up to date.
  useGongoSub('todos');

  return (
    <div>
      <ol>
        {
          todos.map(todo => (
            <ul>{todo.title}</ul>
          ))
        }
      </ol>

      <form onSubmit={submitTodo}>
        name: <input type="text">
        <br />
        <input type="submit" />
      </form>
    </div>
  )
}
```

## Backstory

TODO

### How it differs from Meteor

Everyone loved the Meteor develop experience, but there were still issues.
What were the main pain points and how can we try solve them?

* Performance (server)
** serverless / lambda architecture, mongodb changestreams
** Don't keep entire client's contents in memory?

* Performance (client)
** Make reactivity opt-in / more explicit
** Batch incoming data

* Offline support
** Offline-first support via indexeddb.

## Development / Get involved

## Q&A

1.
1.1. Q: GraphQL does case X much better.
1.1. A: Use GraphQL for case X.

See [CONTRIBUTING.md](./CONTRIBUTING.md).
