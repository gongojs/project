#!/bin/sh
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' gongo_api_1
