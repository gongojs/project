# Development

## Setup

### MongoDB

MongoDB changestreams require a ReplicaSet.  We suggest using docker to launch
3 containerized MongoDB instances.

(TODO)

```bash
$ docker-compose -f compose-files/mongoSetup.yaml
```

### yarn link

```bash
for lib in gongo-client gongo-react ; do
  cd $lib
  yarn link
  cd ..
done

cd react-example
yarn link gongo-client gongo-react
```
