#!/bin/bash

sleep 10

mongo --host mongo1:27017 <<EOF
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

echo mongosetup.sh done.
