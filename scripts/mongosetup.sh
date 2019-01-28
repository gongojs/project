#!/bin/bash

echo mongosetup.sh, waiting 10s....

sleep 10

echo mongosetup.sh starting rs.initiatie()...

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
