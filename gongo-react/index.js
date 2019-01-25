import React, { useState, useEffect } from 'react';

function useGongoLive(cursor) {

  const [data, setData] = useState(cursor.toArray());

  const changeStream = cursor.watch();
  changeStream.on('change', change => {
    setData(cursor.toArray())
  });

  return data;

}

function useGongoSub(gongo, name, opts) {
  useEffect(() => {
    gongo.subscribe(name, opts);
    return () => {
      console.log('TODO unmount');
    }
  }, []);
}

export { useGongoLive, useGongoSub };
