import React, { useState } from 'react';

function useGongoLive(cursor) {

  const [data, setData] = useState(cursor.toArray());

  const changeStream = cursor.watch();
  changeStream.on('change', change => {
    setData(cursor.toArray())
  });

  return data;

}

function useGongoSub() {
}

export { useGongoLive, useGongoSub };
