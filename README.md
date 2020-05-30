# gongo

Reactive, realtime, offline queries with a 👌 developer experience.

**In active development, please give feedback GitHub issues**

Copyright (c) 2020 by Gadi Cohen.  Released under the [MIT license](./LICENSE.txt).

## Features / TODO

* Client-side mongo-like database makes CRUD operations a joy
* Works with any server-side database (currently MongoDB supported, FaunDB planned)
* Queries are reactive and realtime* (live), with optimistic updates for free
* Works offline, syncs on reconnect, persists with IndexedDB
* Great experience to use with React, etc.
* Highly scalable serverless implementation

Note*: Client-side queries are realtime, but depend on your subscription
transports.  Due to feedback, we have refocused attention to serverless
polling ("near-realtime") vs the original websocket server (true realtime).

For the v1 code, see [https://github.com/gongojs/old-v1](gongojs/old-v1).

## Project Status

This is the main project page.  Please open issues here for general comments,
vision, features.  For anything more specific, please try open an issue on
the specific component's page (client, react, server, mongodb, etc).

| Package           | Version | Build | Coverage
| ----------------- | ------- | ----- | --------
| [gongo-client](https://github.com/gongojs/gongo-client) | ![npm](https://img.shields.io/npm/v/gongo-client) | [![CircleCI](https://img.shields.io/circleci/build/github/gongojs/gongo-client)](https://circleci.com/gh/gongojs/gongo-client) |[![coverage](https://img.shields.io/codecov/c/github/gongojs/gongo-client)](https://codecov.io/gh/gongojs/gongo-client)
| [gongo-client-react](https://github.com/gongojs/gongo-client-react) | ![npm](https://img.shields.io/npm/v/gongo-client-react) | [![CircleCI](https://img.shields.io/circleci/build/github/gongojs/gongo-client-react)](https://circleci.com/gh/gongojs/gongo-client-react) |[![coverage](https://img.shields.io/codecov/c/github/gongojs/gongo-client-react)](https://codecov.io/gh/gongojs/gongo-client-react)
| [gongo-server](https://github.com/gongojs/gongo-server) | ![npm](https://img.shields.io/npm/v/gongo-server) | [![CircleCI](https://img.shields.io/circleci/build/github/gongojs/gongo-server)](https://circleci.com/gh/gongojs/gongo-server) | [![coverage](https://img.shields.io/codecov/c/github/gongojs/gongo-server)](https://codecov.io/gh/gongojs/gongo-server)
| [gongo-server-db-mongo](https://github.com/gongojs/gongo-server-db-mongo) | ![npm](https://img.shields.io/npm/v/gongo-server-db-mongo) | [![CircleCI](https://img.shields.io/circleci/build/github/gongojs/gongo-server-db-mongo)](https://circleci.com/gh/gongojs/gongo-server-db-mongo) |[![coverage](https://img.shields.io/codecov/c/github/gongojs/gongo-server-db-mongo)](https://codecov.io/gh/gongojs/gongo-server-db-mongo)
| [example](https://github.com/gongojs/example) | n/a | [![CircleCI](https://img.shields.io/circleci/build/github/gongojs/example)](https://circleci.com/gh/gongojs/example) |[![coverage](https://img.shields.io/codecov/c/github/gongojs/example)](https://codecov.io/gh/gongojs/example)

## Quick Start

Currently I use this internally for a few projects.  If you're impatient and
want to take it for a spin, open an issue :)

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
