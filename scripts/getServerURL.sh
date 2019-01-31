#!/bin/sh
SERVER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' gongo_api_1)
echo ws://$SERVER_IP:3000/
