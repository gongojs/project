#!/bin/bash

MONGO1="mongo1:27017"

echo "Waiting for $MONGO1 to accept connections."

until mongo --host $MONGO1 --eval 'print("Successful connection")'
  do
    sleep 1
    echo -n .
  done

echo "mongosetup.sh starting rs.initiate()..."

mongo --host $MONGO1 <<EOF
   rs.initiate( {
        "_id": "rs0",
        "version": 1,
        "members": [
            {
                "_id": 0,
                "host": "mongo1:27017",
                "priority": 2
            },
            {
                "_id": 1,
                "host": "mongo2:27017",
                "priority": 0
            },
            {
                "_id": 2,
                "host": "mongo3:27017",
                "priority": 0
            }
        ]
    } )

    rs.conf()

    rs.status()
EOF

echo "Waiting 10s for settings to sync".
sleep 10

echo "mongosetup.sh done."
