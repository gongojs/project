import React, { useState, useEffect } from 'react';

function useGongoLive(cursorFunc) {
  const [cursorOrResults, setData] = useState(cursorFunc);

  if (Array.isArray(cursorOrResults))
    return cursorOrResults;

  // This part will only get run once on mount

  const cursor = cursorOrResults;
  console.log('useGongoLive', cursor);

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
