import React, { Component } from 'react';
import './App.css';

import gongo from "gongo-client";
import { useGongoLive, useGongoSub } from "gongo-react";

gongo.connect(process.env.REACT_APP_GONGO_SERVER);

window.gongo = gongo;
const todos = window.todos = gongo.collection('todos');

function submitTodo(e) {
  e.preventDefault();
  const form = e.target, input = form.children[0];
  gongo.collection('todos').insert({ title: input.value });
  input.value = '';
}

function TodoList() {
  // This is a reactive realtime live query (of local db) using React Hooks
  const todos = useGongoLive( () => gongo.collection('todos').find() );

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

class App extends Component {
  render() {
    return (
      <TodoList />
    );
  }
}

export default App;
