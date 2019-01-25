# architecture

## data structure

* `__mtime` attribute on docs
 * helps us keep offline collections up-to-date without resyncing entire collection
 * could let us use polling for cheaper / hobby projects with free mongo

* `__deleted` attribute on docs
 * can't really remove docs else we'd have to do expensive ops on each connect
   to see which ids are no longer there.
 * full doc must remain on server, to see if the deleted doc will match a pub query.

what about change in sub, we need to remove irrelevent docs?

## client

* mongo-like in-memory database backed by indexeddb
* live queries against this database
* updates
  * from local commands (will send update to server too)
  * from subscriptions on the server

questions:

* what should be async?
* toArray() with promise/callback, and toArraySync() ?

## server

* publications
  * can give it a real mongo cursor
