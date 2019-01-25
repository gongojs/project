import React, { useState, useEffect } from 'react';

function useGongoLive(cursorFunc) {
  if (typeof cursorFunc !== 'function')
    throw new Error("useGongoLive expects a function that returns a cursor, "
      + "not " + JSON.stringify(cursorFunc));

  const [cursorOrResults, setData] = useState(cursorFunc);

  // TODO, check if user supplied a func that returns an array?  run twice?
  if (Array.isArray(cursorOrResults))
    return cursorOrResults;

  // This part will only get run once on mount

  const cursor = cursorOrResults;
  console.log('useGongoLive', cursor);

  if (typeof cursor !== 'object' || !cursor.constructor || cursor.constructor.name !== 'Cursor')
    throw new Error("useGongoLive function should return a cursor, not "
      + "not " + JSON.stringify(cursor));

  const changeStream = cursor.watch();
  changeStream.on('change', change => {
    // TODO, debounce?
    //console.log('useGongoLive change', change);
    setData(cursor.toArray())
  });

  return cursor.toArray();
}

function useGongoSub(gongo, name, opts) {
  useEffect(() => {
    console.log('useGongoSub', name);
    gongo.subscribe(name, opts);
    return () => {
      console.log('TODO unmount');
    }
  }, []);
}

export { useGongoLive, useGongoSub };
