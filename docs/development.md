# Development

## Initial Setup

### MongoDB

MongoDB ChangeStreams require a ReplicaSet.  We suggest using docker to launch
3 containerized MongoDB instances.

```bash
$ docker-compose -f docker-compose-mongosetup.yaml up --abort-on-container-exit
```

### yarn link

Use local development versions of the various packages in the app and other packages.

```bash
for lib in gongo-client gongo-react ; do
  cd $lib
  yarn link
  cd ..
done

cd react-example
yarn link gongo-client gongo-react
```

Don't worry about using `yarn link` for the server.  The `serer-example` uses the local `gongo-server` via docker.

## Usage

#### Server (with docker; recommended)

```bash
$ docker-compose up
```

### Client

```bash
$ cd react-example
$ yarn start
```

IP of the API server will be automatically passed in via environment variable.
