# Developing

## Setup

### Mongo

MongoDB changestreams require a ReplicaSet.  We suggest developing with Docker
that will launch 3 contained / dockerized mongodb instances.  To setup the
initial replica set:

(TODO)

```bash
$ docker-compose -f compose-files/setupMongo.yaml
```

### yarn links

```bash
for lib in client gongo-react ; do
  cd $lib
  yarn link
  cd ..
done

cd react-example
yarn link gongo-client gongo-react
```
