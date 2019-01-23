#!/bin/sh
MONGO1=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' gongo_mongo1_1)
MONGO2=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' gongo_mongo2_1)
MONGO3=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' gongo_mongo3_1)
echo $MONGO1 $MONGO2 $MONGO3
